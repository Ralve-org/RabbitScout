"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { ArrowUpDown, MoreHorizontal, Search, XCircle, Radio } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Channel } from "@/lib/rabbitmq/types"

const POLL_MS = 5000

type SortKey = "name" | "user" | "state" | "prefetch_count" | "messages_unacknowledged" | "consumer_count"

export function ChannelTable({ initial }: { initial?: Channel[] }) {
  const [channels, setChannels] = useState<Channel[]>(initial ?? [])
  const [loading, setLoading] = useState(!initial)
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [closing, setClosing] = useState<string | null>(null)
  const [closeTarget, setCloseTarget] = useState<Channel | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/rabbitmq/channels")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setChannels(data)
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!initial) refresh()
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [initial, refresh])

  const handleClose = async () => {
    if (!closeTarget) return
    setClosing(closeTarget.name)
    try {
      // RabbitMQ closes channels by closing the parent connection
      // The channel name format is "connection_name (channel_number)"
      const connName = closeTarget.connection_details.name
      await fetch(`/api/rabbitmq/connections/${encodeURIComponent(connName)}`, { method: "DELETE" })
      await refresh()
    } finally {
      setClosing(null)
      setCloseTarget(null)
    }
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const filtered = useMemo(() => {
    let list = channels
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.user.toLowerCase().includes(q) || c.connection_details.name.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === "string" && typeof bv === "string") return mul * av.localeCompare(bv)
      if (typeof av === "number" && typeof bv === "number") return mul * (av - bv)
      return 0
    })
  }, [channels, search, sortKey, sortDir])

  const SortBtn = ({ field, children }: { field: SortKey; children: React.ReactNode }) => (
    <Button variant="ghost" size="sm" className="h-7 -ml-2 text-xs font-medium gap-1" onClick={() => toggleSort(field)}>
      {children} <ArrowUpDown className="h-3 w-3" />
    </Button>
  )

  if (loading) return <Skeleton className="h-[300px] w-full rounded-lg" />

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search channels…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortBtn field="name">Channel</SortBtn></TableHead>
              <TableHead><SortBtn field="user">User</SortBtn></TableHead>
              <TableHead><SortBtn field="state">State</SortBtn></TableHead>
              <TableHead className="text-right"><SortBtn field="prefetch_count">Prefetch</SortBtn></TableHead>
              <TableHead className="text-right"><SortBtn field="messages_unacknowledged">Unacked</SortBtn></TableHead>
              <TableHead className="text-right"><SortBtn field="consumer_count">Consumers</SortBtn></TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Radio className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm font-medium">No active channels</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.map((ch) => (
              <TableRow key={ch.name}>
                <TableCell>
                  <div className="text-sm font-medium font-mono">#{ch.number}</div>
                  <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">{ch.connection_details.name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{ch.user}</div>
                  <div className="text-[11px] text-muted-foreground">{ch.vhost}</div>
                </TableCell>
                <TableCell className="text-sm">{ch.state}</TableCell>
                <TableCell className="text-right font-mono text-sm">{ch.prefetch_count}</TableCell>
                <TableCell className="text-right font-mono text-sm">{ch.messages_unacknowledged}</TableCell>
                <TableCell className="text-right font-mono text-sm">{ch.consumer_count}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setCloseTarget(ch)} className="text-destructive focus:text-destructive">
                        <XCircle className="mr-2 h-4 w-4" /> Close Channel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Close confirmation */}
      <Dialog open={!!closeTarget} onOpenChange={(open) => { if (!open) setCloseTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Channel</DialogTitle>
            <DialogDescription>
              This will close the channel by terminating its parent connection. All channels on that connection will be closed.
              {closeTarget && (
                <span className="block mt-2 font-mono text-xs">
                  Connection: {closeTarget.connection_details.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClose} disabled={!!closing}>
              {closing ? "Closing…" : "Close Channel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
