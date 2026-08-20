"use client"

import * as React from "react"
import { AlertTriangle, Check, Loader2, Plus, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Prefill routing key with this queue name (publish via default exchange). */
  queueName?: string
  vhost: string
}

interface HeaderRow {
  key: string
  value: string
}

export function PublishDialog(props: PublishDialogProps) {
  // Mount fresh per open so the form starts clean each time
  if (!props.open) return null
  return <PublishForm {...props} />
}

function PublishForm({ open, onOpenChange, queueName, vhost }: PublishDialogProps) {
  const [payload, setPayload] = React.useState("")
  const [exchange, setExchange] = React.useState("")
  const [routingKey, setRoutingKey] = React.useState(queueName ?? "")
  const [encoding, setEncoding] = React.useState<"string" | "base64">("string")
  const [contentType, setContentType] = React.useState("application/json")
  const [deliveryMode, setDeliveryMode] = React.useState<"1" | "2">("2")
  const [headers, setHeaders] = React.useState<HeaderRow[]>([])
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState<{ routed: boolean } | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const handlePublish = async () => {
    setBusy(true)
    setResult(null)
    setError(null)

    const headerObj: Record<string, string> = {}
    for (const h of headers) {
      if (h.key.trim()) headerObj[h.key.trim()] = h.value
    }

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vhost,
          exchange,
          routing_key: routingKey,
          payload,
          payload_encoding: encoding,
          properties: {
            content_type: contentType || undefined,
            delivery_mode: Number(deliveryMode),
            ...(Object.keys(headerObj).length > 0 ? { headers: headerObj } : {}),
          },
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

  const reset = () => {
    setResult(null)
    setError(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            Publish message
            {queueName && (
              <span className="text-muted-foreground">
                {" "}
                → <span className="font-mono text-sm">{queueName}</span>
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Exchange</Label>
              <Input
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                className="h-8 font-mono text-sm"
                placeholder="(default exchange)"
              />
              <p className="text-[10px] text-muted-foreground">
                Empty publishes directly to the routing-key queue
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Routing key</Label>
              <Input
                value={routingKey}
                onChange={(e) => setRoutingKey(e.target.value)}
                className="h-8 font-mono text-sm"
                placeholder={queueName}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Content type</Label>
              <Input
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="h-8 font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Encoding</Label>
              <Select value={encoding} onValueChange={(v) => setEncoding(v as "string" | "base64")}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">UTF-8 string</SelectItem>
                  <SelectItem value="base64">Base64</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Delivery</Label>
              <Select value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as "1" | "2")}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">Persistent</SelectItem>
                  <SelectItem value="1">Transient</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Headers editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Headers</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-xs"
                onClick={() => setHeaders((h) => [...h, { key: "", value: "" }])}
              >
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            {headers.length > 0 && (
              <div className="space-y-1.5">
                {headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input
                      value={h.key}
                      onChange={(e) =>
                        setHeaders((rows) =>
                          rows.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)),
                        )
                      }
                      placeholder="key"
                      className="h-7 flex-1 font-mono text-xs"
                    />
                    <Input
                      value={h.value}
                      onChange={(e) =>
                        setHeaders((rows) =>
                          rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)),
                        )
                      }
                      placeholder="value"
                      className="h-7 flex-1 font-mono text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground"
                      onClick={() => setHeaders((rows) => rows.filter((_, j) => j !== i))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Payload</Label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="min-h-[120px] w-full resize-y rounded-md border bg-transparent px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder='{"key": "value"}'
            />
          </div>

          {result && (
            <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              <Check className="h-4 w-4" />
              Message published
              {result.routed ? " and routed" : " (not routed — check exchange bindings)"}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePublish} disabled={busy || !payload.trim() || !routingKey.trim()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
