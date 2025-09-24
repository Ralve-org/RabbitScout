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
import {deleteMessage} from "@/lib/utils"
import {MoreHorizontal, Trash} from "lucide-react"

interface MessageOperationsProps {
  messageRefresh: () => void;
  message: {
    vhost: string
    queue: string

    payload: string
    payload_bytes: number
    redelivered: boolean
    exchange: string
    routing_key: string
    message_count: number
    properties: {
      headers: Record<string, never>
      delivery_mode: number
      timestamp?: string
      content_type?: string
      content_encoding?: string
      correlation_id?: string
      reply_to?: string
      expiration?: string
      message_id?: string
      type?: string
      user_id?: string
      app_id?: string
      cluster_id?: string
      messageId?: string
    }
  }
}

type DeleteResponse = {
  deleted: boolean;
  message: string,
}

export function MessageOperations({messageRefresh, message}: Readonly<MessageOperationsProps>) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteResult, setDeleteResult] = useState<DeleteResponse>();
  const [messageId, setMessageId] = useState('');

  useEffect(() => {
    const mapMessageId = (): string => {
      const messageIdFromProperties = message?.properties?.messageId;
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
              }
              }
              >
                Cancel
              </Button>
              <Button
                  variant="destructive"
                  onClick={onDelete}
                  disabled={isLoading}
              >
                {isLoading ? "Deleting..." : "Delete Message"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
  )
}
