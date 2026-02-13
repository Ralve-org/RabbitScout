"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { ArrowUpDown, MoreHorizontal, Search, XCircle, Unplug } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatBytes, formatRate, cn } from "@/lib/utils"
import type { Connection } from "@/lib/rabbitmq/types"

const POLL_MS = 5000

type SortKey = "name" | "user" | "channels" | "recv_oct"

export function ConnectionTable({ initial }: { initial?: Connection[] }) {
  const [connections, setConnections] = useState<Connection[]>(initial ?? [])
  const [loading, setLoading] = useState(!initial)
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [closing, setClosing] = useState<string | null>(null)
  const [closeTarget, setCloseTarget] = useState<Connection | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/rabbitmq/connections")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setConnections(data)
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
      await fetch(`/api/rabbitmq/connections/${encodeURIComponent(closeTarget.name)}`, { method: "DELETE" })
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
    let list = connections
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.user.toLowerCase().includes(q) || (c.client_properties?.product || "").toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === "string" && typeof bv === "string") return mul * av.localeCompare(bv)
      if (typeof av === "number" && typeof bv === "number") return mul * (av - bv)
      return 0
    })
  }, [connections, search, sortKey, sortDir])

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
        <Input placeholder="Search connections…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortBtn field="name">Client</SortBtn></TableHead>
              <TableHead><SortBtn field="user">User</SortBtn></TableHead>
              <TableHead>VHost</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>SSL</TableHead>
              <TableHead className="text-right"><SortBtn field="channels">Channels</SortBtn></TableHead>
              <TableHead className="text-right"><SortBtn field="recv_oct">Throughput</SortBtn></TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Unplug className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm font-medium">No active connections</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.map((conn) => (
              <TableRow key={conn.name}>
                <TableCell>
                  <div className="text-sm font-medium">{conn.client_properties?.product || "Unknown"}</div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[180px]">{conn.name}</div>
                </TableCell>
                <TableCell className="text-sm">{conn.user}</TableCell>
                <TableCell className="text-sm">{conn.vhost}</TableCell>
                <TableCell className="text-sm">{conn.protocol}</TableCell>
                <TableCell>
                  <span className={cn("h-1.5 w-1.5 rounded-full inline-block", conn.ssl ? "bg-success" : "bg-destructive/50")} />
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{conn.channels}</TableCell>
                <TableCell className="text-right">
                  <div className="text-xs font-mono">
                    <span className="text-muted-foreground">↓</span> {formatBytes(conn.recv_oct)}
                    <span className="text-muted-foreground ml-1">{formatRate(conn.recv_oct_details?.rate ?? 0)}</span>
                  </div>
                  <div className="text-xs font-mono">
                    <span className="text-muted-foreground">↑</span> {formatBytes(conn.send_oct)}
                    <span className="text-muted-foreground ml-1">{formatRate(conn.send_oct_details?.rate ?? 0)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setCloseTarget(conn)} className="text-destructive focus:text-destructive">
                        <XCircle className="mr-2 h-4 w-4" /> Close Connection
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Close confirmation dialog */}
      <Dialog open={!!closeTarget} onOpenChange={(open) => { if (!open) setCloseTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Connection</DialogTitle>
            <DialogDescription>
              This will forcefully close the connection. The client may reconnect automatically.
              {closeTarget && (
                <span className="block mt-2 font-mono text-xs">{closeTarget.name}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClose} disabled={!!closing}>
              {closing ? "Closing…" : "Close Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
