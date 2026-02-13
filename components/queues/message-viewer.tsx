"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InboxIcon, Copy, Check, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react"
import type { QueueMessage } from "@/lib/rabbitmq/types"
import { cn } from "@/lib/utils"

interface MessageViewerProps {
  messages: QueueMessage[]
  open: boolean
  onOpenChange: (open: boolean) => void
  readyCount: number
  unackedCount: number
}

export function MessageViewer({ messages, open, onOpenChange, readyCount, unackedCount }: MessageViewerProps) {
  const [selected, setSelected] = useState<QueueMessage | null>(null)
  const [copied, setCopied] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [sortKey, setSortKey] = useState<"routing_key" | "payload_bytes">("routing_key")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const sorted = useMemo(() => {
    return [...messages].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1
      if (sortKey === "routing_key") return mul * (a.routing_key || "").localeCompare(b.routing_key || "")
      return mul * (a.payload_bytes - b.payload_bytes)
    })
  }, [messages, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / perPage)
  const paged = sorted.slice((page - 1) * perPage, page * perPage)

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const formatPayload = (raw: string) => {
    try { return JSON.stringify(JSON.parse(raw), null, 2) } catch { return raw }
  }

  const copyPayload = () => {
    if (!selected) return
    navigator.clipboard.writeText(selected.payload)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-base">Queue Messages</DialogTitle>
          <div className="flex gap-3 text-xs text-muted-foreground">
            {readyCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> {readyCount} ready
              </span>
            )}
            {unackedCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" /> {unackedCount} processing
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="grid flex-1 grid-cols-2 gap-0 overflow-hidden">
          {/* Message list */}
          <div className="flex flex-col border-r overflow-hidden">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>
                      <button onClick={() => toggleSort("routing_key")} className="flex items-center gap-1 text-xs font-medium">
                        Routing Key <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => toggleSort("payload_bytes")} className="flex items-center gap-1 text-xs font-medium">
                        Size <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="text-xs font-medium">Redelivered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.length > 0 ? paged.map((msg, i) => (
                    <TableRow
                      key={i}
                      className={cn("cursor-pointer", selected === msg && "bg-muted")}
                      onClick={() => setSelected(msg)}
                    >
                      <TableCell className="font-mono text-xs">{msg.routing_key || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{msg.payload_bytes} B</TableCell>
                      <TableCell>
                        <span className={cn("h-1.5 w-1.5 rounded-full inline-block", msg.redelivered ? "bg-warning" : "bg-success")} />
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-40">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <InboxIcon className="h-8 w-8 mb-2 opacity-40" />
                          <p className="text-xs">No messages available</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {paged.length > 0 && (
              <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
                <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1) }}>
                  <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}/page</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-2">{page}/{totalPages}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Detail pane */}
          <div className="flex flex-col overflow-auto p-4">
            {selected ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Properties</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-muted/50 p-3 rounded-md">
                    {Object.entries(selected.properties)
                      .filter(([k]) => k !== "headers")
                      .map(([k, v]) => (
                        <div key={k}>
                          <span className="text-muted-foreground">{k}:</span>{" "}
                          <span className="font-mono">{String(v ?? "—")}</span>
                        </div>
                      ))}
                  </div>
                </div>
                {selected.properties.headers && Object.keys(selected.properties.headers).length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Headers</h4>
                    <pre className="text-xs font-mono bg-muted/50 p-3 rounded-md overflow-auto max-h-24">
                      {JSON.stringify(selected.properties.headers, null, 2)}
                    </pre>
                  </div>
                )}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-xs font-medium text-muted-foreground">Payload</h4>
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={copyPayload}>
                      {copied ? <><Check className="h-3 w-3 text-success" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                    </Button>
                  </div>
                  <pre className="flex-1 text-xs font-mono bg-muted/50 p-3 rounded-md overflow-auto min-h-[200px]">
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
