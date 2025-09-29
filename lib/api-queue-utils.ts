import amqp, {ChannelModel, ConfirmChannel, ConsumeMessage, Options} from 'amqplib';
import {wait} from "next/dist/lib/wait";
import {RABBITMQ_CONFIG} from "@/lib/config";
import {QueueMessage} from "@/lib/queue-message";
import Publish = Options.Publish;

export async function deleteRabbitMqMessage(queue: string, messageId: string): Promise<DeleteResponse> {
  return (await QueueManager.init().deleteMessage(queue, messageId));
}

export async function sendRabbitMqMessage(queue: string, messageId: string, message: QueueMessage): Promise<SendResponse> {

  if(messageId === undefined || messageId === null || messageId.length === 0) {
    throw new Error("Can't send message. Message id is required");
  }

  return (await QueueManager.init().sendMessage(queue, messageId, message));
}


interface DeleteResponse {
  deleted: boolean;
  message?: amqp.ConsumeMessage;
}

interface SendResponse {
  success: boolean;
}

class ConsumeError extends Error {
  constructor(message: string, readonly consumerTag: string) {
    super(message);
  }
}

export class QueueManager {
  private connection?: ChannelModel;
  private stopped: boolean = false;
  private readonly TIMEOUT: number;
  private processedMessageIds: string[] = [];

  constructor(private readonly options: Options.Connect) {
    this.TIMEOUT = parseInt(`${process.env.RABBITMQ_DELETE_MESSAGE_TIMEOUT}`, 10) || 1000;
  }

  public static init() {

    return new QueueManager({
      hostname: `${RABBITMQ_CONFIG.host}`,
      port: Number.parseInt(`${RABBITMQ_CONFIG.listenerPort}`),
      username: `${RABBITMQ_CONFIG.username}`,
      password: `${RABBITMQ_CONFIG.password}`,
      vhost: `${RABBITMQ_CONFIG.vhost}`,
      frameMax: 0
    });
  }

  public async sendMessage(queueName: string, messageId: string, message: QueueMessage): Promise<SendResponse> {
    const channel = await this.createChannel();

    const messageToPublishOptions = (): Publish => {
      return {
        messageId,
        userId: message.properties.user_id,
        expiration: message.properties.expiration,
        headers: message.properties.headers,
        timestamp: message.properties.timestamp ? Number(message.properties.timestamp) : undefined,
        contentType: message.properties.content_type,
        contentEncoding: message.properties.content_encoding,
        correlationId: message.properties.correlation_id,
        type: message.properties.type,
      }
    }

    const messageSent = channel.sendToQueue(queueName, Buffer.from(message.payload), messageToPublishOptions());

    await this.stopConsumerAndCloseChannel(channel)

    return {
      success: messageSent
    };
  }


  public async deleteMessage(queueName: string, messageId: string): Promise<DeleteResponse> {
    const channel = await this.createChannel();

    return new Promise<DeleteResponse>((resolve, reject) => {
      console.log(`Attempting to delete message '${messageId}' from queue '${queueName}.`);

      // Set up the consumer. The callback handles individual messages.
      channel.consume(queueName, async (message) => {
        await this.processConsumedMessage(channel, message, messageId, resolve, reject);
      }).catch((error) => {
        console.error(`Error deleting the message: '${messageId}' from queue '${queueName}':`, error);
        if (error instanceof ConsumeError) {
          this.stopConsumerAndCloseChannel(channel, error.consumerTag);
        } else {
          this.stopConsumerAndCloseChannel(channel);
        }
        reject(new Error(`Error deleting the message: '${messageId}' from queue '${queueName}'`, error));
      });
    });
  }

