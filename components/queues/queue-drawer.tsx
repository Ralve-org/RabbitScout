"use client"

import * as React from "react"
import { Eraser, Eye, Send, Trash2, Users } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StreamingChart, type ColumnarData } from "@/components/dashboard/streaming-chart"
import { MessageViewer } from "./message-viewer"
import { PublishDialog } from "./publish-dialog"
import { DeleteQueueDialog } from "./delete-queue-dialog"
import { usePolling } from "@/hooks/use-polling"
import { useToast } from "@/hooks/use-toast"
import { formatBytes, cn } from "@/lib/utils"
import type { Queue, RateDetails } from "@/lib/rabbitmq/types"

interface QueueDrawerProps {
  queue: Queue | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged?: () => void
}

function sparkline(details?: RateDetails): { ts: number[]; vals: number[] } {
  const samples = details?.samples
  if (!samples || samples.length < 2) return { ts: [], vals: [] }
  const sorted = [...samples].sort((a, b) => a.timestamp - b.timestamp)
  const ts: number[] = []
  const vals: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const dt = (sorted[i].timestamp - sorted[i - 1].timestamp) / 1000
    if (dt <= 0) continue
    ts.push(sorted[i].timestamp / 1000)
    vals.push(Math.max(0, (sorted[i].sample - sorted[i - 1].sample) / dt))
  }
  return { ts, vals }
}

const SPARK_SERIES = [
  { label: "Publish", stroke: "hsl(24 95% 53%)", fill: "hsl(24 95% 53% / 0.08)" },
  { label: "Deliver", stroke: "hsl(142 66% 46%)", fill: "hsl(142 66% 46% / 0.06)" },
]

export function QueueDrawer({ queue, open, onOpenChange, onChanged }: QueueDrawerProps) {
  const { toast } = useToast()
  const [viewerOpen, setViewerOpen] = React.useState(false)
  const [publishOpen, setPublishOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [purgeOpen, setPurgeOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  // Detailed queue info with a 10-minute rate history for the sparkline
  const detailUrl =
    open && queue
      ? `/api/rabbitmq/queues/${encodeURIComponent(queue.vhost)}/${encodeURIComponent(queue.name)}?lengths_age=600&lengths_incr=5&msg_rates_age=600&msg_rates_incr=5`
      : null
  const { data: detail, refresh } = usePolling<Queue>(detailUrl)

  const q = detail ?? queue

  const chartData: ColumnarData = React.useMemo(() => {
    const pub = sparkline(detail?.message_stats?.publish_details)
    const del = sparkline(detail?.message_stats?.deliver_get_details)
    const deliverAligned =
      del.ts.length === pub.ts.length ? del.vals : pub.ts.map((_, i) => del.vals[i] ?? 0)
    return [pub.ts, pub.vals, deliverAligned]
  }, [detail])

  const handlePurge = async () => {
    if (!q) return
    setBusy(true)
    try {
      const res = await fetch(
        `/api/rabbitmq/queues/${encodeURIComponent(q.vhost)}/${encodeURIComponent(q.name)}/contents`,
        { method: "DELETE" },
      )
      if (res.ok) {
        toast({ title: "Queue purged", description: `All messages removed from ${q.name}` })
        refresh()
        onChanged?.()
      } else {
        const body = await res.json().catch(() => null)
        toast({
          variant: "destructive",
          title: "Failed to purge queue",
          description: body?.details || body?.error,
        })
      }
    } finally {
      setBusy(false)
      setPurgeOpen(false)
    }
  }

  if (!q) return null

  const queueType = q.type ?? (q.arguments?.["x-queue-type"] as string | undefined) ?? "classic"
  const args = Object.entries(q.arguments ?? {})

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 pr-8 font-mono text-sm">
              <span className="truncate">{q.name}</span>
              <Badge variant={queueType === "quorum" ? "info" : queueType === "stream" ? "warning" : "secondary"}>
                {queueType}
              </Badge>
              <span
                className={cn(
                  "ml-auto inline-flex items-center gap-1.5 font-sans text-xs font-normal text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    q.state === "running" ? "bg-success" : "bg-warning",
                  )}
                />
                {q.state}
              </span>
            </SheetTitle>
            <SheetDescription className="font-mono text-xs">
              vhost {q.vhost}
              {q.durable && " · durable"}
              {q.auto_delete && " · auto-delete"}
              {q.exclusive && " · exclusive"}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 p-5">
            {/* Counts */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Ready", value: q.messages_ready },
                { label: "Unacked", value: q.messages_unacknowledged },
                { label: "Total", value: q.messages },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border bg-card px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                    {s.label}
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-semibold tracking-tight tnum">
                    {s.value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setViewerOpen(true)}>
                <Eye className="h-3.5 w-3.5" /> Messages
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPublishOpen(true)}>
                <Send className="h-3.5 w-3.5" /> Publish
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-warning hover:text-warning"
                onClick={() => setPurgeOpen(true)}
              >
                <Eraser className="h-3.5 w-3.5" /> Purge
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>

            <Separator />

            {/* Rate history */}
            <div>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                Message rates — last 10 minutes
              </h4>
              <div className="h-[160px]">
                {chartData[0].length > 1 ? (
                  <StreamingChart data={chartData} series={SPARK_SERIES} yAxisFormat={(v) => `${Math.round(v)}/s`} />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                    Waiting for samples…
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-2 text-xs">
              <Row label="Consumers" value={String(q.consumers)} />
              <Row
                label="Consumer utilisation"
                value={
                  q.consumer_utilisation != null
                    ? `${Math.round(q.consumer_utilisation * 100)}%`
                    : "—"
                }
              />
              {q.memory != null && <Row label="Memory" value={formatBytes(q.memory)} />}
              {q.policy && <Row label="Policy" value={q.policy} />}
            </div>

            {/* Consumers */}
            {q.consumer_details && q.consumer_details.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> Consumers ({q.consumer_details.length})
                  </h4>
                  <div className="space-y-1.5">
                    {q.consumer_details.slice(0, 12).map((c) => (
                      <div
                        key={c.consumer_tag}
                        className="rounded-md border bg-card px-2.5 py-1.5 text-[11px]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-mono">{c.consumer_tag}</span>
                          {c.active === false ? (
                            <Badge variant="outline">inactive</Badge>
                          ) : (
                            <Badge variant="success">active</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-muted-foreground">
                          {c.channel_details?.connection_name} · prefetch {c.prefetch_count}
                          {c.ack_required ? "" : " · no-ack"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Arguments */}
            {args.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground">Arguments</h4>
                  <div className="rounded-md border bg-card p-2.5">
                    {args.map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-3 py-0.5 text-[11px]">
                        <span className="font-mono text-muted-foreground">{k}</span>
                        <span className="truncate font-mono">{JSON.stringify(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Purge confirmation */}
      <Dialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purge queue</DialogTitle>
            <DialogDescription>
              This permanently removes all ready messages from{" "}
              <span className="font-mono font-medium text-foreground">{q.name}</span>. Unacknowledged
              messages are not affected. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handlePurge} disabled={busy}>
              {busy ? "Purging…" : "Purge queue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MessageViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        queueName={q.name}
        vhost={q.vhost}
        readyCount={q.messages_ready}
        unackedCount={q.messages_unacknowledged}
      />

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        queueName={q.name}
        vhost={q.vhost}
      />

      <DeleteQueueDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        queueName={q.name}
        vhost={q.vhost}
        onDeleted={() => {
          onOpenChange(false)
          onChanged?.()
        }}
      />
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground/70">{label}</span>
      <span className="font-mono tnum">{value}</span>
    </div>
  )
}
