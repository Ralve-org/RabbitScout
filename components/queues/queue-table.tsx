"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { ArrowUpDown, Search, Layers } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QueueActions } from "./queue-actions"
import { formatRate, cn } from "@/lib/utils"
import type { Queue } from "@/lib/rabbitmq/types"

const POLL_MS = 5000

type SortKey = "name" | "messages" | "messages_ready" | "messages_unacknowledged" | "consumers" | "state"

export function QueueTable({ initial }: { initial?: Queue[] }) {
  const [queues, setQueues] = useState<Queue[]>(initial ?? [])
  const [loading, setLoading] = useState(!initial)
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/rabbitmq/queues")
      if (res.ok) setQueues(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initial) refresh()
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [initial, refresh])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  // Get unique states for filter dropdown
  const states = useMemo(() => {
    const s = new Set(queues.map((q) => q.state))
    return Array.from(s).sort()
  }, [queues])

  const filtered = useMemo(() => {
    let list = queues

    // State filter
    if (stateFilter !== "all") {
      list = list.filter((q) => q.state === stateFilter)
    }

    // Search
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((queue) => queue.name.toLowerCase().includes(q) || queue.vhost.toLowerCase().includes(q))
    }

    // Sort
    return [...list].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === "string" && typeof bv === "string") return mul * av.localeCompare(bv)
      if (typeof av === "number" && typeof bv === "number") return mul * (av - bv)
      return 0
    })
  }, [queues, search, stateFilter, sortKey, sortDir])

  const SortBtn = ({ field, children }: { field: SortKey; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground",
        sortKey === field ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {children}
      <ArrowUpDown className={cn("h-3 w-3", sortKey === field ? "opacity-100" : "opacity-40")} />
    </button>
  )

  if (loading) return <QueueTableSkeleton />

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search queues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-secondary/50 border-transparent focus:border-border focus:bg-background transition-all"
          />
        </div>

        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="All states" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            {states.map((s) => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", s === "running" ? "bg-success" : "bg-warning")} />
                  {s}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
          {filtered.length} of {queues.length} queue{queues.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9"><SortBtn field="name">Name</SortBtn></TableHead>
              <TableHead className="h-9 text-right"><SortBtn field="messages">Messages</SortBtn></TableHead>
              <TableHead className="h-9 text-right"><SortBtn field="messages_ready">Ready</SortBtn></TableHead>
              <TableHead className="h-9 text-right"><SortBtn field="messages_unacknowledged">Unacked</SortBtn></TableHead>
              <TableHead className="h-9 text-right"><SortBtn field="consumers">Consumers</SortBtn></TableHead>
              <TableHead className="h-9"><SortBtn field="state">State</SortBtn></TableHead>
              <TableHead className="h-9 w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-32">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Layers className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">{search || stateFilter !== "all" ? "No queues match your filters" : "No queues found"}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.map((q, i) => (
              <TableRow
                key={`${q.vhost}/${q.name}`}
                className={cn(
                  "group transition-colors",
                  i % 2 === 0 ? "bg-transparent" : "bg-muted/30",
                )}
              >
                <TableCell className="font-medium text-sm py-2.5">{q.name}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums py-2.5">
                  {q.messages.toLocaleString()}
                  {q.message_stats?.publish_details?.rate ? (
                    <span className="ml-1.5 text-[11px] text-muted-foreground">{formatRate(q.message_stats.publish_details.rate)}</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums py-2.5">{q.messages_ready.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums py-2.5">{q.messages_unacknowledged.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums py-2.5">{q.consumers}</TableCell>
                <TableCell className="py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <span className={cn("h-1.5 w-1.5 rounded-full", q.state === "running" ? "bg-success" : "bg-warning")} />
                    {q.state}
                  </span>
                </TableCell>
                <TableCell className="py-2.5">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <QueueActions queueName={q.name} vhost={q.vhost} messagesReady={q.messages_ready} messagesUnacked={q.messages_unacknowledged} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function QueueTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-[130px]" />
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["Name", "Messages", "Ready", "Unacked", "Consumers", "State", ""].map((h) => (
                <TableHead key={h} className="h-9 text-xs">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i} className={i % 2 === 0 ? "bg-transparent" : "bg-muted/30"}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-6 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-5 rounded" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
