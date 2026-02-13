"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Eye, Trash2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MessageViewer } from "./message-viewer"
import { PublishDialog } from "./publish-dialog"
import { useToast } from "@/hooks/use-toast"
import type { QueueMessage } from "@/lib/rabbitmq/types"

interface QueueActionsProps {
  queueName: string
  vhost: string
  messagesReady: number
  messagesUnacked: number
}

export function QueueActions({ queueName, vhost, messagesReady, messagesUnacked }: QueueActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [purgeOpen, setPurgeOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [messages, setMessages] = useState<QueueMessage[]>([])
  const [busy, setBusy] = useState(false)

  const handleViewMessages = async () => {
    setBusy(true)
    try {
      const res = await fetch(
        `/api/rabbitmq/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queueName)}/get`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: 50, ackmode: "ack_requeue_true", encoding: "auto" }),
        },
      )
      if (res.ok) {
        const data = await res.json()
        setMessages(Array.isArray(data) ? data : [])
        setViewerOpen(true)
      } else {
        toast({ variant: "destructive", title: "Failed to fetch messages" })
      }
    } finally {
      setBusy(false)
    }
  }

  const handlePurge = async () => {
    setBusy(true)
    try {
      const res = await fetch(
        `/api/rabbitmq/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queueName)}/contents`,
        { method: "DELETE" },
      )
      if (res.ok) {
        toast({ title: "Queue purged", description: `All messages removed from ${queueName}` })
      } else {
        toast({ variant: "destructive", title: "Failed to purge queue" })
      }
      router.refresh()
    } finally {
      setBusy(false)
      setPurgeOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleViewMessages} disabled={busy}>
            <Eye className="mr-2 h-4 w-4" /> View Messages
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPublishOpen(true)}>
            <Send className="mr-2 h-4 w-4" /> Publish Message
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPurgeOpen(true)} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Purge Queue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Purge confirmation */}
      <Dialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purge Queue</DialogTitle>
            <DialogDescription>
              This will permanently remove all messages from <span className="font-mono font-medium">{queueName}</span>. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handlePurge} disabled={busy}>
              {busy ? "Purging…" : "Purge Queue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish dialog */}
      <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} queueName={queueName} vhost={vhost} />

      {/* Message viewer */}
      <MessageViewer messages={messages} open={viewerOpen} onOpenChange={setViewerOpen} readyCount={messagesReady} unackedCount={messagesUnacked} />
    </>
  )
}