  private async processConsumedMessage(
      channel: amqp.ConfirmChannel,
      message: amqp.ConsumeMessage | null,
      targetMessageId: string,
      resolve: (value: DeleteResponse | PromiseLike<DeleteResponse>) => void,
      reject: (reason: Error) => void
  ): Promise<void> {
    if (this.stopped) {
      console.log(`[${targetMessageId}] Consumer stopped already, skipping message processing.`);
      return;
    }

    const currentMessageId = this.mapMessageId(message);
    if (message === null || currentMessageId === undefined) {
      this.handleInvalidMessage(message, reject, currentMessageId);
      return;
    }
    const loopDetected = await this.detectLoop(currentMessageId, targetMessageId, channel, message, resolve);
    if (loopDetected) {
      return;
    }

    this.processedMessageIds.push(currentMessageId); // Mark this message ID as processed.
    await this.handleMessage(currentMessageId, targetMessageId, channel, message, resolve, reject);
  }


  private async createChannel(): Promise<ConfirmChannel> {
    this.connection ??= await amqp.connect(this.options);
    return this.connection?.createConfirmChannel();
  }

  private async detectLoop(currentMessageId: string, targetMessageId: string, channel: ConfirmChannel, message: ConsumeMessage, resolve: (value: (DeleteResponse | PromiseLike<DeleteResponse>)) => void): Promise<boolean> {
    if (this.processedMessageIds.includes(currentMessageId)) {
      // We've seen this message ID before, indicating a loop. Stop to prevent infinite consumption.
      console.log(`[${targetMessageId}] Detected loop: Message ID '${currentMessageId}' already processed. Stopping consumer.`);
      await this.stopConsumerAndCloseChannel(channel, message.fields.consumerTag);
      resolve({deleted: false});
      return true;
    }
    return false;
  }

  private handleInvalidMessage(message: ConsumeMessage | null, reject: (reason: Error) => void, currentMessageId: string | undefined) {
    if (message === null) {
      reject(new Error('Message is not defined.'));
    } else if (currentMessageId === undefined) {
      const errorMessage = 'Message is not valid; All messages on the queue should have a messageId.';
      if (message?.fields?.consumerTag) {
        reject(new ConsumeError(errorMessage, message.fields.consumerTag));
      } else {
        reject(new Error(message ? errorMessage : 'Message is not defined or lacks consumer tag.'));
      }
    }
  }

  private async handleMessage(
      currentMessageId: string,
      targetMessageId: string,
      channel: ConfirmChannel,
      message: ConsumeMessage,
      resolve: (value: (DeleteResponse | PromiseLike<DeleteResponse>)) => void,
      reject: (reason: Error) => void) {
    try {
      if (currentMessageId === targetMessageId) {
        // Found the target message. Acknowledge it and stop the consumer.
        console.log(`[${targetMessageId}] Target message found: ID '${currentMessageId}'. Acknowledging and stopping consumer.`);
        channel.ack(message);
        channel.nack(message, true, true);
        await this.stopConsumerAndCloseChannel(channel); // Stop before resolving
        resolve({deleted: true, message});
      } else {
        // Not the target message, negatively acknowledge to requeue it.
        console.log(`[${targetMessageId}] Message ID '${currentMessageId}' does not match target. Nacking to requeue.`);
      }
    } catch (e) {
      reject(new ConsumeError(`Error processing message ID: ${e}`, message.fields.consumerTag));
    }
  }

  private async stopConsumerAndCloseChannel(channel: amqp.Channel, consumerTag?: string): Promise<void> {
    this.stopped = true;
    if (consumerTag) {
      await channel.cancel(consumerTag);
      await wait(this.TIMEOUT);
    }
    await channel.close();
    if (this.connection) {
      await this.connection.close();
    }
    this.processedMessageIds = [];
    this.stopped = false;
  }

  private mapMessageId(message: amqp.ConsumeMessage | null): string | undefined {
    const messageIdFromProperties = message?.properties?.messageId;
    if (messageIdFromProperties) {
      return messageIdFromProperties;
    }

    const messageContent = message?.content?.toString();
    if (messageContent) {
      const messageRepresentation = JSON.parse(messageContent);
      if (messageRepresentation.hasOwnProperty('message_id')) {
        return messageRepresentation.message_id;
      }
    }
  }
}