"use client"

import * as React from "react"
import { Loader2, TriangleAlert } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface DeleteQueueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queueName: string
  vhost: string
  onDeleted?: () => void
}

/** Destructive delete with type-the-name confirmation. */
export function DeleteQueueDialog(props: DeleteQueueDialogProps) {
  // Mount fresh per open so the confirmation field always starts empty
  if (!props.open) return null
  return <DeleteQueueForm {...props} />
}

function DeleteQueueForm({
  open,
  onOpenChange,
  queueName,
  vhost,
  onDeleted,
}: DeleteQueueDialogProps) {
  const { toast } = useToast()
  const [confirm, setConfirm] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const handleDelete = async () => {
    setBusy(true)
    try {
      const res = await fetch(
        `/api/rabbitmq/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queueName)}`,
        { method: "DELETE" },
      )
      if (res.ok) {
        toast({ title: "Queue deleted", description: queueName })
        onOpenChange(false)
        onDeleted?.()
      } else {
        const body = await res.json().catch(() => null)
        toast({
          variant: "destructive",
          title: "Failed to delete queue",
          description: body?.details || body?.error,
        })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-4 w-4" /> Delete queue
          </DialogTitle>
          <DialogDescription>
            This permanently deletes{" "}
            <span className="font-mono font-medium text-foreground">{queueName}</span> and all of
            its messages. Consumers will be disconnected. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-name" className="text-xs text-muted-foreground">
            Type <span className="font-mono text-foreground">{queueName}</span> to confirm
          </Label>
          <Input
            id="confirm-name"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-9 font-mono text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && confirm === queueName) handleDelete()
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={busy || confirm !== queueName}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
