"use client"

import * as React from "react"
import {
  Check,
  Copy,
  Download,
  Inbox,
  Loader2,
  RefreshCw,
} from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SortButton, useSort } from "@/components/shared/table-utils"
import { formatBytes, cn } from "@/lib/utils"
import type { QueueMessage } from "@/lib/rabbitmq/types"

interface MessageViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queueName: string
  vhost: string
  readyCount: number
  unackedCount: number
}

type IndexedMessage = QueueMessage & { _index: number }
type SortKey = "_index" | "routing_key" | "payload_bytes"

const PEEK_SIZES = [10, 25, 50, 100, 250] as const

function formatPayload(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function formatTimestamp(ts: string | number | undefined): string | null {
  if (ts == null || ts === "") return null
  const n = Number(ts)
  const date = isNaN(n) ? new Date(String(ts)) : new Date(n < 1e12 ? n * 1000 : n)
  if (isNaN(date.getTime())) return String(ts)
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

/**
 * Inspect queue messages. Peeks with ack_requeue_true so messages are
 * requeued after inspection — reads are non-destructive but do count
 * as delivery attempts (redelivered flag will be set on them).
 */
export function MessageViewer(props: MessageViewerProps) {
  // Mount fresh per open: messages are fetched on mount, state resets on close
  if (!props.open) return null
  return <MessageViewerInner {...props} />
}

function MessageViewerInner({
  open,
  onOpenChange,
  queueName,
  vhost,
  readyCount,
  unackedCount,
}: MessageViewerProps) {
  const [messages, setMessages] = React.useState<IndexedMessage[]>([])
  const [peek, setPeek] = React.useState<number>(50)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<IndexedMessage | null>(null)
  const [copied, setCopied] = React.useState(false)
  const { sortKey, sortDir, toggle, compare } = useSort<SortKey>("_index")

  // Loads messages; all state updates happen after the fetch resolves.
  const load = React.useCallback(
    async (count: number) => {
      try {
        const res = await fetch(
          `/api/rabbitmq/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queueName)}/get`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ count, ackmode: "ack_requeue_true", encoding: "auto" }),
          },
        )
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          setError(body?.details || body?.error || `Failed to fetch messages (${res.status})`)
          setMessages([])
          return
        }
        const data = await res.json()
        const list: IndexedMessage[] = (Array.isArray(data) ? data : []).map(
          (m: QueueMessage, i: number) => ({ ...m, _index: i + 1 }),
        )
        setMessages(list)
        setSelected(list.length > 0 ? list[0] : null)
        setError(null)
      } catch {
        setError("Network error — could not reach the server")
      } finally {
        setLoading(false)
      }
    },
    [vhost, queueName],
  )

  // Event-handler wrapper: shows the loading state, then loads
  const fetchMessages = React.useCallback(
    (count: number) => {
      setLoading(true)
      setError(null)
      setSelected(null)
      void load(count)
    },
    [load],
  )

  React.useEffect(() => {
    let ignore = false
    async function initialLoad() {
      try {
        const res = await fetch(
          `/api/rabbitmq/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queueName)}/get`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ count: 50, ackmode: "ack_requeue_true", encoding: "auto" }),
          },
        )
        if (ignore) return
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          if (!ignore) {
            setError(body?.details || body?.error || `Failed to fetch messages (${res.status})`)
            setLoading(false)
          }
          return
        }
        const data = await res.json()
        if (ignore) return
        const list: IndexedMessage[] = (Array.isArray(data) ? data : []).map(
          (m: QueueMessage, i: number) => ({ ...m, _index: i + 1 }),
        )
        setMessages(list)
        setSelected(list.length > 0 ? list[0] : null)
        setLoading(false)
      } catch {
        if (!ignore) {
          setError("Network error — could not reach the server")
          setLoading(false)
        }
      }
    }
    initialLoad()
    return () => {
      ignore = true
    }
  }, [vhost, queueName])

  const sorted = React.useMemo(
    () => [...messages].sort((a, b) => compare(a[sortKey], b[sortKey])),
    [messages, sortKey, compare],
  )

  const hasTimestamps = messages.some((m) => m.properties?.timestamp != null)

  const copyPayload = () => {
    if (!selected) return
    navigator.clipboard.writeText(selected.payload)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const downloadPayload = () => {
    if (!selected) return
    const blob = new Blob([selected.payload], {
      type: selected.properties?.content_type || "text/plain",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${queueName}-message-${selected._index}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const propEntries = selected
    ? Object.entries(selected.properties ?? {}).filter(([k, v]) => k !== "headers" && v != null && v !== "")
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-[92vw] flex-col gap-0 p-0 xl:max-w-6xl">
        <DialogHeader className="shrink-0 border-b px-5 pb-3 pt-5">
          <DialogTitle className="flex items-center gap-2 text-base">
            Messages in <span className="font-mono text-sm">{queueName}</span>
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> {readyCount.toLocaleString()} ready
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" /> {unackedCount.toLocaleString()} unacked
            </span>
            <span className="text-muted-foreground/60">
              Peeked messages are requeued (marked redelivered)
            </span>
            <span className="ml-auto flex items-center gap-2">
              <Select
                value={String(peek)}
                onValueChange={(v) => {
                  const n = Number(v)
                  setPeek(n)
                  fetchMessages(n)
                }}
              >
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PEEK_SIZES.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      Peek {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => fetchMessages(peek)}
                disabled={loading}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                <span className="sr-only">Refresh</span>
              </Button>
            </span>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
          {/* Message list */}
          <div className="flex min-h-0 flex-col overflow-hidden border-b md:border-b-0 md:border-r">
            <div className="min-h-0 flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <SortButton field="_index" sortKey={sortKey} sortDir={sortDir} onToggle={toggle}>
                        #
                      </SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton field="routing_key" sortKey={sortKey} sortDir={sortDir} onToggle={toggle}>
                        Routing key
                      </SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="payload_bytes" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className="justify-end">
                        Size
                      </SortButton>
                    </TableHead>
                    {hasTimestamps && <TableHead className="text-xs">Timestamp</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={hasTimestamps ? 4 : 3} className="h-40">
                        <div className="flex items-center justify-center text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : sorted.length > 0 ? (
                    sorted.map((msg) => (
                      <TableRow
                        key={msg._index}
                        className={cn("cursor-pointer", selected?._index === msg._index && "bg-muted")}
                        onClick={() => setSelected(msg)}
                      >
                        <TableCell className="py-2 font-mono text-xs text-muted-foreground tnum">
                          {msg._index}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate py-2 font-mono text-xs">
                          {msg.routing_key || "—"}
                          {msg.redelivered && (
                            <Badge variant="warning" className="ml-1.5">
                              redelivered
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono text-xs tnum">
                          {formatBytes(msg.payload_bytes)}
                        </TableCell>
                        {hasTimestamps && (
                          <TableCell className="py-2 font-mono text-[11px] text-muted-foreground">
                            {formatTimestamp(msg.properties?.timestamp) ?? "—"}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={hasTimestamps ? 4 : 3} className="h-40">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Inbox className="mb-2 h-8 w-8 opacity-40" />
                          <p className="text-xs">{error ?? "No messages available"}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Detail pane */}
          <div className="flex min-h-0 flex-col overflow-auto p-4">
            {selected ? (
              <div className="space-y-4">
                {/* Meta chips */}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="font-mono">
                    exchange: {selected.exchange || "(default)"}
                  </Badge>
                  <Badge variant="secondary" className="font-mono">
                    {formatBytes(selected.payload_bytes)}
                  </Badge>
                  {selected.properties?.content_type && (
                    <Badge variant="secondary" className="font-mono">
                      {selected.properties.content_type}
                    </Badge>
                  )}
                  {selected.properties?.delivery_mode === 2 && (
                    <Badge variant="info">persistent</Badge>
                  )}
                </div>

                {propEntries.length > 0 && (
                  <div>
                    <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">Properties</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-muted/50 p-3 text-xs">
                      {propEntries.map(([k, v]) => (
                        <div key={k} className="truncate">
                          <span className="text-muted-foreground">{k}:</span>{" "}
                          <span className="font-mono">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.properties?.headers &&
                  Object.keys(selected.properties.headers).length > 0 && (
                    <div>
                      <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">Headers</h4>
                      <pre className="max-h-32 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs">
                        {JSON.stringify(selected.properties.headers, null, 2)}
                      </pre>
                    </div>
                  )}

                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="mb-1.5 flex items-center justify-between">
                    <h4 className="text-xs font-medium text-muted-foreground">Payload</h4>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={copyPayload}>
                        {copied ? (
                          <>
                            <Check className="h-3 w-3 text-success" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={downloadPayload}>
                        <Download className="h-3 w-3" /> Download
                      </Button>
                    </div>
                  </div>
                  <pre className="min-h-[200px] flex-1 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs">
                    {formatPayload(selected.payload)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p className="text-xs">Select a message to view details</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
