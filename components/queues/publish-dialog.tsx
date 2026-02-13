"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Check, AlertTriangle } from "lucide-react"

interface PublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queueName: string
  vhost: string
}

export function PublishDialog({ open, onOpenChange, queueName, vhost }: PublishDialogProps) {
  const [payload, setPayload] = useState("")
  const [exchange, setExchange] = useState("")
  const [routingKey, setRoutingKey] = useState(queueName)
  const [encoding, setEncoding] = useState<"string" | "base64">("string")
  const [contentType, setContentType] = useState("application/json")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ routed: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePublish = async () => {
    setBusy(true)
    setResult(null)
    setError(null)

    try {
      // POST to a dedicated publish handler that constructs the
      // RabbitMQ URL server-side, avoiding browser URL normalization
      // issues with the default exchange's empty name.
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vhost,
          exchange,
          routing_key: routingKey,
          payload,
          payload_encoding: encoding,
          properties: { content_type: contentType },
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }))
        setError(data.error || "Failed to publish message")
        return
      }

      const data = await res.json()
      setResult(data)
    } catch {
      setError("Network error — could not reach the server")
    } finally {
      setBusy(false)
    }
  }

  const reset = () => { setResult(null); setError(null) }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            Publish to <span className="font-mono">{queueName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Exchange</Label>
              <Input
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder="(default exchange)"
              />
              <p className="text-[10px] text-muted-foreground">
                Leave empty for the default exchange
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Routing Key</Label>
              <Input
                value={routingKey}
                onChange={(e) => setRoutingKey(e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder={queueName}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Content Type</Label>
              <Input
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Encoding</Label>
              <Select value={encoding} onValueChange={(v) => setEncoding(v as "string" | "base64")}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">UTF-8 String</SelectItem>
                  <SelectItem value="base64">Base64</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Payload</Label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder='{"key": "value"}'
            />
          </div>

          {result && (
            <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              <Check className="h-4 w-4" />
              Message published{result.routed ? " and routed" : " (not routed — check exchange bindings)"}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePublish} disabled={busy || !payload.trim()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
