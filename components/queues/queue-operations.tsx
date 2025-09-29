"use client"

import {useState} from "react"
import {MessageViewer} from "@/components/queues/message-viewer"
import {Button} from "@/components/ui/button"
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {getMessages, purgeQueue} from "@/lib/utils"
import {MoreHorizontal, Trash} from "lucide-react"
import {useMaxNrOfMessagesStore} from "@/lib/store";
import {Queue} from "@/lib/queue";

interface QueueOperationsProps {
  queueList: Queue[]
  queue: {
    name: string
    vhost: string
    messages_ready: number
    messages_unacknowledged: number
  }
}

export function QueueOperations({queue, queueList}: Readonly<QueueOperationsProps>) {
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false)
  const [messageViewerOpen, setMessageViewerOpen] = useState(false)
  const [messages, setMessages] = useState<[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const {maxNrOfMessages} = useMaxNrOfMessagesStore()

  const onPurge = async () => {
    try {
      setIsLoading(true)
      await purgeQueue(queue.vhost, queue.name)
    } catch (error) {
      console.error("Failed to purge queue:", error)
    } finally {
      setIsLoading(false)
      setPurgeDialogOpen(false)
    }
  }

  const onViewMessages = async () => {
    await fetchMessages();
    setMessageViewerOpen(true);
  }

  const fetchMessages = async () => {
    try {
      setIsLoading(true)
      const fetchedMessages = await getMessages(queue.vhost, queue.name, maxNrOfMessages, 'ack_requeue_true')
      setMessages(fetchedMessages)
    } catch (error) {
      console.error("Failed to fetch messages:", error)
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
            <DropdownMenuItem onClick={onViewMessages}>
              View Messages
            </DropdownMenuItem>
            <DropdownMenuSeparator/>
            <DropdownMenuItem
                className="text-red-600"
                onClick={() => setPurgeDialogOpen(true)}
            >
              <Trash className="mr-2 h-4 w-4"/>
              Purge Queue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>
                This will remove all messages from the queue &#34;{queue.name}&#34;. This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPurgeDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                  variant="destructive"
                  onClick={onPurge}
                  disabled={isLoading}
              >
                {isLoading ? "Purging..." : "Purge Queue"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <MessageViewer
            messageRefresh={onViewMessages}
            messages={messages}
            open={messageViewerOpen}
            onOpenChange={setMessageViewerOpen}
            queueList={queueList}
            queueInfo={{
              messages_ready: queue.messages_ready,
              messages_unacknowledged: queue.messages_unacknowledged,
              queue: queue.name,
              vhost: queue.vhost
            }}
        />
      </>
  )
}
