"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { usePreferences } from "@/lib/stores/preferences"

interface CreateExchangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

const EXCHANGE_TYPES = ["direct", "topic", "fanout", "headers"] as const
type ExchangeType = (typeof EXCHANGE_TYPES)[number]

export function CreateExchangeDialog(props: CreateExchangeDialogProps) {
  // Mount fresh per open so every field starts from a clean slate
  if (!props.open) return null
  return <CreateExchangeForm {...props} />
}

function CreateExchangeForm({ open, onOpenChange, onCreated }: CreateExchangeDialogProps) {
  const { toast } = useToast()
  const vhostPref = usePreferences((s) => s.vhost)
  const [name, setName] = React.useState("")
  const [vhost, setVhost] = React.useState(vhostPref ?? "/")
  const [type, setType] = React.useState<ExchangeType>("topic")
  const [durable, setDurable] = React.useState(true)
  const [autoDelete, setAutoDelete] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Exchange name is required")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/rabbitmq/exchanges/${encodeURIComponent(vhost)}/${encodeURIComponent(trimmed)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, durable, auto_delete: autoDelete, internal: false, arguments: {} }),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.details || data?.error || `Failed (${res.status})`)
        return
      }
      toast({ title: "Exchange created", description: `${trimmed} (${type})` })
      onOpenChange(false)
      setName("")
      onCreated?.()
    } catch {
      setError("Network error — could not reach the server")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New exchange</DialogTitle>
          <DialogDescription>
            Declare an exchange. Type and durability cannot be changed later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="exchange-name" className="text-xs">
              Name
            </Label>
            <Input
              id="exchange-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="orders"
              className="h-9 font-mono text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate()
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Virtual host</Label>
              <Input
                value={vhost}
                onChange={(e) => setVhost(e.target.value)}
                className="h-9 font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ExchangeType)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXCHANGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm">Durable</p>
              <p className="text-[11px] text-muted-foreground">Survives broker restarts</p>
            </div>
            <Switch checked={durable} onCheckedChange={setDurable} />
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm">Auto-delete</p>
              <p className="text-[11px] text-muted-foreground">
                Deleted when the last binding is removed
              </p>
            </div>
            <Switch checked={autoDelete} onCheckedChange={setAutoDelete} />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={busy || !name.trim()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create exchange
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
