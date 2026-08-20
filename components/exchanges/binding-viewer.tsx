"use client"

import * as React from "react"
import { Link2, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmptyState } from "@/components/shared/table-utils"
import { useToast } from "@/hooks/use-toast"
import type { Binding, Exchange } from "@/lib/rabbitmq/types"

interface BindingViewerProps {
  exchange: Exchange | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BindingViewer(props: BindingViewerProps) {
  // Mount fresh per open: bindings are fetched on mount, state resets on close
  if (!props.open || !props.exchange) return null
  return <BindingViewerInner {...props} exchange={props.exchange} />
}

function BindingViewerInner({
  exchange,
  open,
  onOpenChange,
}: BindingViewerProps & { exchange: Exchange }) {
  const { toast } = useToast()
  const [bindings, setBindings] = React.useState<Binding[] | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [destQueue, setDestQueue] = React.useState("")
  const [routingKey, setRoutingKey] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(
        `/api/rabbitmq/exchanges/${encodeURIComponent(exchange.vhost)}/${encodeURIComponent(exchange.name)}/bindings/source`,
      )
      setBindings(res.ok ? await res.json() : [])
    } catch {
      setBindings([])
    }
  }, [exchange])

  React.useEffect(() => {
    let ignore = false
    async function fetchBindings() {
      try {
        const res = await fetch(
          `/api/rabbitmq/exchanges/${encodeURIComponent(exchange.vhost)}/${encodeURIComponent(exchange.name)}/bindings/source`,
        )
        const data = res.ok ? await res.json() : []
        if (!ignore) setBindings(data)
      } catch {
        if (!ignore) setBindings([])
      }
    }
    fetchBindings()
    return () => {
      ignore = true
    }
  }, [exchange])

  const handleAddBinding = async () => {
    if (!exchange || !destQueue.trim()) return
    setBusy(true)
    try {
      const res = await fetch(
        `/api/rabbitmq/bindings/${encodeURIComponent(exchange.vhost)}/e/${encodeURIComponent(exchange.name)}/q/${encodeURIComponent(destQueue.trim())}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routing_key: routingKey, arguments: {} }),
        },
      )
      if (res.ok) {
        toast({
          title: "Binding created",
          description: `${exchange.name || "(default)"} → ${destQueue.trim()}`,
        })
        setAdding(false)
        setDestQueue("")
        setRoutingKey("")
        load()
      } else {
        const body = await res.json().catch(() => null)
        toast({
          variant: "destructive",
          title: "Failed to create binding",
          description: body?.details || body?.error,
        })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Bindings from{" "}
            <span className="font-mono text-sm">{exchange.name || "(default)"}</span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto mr-6 h-7 gap-1 text-xs"
              onClick={() => setAdding((v) => !v)}
            >
              <Plus className="h-3 w-3" /> Add binding
            </Button>
          </DialogTitle>
        </DialogHeader>

        {adding && (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
            <div className="min-w-[160px] flex-1 space-y-1">
              <Label className="text-xs">Destination queue</Label>
              <Input
                value={destQueue}
                onChange={(e) => setDestQueue(e.target.value)}
                placeholder="orders.created"
                className="h-8 font-mono text-xs"
                autoFocus
              />
            </div>
            <div className="min-w-[160px] flex-1 space-y-1">
              <Label className="text-xs">Routing key</Label>
              <Input
                value={routingKey}
                onChange={(e) => setRoutingKey(e.target.value)}
                placeholder="orders.#"
                className="h-8 font-mono text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddBinding()
                }}
              />
            </div>
            <Button size="sm" className="h-8" onClick={handleAddBinding} disabled={busy || !destQueue.trim()}>
              {busy ? "Binding…" : "Bind"}
            </Button>
          </div>
        )}

        <div className="max-h-[55vh] overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Destination</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Routing key</TableHead>
                <TableHead className="text-xs">Arguments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bindings === null ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : bindings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <EmptyState
                      icon={Link2}
                      title="No bindings from this exchange"
                      hint="Messages published here are dropped unless a binding routes them"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                bindings.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell className="py-2 text-[13px] font-medium">{b.destination}</TableCell>
                    <TableCell className="py-2 text-[13px] capitalize">{b.destination_type}</TableCell>
                    <TableCell className="py-2 font-mono text-xs">
                      {b.routing_key || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="py-2">
                      {b.arguments && Object.keys(b.arguments).length > 0 ? (
                        <pre className="max-h-16 overflow-auto rounded bg-muted/50 p-1.5 font-mono text-xs">
                          {JSON.stringify(b.arguments, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
