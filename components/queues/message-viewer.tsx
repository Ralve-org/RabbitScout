"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  InboxIcon, Copy, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUp, ArrowDown, ArrowUpDown, Loader2,
} from "lucide-react"
import type { QueueMessage } from "@/lib/rabbitmq/types"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 50

type SortKey = "index" | "routing_key" | "payload_bytes" | "timestamp"
type SortDir = "asc" | "desc"

interface MessageViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queueName: string
  vhost: string
  readyCount: number
  unackedCount: number
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-30" />
  return dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function formatPayload(raw: string): string {
  try { return JSON.stringify(JSON.parse(raw), null, 2) } catch { return raw }
}

function formatTimestamp(ts: string | undefined): string | null {
  if (!ts) return null
  // AMQP timestamp can be a Unix epoch (number as string) or ISO string
  const n = Number(ts)
  const date = isNaN(n) ? new Date(ts) : new Date(n < 1e12 ? n * 1000 : n)
  if (isNaN(date.getTime())) return ts
  return date.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

export function MessageViewer({
  open,
  onOpenChange,
  queueName,
  vhost,
  readyCount,
  unackedCount,
}: MessageViewerProps) {
  // pages is a map: pageIndex (0-based) → messages for that page
  const [pages, setPages] = useState<Map<number, QueueMessage[]>>(new Map())
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exhausted, setExhausted] = useState(false)
  const [selected, setSelected] = useState<QueueMessage | null>(null)
  const [copied, setCopied] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("index")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const totalMessages = readyCount + unackedCount

  const fetchPage = useCallback(async (pageIndex: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/rabbitmq/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queueName)}/get`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: PAGE_SIZE, ackmode: "ack_requeue_true", encoding: "auto" }),
        },
      )
      if (!res.ok) return

      const batch: QueueMessage[] = await res.json()
      if (!Array.isArray(batch) || batch.length === 0) {
        setExhausted(true)
        return
      }

      // Stamp with global index based on page
      const stamped = batch.map((msg, i) => ({ ...msg, _index: pageIndex * PAGE_SIZE + i }))

      setPages((prev) => new Map(prev).set(pageIndex, stamped))

      if (batch.length < PAGE_SIZE) setExhausted(true)
    } finally {
      setLoading(false)
    }
  }, [vhost, queueName])

  // Reset and load first page when dialog opens
  useEffect(() => {
    if (!open) return
    setPages(new Map())
    setCurrentPage(0)
    setExhausted(false)
    setSelected(null)
    fetchPage(0)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const goToPage = async (pageIndex: number) => {
    setSelected(null)
    setCurrentPage(pageIndex)
    if (!pages.has(pageIndex)) {
      await fetchPage(pageIndex)
    }
  }

  const messages = pages.get(currentPage) ?? []

  const hasTimestamps = useMemo(() => messages.some((m) => !!m.properties.timestamp), [messages])

  const sorted = useMemo(() => {
    return [...messages].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1
      if (sortKey === "index") return mul * ((a._index ?? 0) - (b._index ?? 0))
      if (sortKey === "routing_key") return mul * (a.routing_key || "").localeCompare(b.routing_key || "")
      if (sortKey === "timestamp") {
        const ta = Number(a.properties.timestamp ?? 0)
        const tb = Number(b.properties.timestamp ?? 0)
        return mul * (ta - tb)
      }
      return mul * (a.payload_bytes - b.payload_bytes)
    })
  }, [messages, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const copyPayload = () => {
    if (!selected) return
    navigator.clipboard.writeText(selected.payload)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const highestLoadedPage = Math.max(0, ...Array.from(pages.keys()))
  const isLastKnown = currentPage === highestLoadedPage && exhausted
  // Estimated last page from totalMessages (0-based)
  const estimatedLastPage = totalMessages > 0 ? Math.ceil(totalMessages / PAGE_SIZE) - 1 : 0

  const pageStart = currentPage * PAGE_SIZE + 1
  const pageEnd = currentPage * PAGE_SIZE + messages.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] h-[88vh] flex flex-col p-0 gap-0">

        {/* Header */}
        <DialogHeader className="px-5 pr-12 py-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold truncate">{queueName}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalMessages === 0
                  ? "Queue is empty"
                  : `~${totalMessages.toLocaleString()} messages · 50 per page`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {readyCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                  {readyCount.toLocaleString()} ready
                </span>
              )}
              {unackedCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                  {unackedCount.toLocaleString()} unacked
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="grid flex-1 grid-cols-[1fr_1.1fr] overflow-hidden min-h-0">

          {/* Left: message list */}
          <div className="flex flex-col border-r overflow-hidden">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-14 pl-4">
                      <button onClick={() => toggleSort("index")} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                        # <SortIcon active={sortKey === "index"} dir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => toggleSort("routing_key")} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Routing Key <SortIcon active={sortKey === "routing_key"} dir={sortDir} />
                      </button>
                    </TableHead>
                    {hasTimestamps && (
                      <TableHead className="w-36">
                        <button onClick={() => toggleSort("timestamp")} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                          Timestamp <SortIcon active={sortKey === "timestamp"} dir={sortDir} />
                        </button>
                      </TableHead>
                    )}
                    <TableHead className="w-20 text-right pr-4">
                      <button onClick={() => toggleSort("payload_bytes")} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto">
                        Size <SortIcon active={sortKey === "payload_bytes"} dir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && messages.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={4} className="h-48">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs">Loading messages…</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : sorted.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={4} className="h-48">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <InboxIcon className="h-7 w-7 opacity-25" />
                          <p className="text-xs">No messages</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : sorted.map((msg, i) => (
                    <TableRow
                      key={i}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selected === msg ? "bg-muted" : "hover:bg-muted/50",
                      )}
                      onClick={() => setSelected(msg)}
                    >
                      <TableCell className="pl-4 font-mono text-[11px] text-muted-foreground tabular-nums">
                        {(msg._index ?? 0) + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[160px] truncate">
                        {msg.routing_key || <span className="text-muted-foreground italic">(none)</span>}
                      </TableCell>
                      {hasTimestamps && (
                        <TableCell className="text-[11px] text-muted-foreground tabular-nums">
                          {formatTimestamp(msg.properties.timestamp) ?? <span className="opacity-30">—</span>}
                        </TableCell>
                      )}
                      <TableCell className="text-right pr-4 font-mono text-[11px] text-muted-foreground tabular-nums">
                        {formatBytes(msg.payload_bytes)}
                      </TableCell>
                      <TableCell className="pr-2">
                        {msg.redelivered && (
                          <span title="Redelivered" className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination bar */}
            <div className="flex items-center justify-between border-t px-3 py-2 shrink-0 bg-background">
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {messages.length > 0 ? `${pageStart}–${pageEnd}` : "—"}
                {loading && <Loader2 className="h-3 w-3 animate-spin inline ml-1.5 opacity-50" />}
              </span>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => goToPage(0)}
                  disabled={currentPage === 0 || loading}
                  title="First page"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 0 || loading}
                  title="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[11px] text-muted-foreground tabular-nums px-1.5 min-w-[2rem] text-center">
                  {currentPage + 1}
                </span>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={isLastKnown || loading}
                  title="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => goToPage(estimatedLastPage)}
                  disabled={isLastKnown || loading}
                  title="Last page"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right: detail pane */}
          <div className="flex flex-col overflow-auto p-5">
            {selected ? (
              <div className="space-y-5">

                {/* Meta row */}
                <div className="flex flex-wrap gap-2">
                  {selected.exchange && (
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                      exchange: {selected.exchange}
                    </span>
                  )}
                  {selected.routing_key && (
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                      key: {selected.routing_key}
                    </span>
                  )}
                  {selected.redelivered && (
                    <span className="inline-flex items-center rounded-md border border-amber-500/30 px-2 py-0.5 text-[10px] text-amber-500">
                      redelivered
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono text-muted-foreground ml-auto">
                    {formatBytes(selected.payload_bytes)}
                  </span>
                </div>

                {/* Properties */}
                {Object.entries(selected.properties).filter(([k, v]) => k !== "headers" && v != null && v !== "").length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Properties</h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs bg-muted/40 rounded-md px-3 py-2.5">
                      {Object.entries(selected.properties)
                        .filter(([k, v]) => k !== "headers" && v != null && v !== "")
                        .map(([k, v]) => (
                          <div key={k} className="flex gap-1.5 min-w-0">
                            <span className="text-muted-foreground shrink-0">{k}:</span>
                            <span className="font-mono truncate">{String(v)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Headers */}
                {selected.properties.headers && Object.keys(selected.properties.headers).length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Headers</h4>
                    <pre className="text-xs font-mono bg-muted/40 rounded-md px-3 py-2.5 overflow-auto max-h-28 leading-relaxed">
                      {JSON.stringify(selected.properties.headers, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Payload */}
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Payload</h4>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={copyPayload}>
                      {copied
                        ? <><Check className="h-3 w-3 text-emerald-500" /> Copied</>
                        : <><Copy className="h-3 w-3" /> Copy</>}
                    </Button>
                  </div>
                  <pre className="text-xs font-mono bg-muted/40 rounded-md px-3 py-2.5 overflow-auto min-h-[180px] leading-relaxed">
                    {formatPayload(selected.payload)}
                  </pre>
                </div>

              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs text-muted-foreground">Select a message to inspect</p>
              </div>
            )}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}
