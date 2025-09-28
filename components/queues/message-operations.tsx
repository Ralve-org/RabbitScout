"use client"

import {useEffect, useState} from "react"
import {Button} from "@/components/ui/button"
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {deleteMessage, sendMessage} from "@/lib/utils"
import {MoreHorizontal, Trash} from "lucide-react"
import {QueueMessage} from "@/lib/QueueMessage";
import {Queue} from "@/lib/Queue";

interface MessageOperationsProps {
  queueList: Queue[]
  messageRefresh: () => void;
  message: {
    vhost: string
    queue: string
  } & QueueMessage
}

type DeleteResponse = {
  deleted: boolean;
  message: string,
}

type MessageSentResponse = {
  sent: boolean;
  message: string;
}

export function MessageOperations({messageRefresh, message, queueList}: Readonly<MessageOperationsProps>) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copyToQueueDialogOpen, setCopyToQueueDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteResult, setDeleteResult] = useState<DeleteResponse>();
  const [copyToQueueResult, setCopyToQueueResult] = useState<MessageSentResponse>();
  const [messageId, setMessageId] = useState('');
  const [selectedQueue, setSelectedQueue] = useState('');

  useEffect(() => {
    const mapMessageId = (): string => {
      const messageIdFromProperties = message?.properties?.message_id;
      if (messageIdFromProperties) {
        return messageIdFromProperties;
      }

      const messageContent = message?.payload;
      if (messageContent) {
        const messageRepresentation = JSON.parse(messageContent);
        if (messageRepresentation.hasOwnProperty('message_id')) {
          return messageRepresentation.message_id;
        }
      }
      return '';
    }
    setMessageId(mapMessageId());
  }, [message])

  const onDelete = async () => {
    try {
      setIsLoading(true)
      const deleteResult = await deleteMessage(message.vhost, message.queue, messageId) as DeleteResponse;
      setDeleteResult(deleteResult);
      if (deleteResult.deleted) {
        setDeleteResult(undefined);
        setMessageId('');
        setDeleteDialogOpen(false);
        messageRefresh();
      }
    } catch (error) {
      console.error("Failed to delete message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const onCopy = async (destinationQueue: string) => {
    try {
      setIsLoading(true)
      const sentResult = await sendMessage(message.vhost, destinationQueue, messageId, message) as MessageSentResponse;
      setCopyToQueueResult(sentResult);
      if (sentResult.sent) {
        setCopyToQueueResult(undefined);
        setMessageId('');
        setCopyToQueueDialogOpen(false);
        messageRefresh();
      }
    } catch (error) {
      console.error("Failed to copy message to queue:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4"/>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSeparator/>
            <DropdownMenuItem
                className="text-red-600"
                onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash className="mr-2 h-4 w-4"/>
              Delete Message
            </DropdownMenuItem>
            <DropdownMenuSeparator/>
            <DropdownMenuItem
                onClick={() => setCopyToQueueDialogOpen(true)}
            >
              <Trash className="mr-2 h-4 w-4"/>
              Copy Message
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            {messageId !== '' ?
                <DialogHeader>
                  <DialogTitle>Are you sure?</DialogTitle><DialogDescription>
                  This will delete this message from the queue &#34;{messageId}&#34;. This
                  action cannot be undone.
                </DialogDescription>
                </DialogHeader>
                :
                <DialogHeader>
                  <DialogTitle>Can&#39;t delete message. Message has no MessageId as a property or message_id
                    in
                    the message.</DialogTitle>
                </DialogHeader>
            }

            {deleteResult && !deleteResult.deleted && (
                <DialogHeader>
                  <DialogTitle>Message not deleted</DialogTitle>
                  <DialogDescription>
                    {JSON.stringify(deleteResult)}
                  </DialogDescription>
                </DialogHeader>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteResult(undefined);
                setMessageId('');
              }}
              >
                Cancel
              </Button>
              <Button
                  variant="destructive"
                  onClick={onDelete}
                  disabled={isLoading || !messageId}
              >
                {isLoading ? "Deleting..." : "Delete Message"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        <Dialog open={copyToQueueDialogOpen} onOpenChange={setCopyToQueueDialogOpen}>
          <DialogContent>
            {messageId !== '' ?
                <DialogHeader>
                  <DialogTitle>Copy message to queue?</DialogTitle><DialogDescription>
                  Select destination queue
                  <Select onValueChange={setSelectedQueue} value={selectedQueue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a queue"/>
                    </SelectTrigger>
                    <SelectContent>
                      {queueList.map((queue) => (
                          <SelectItem key={queue.name} value={queue.name}>
                            {queue.name}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DialogDescription>
                </DialogHeader>
                :
                <DialogHeader>
                  <DialogTitle>Can&#39;t copy message. Message has no MessageId as a property or message_id
                    in
                    the message.</DialogTitle>
                </DialogHeader>
            }

            {copyToQueueResult && !copyToQueueResult.sent && (
                <DialogHeader>
                  <DialogTitle>Message not sent</DialogTitle>
                  <DialogDescription>
                    {JSON.stringify(copyToQueueResult)}
                  </DialogDescription>
                </DialogHeader>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setCopyToQueueDialogOpen(false);
                setCopyToQueueResult(undefined);
                setMessageId('');
              }}
              >
                Cancel
              </Button>
              <Button
                  variant="destructive"
                  onClick={() => onCopy(selectedQueue)}
                  disabled={isLoading || !selectedQueue}
              >
                {isLoading ? "Copy to queue..." : "Copy message to queue"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
  )
}
