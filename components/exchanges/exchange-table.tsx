"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { ArrowUpDown, Link2, MoreHorizontal, Search } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BindingViewer } from "./binding-viewer"
import { formatRate, cn } from "@/lib/utils"
import type { Exchange, Binding } from "@/lib/rabbitmq/types"

const POLL_MS = 5000

type SortKey = "name" | "type"

export function ExchangeTable({ initial }: { initial?: Exchange[] }) {
  const [exchanges, setExchanges] = useState<Exchange[]>(initial ?? [])
  const [loading, setLoading] = useState(!initial)
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [bindings, setBindings] = useState<Binding[]>([])
  const [bindingExchange, setBindingExchange] = useState("")
  const [viewerOpen, setViewerOpen] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/rabbitmq/exchanges")
      if (res.ok) setExchanges(await res.json())
    } finally { setLoading(false) }
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

  const filtered = useMemo(() => {
    let list = exchanges
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((e) => e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1
      return mul * (a[sortKey] || "").localeCompare(b[sortKey] || "")
    })
  }, [exchanges, search, sortKey, sortDir])

  const viewBindings = async (exchange: Exchange) => {
    try {
      const res = await fetch(`/api/rabbitmq/exchanges/${encodeURIComponent(exchange.vhost)}/${encodeURIComponent(exchange.name)}/bindings/source`)
      if (res.ok) {
        setBindings(await res.json())
        setBindingExchange(exchange.name)
        setViewerOpen(true)
      }
    } catch { /* silently fail */ }
  }

  const SortBtn = ({ field, children }: { field: SortKey; children: React.ReactNode }) => (
    <button onClick={() => toggleSort(field)} className={cn("inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground", sortKey === field ? "text-foreground" : "text-muted-foreground")}>
      {children} <ArrowUpDown className={cn("h-3 w-3", sortKey === field ? "opacity-100" : "opacity-40")} />
    </button>
  )

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search exchanges..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs bg-secondary/50 border-transparent focus:border-border focus:bg-background transition-all" />
        </div>
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">{filtered.length} of {exchanges.length} exchange{exchanges.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9"><SortBtn field="name">Name</SortBtn></TableHead>
              <TableHead className="h-9"><SortBtn field="type">Type</SortBtn></TableHead>
              <TableHead className="h-9">Features</TableHead>
              <TableHead className="h-9 text-right">Rate In/Out</TableHead>
              <TableHead className="h-9 w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">
                  {search ? "No exchanges match your search" : "No exchanges found"}
                </TableCell>
              </TableRow>
            ) : filtered.map((ex, i) => (
              <TableRow key={`${ex.vhost}/${ex.name}`} className={cn("group transition-colors", i % 2 === 0 ? "bg-transparent" : "bg-muted/30")}>
                <TableCell className="font-medium text-sm">
                  {ex.name || <span className="text-muted-foreground">(default)</span>}
                </TableCell>
                <TableCell className="text-sm font-mono">{ex.type}</TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    {ex.durable && <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-500">D</span>}
                    {ex.auto_delete && <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">AD</span>}
                    {ex.internal && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">Int</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {ex.message_stats ? (
                    <span>
                      {formatRate(ex.message_stats.publish_in_details?.rate ?? 0)} / {formatRate(ex.message_stats.publish_out_details?.rate ?? 0)}
                    </span>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => viewBindings(ex)}>
                        <Link2 className="mr-2 h-4 w-4" /> View Bindings
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <BindingViewer bindings={bindings} open={viewerOpen} onOpenChange={setViewerOpen} exchangeName={bindingExchange} />
    </div>
  )
}
