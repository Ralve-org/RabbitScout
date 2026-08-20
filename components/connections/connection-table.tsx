"use client"

import * as React from "react"
import { Search, Unplug, XCircle } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DensityToggle,
  EmptyState,
  SortButton,
  useRowPadding,
  useSort,
} from "@/components/shared/table-utils"
import { ErrorCard } from "@/components/shared/error-card"
import { ConnectionDrawer } from "./connection-drawer"
import { usePolling } from "@/hooks/use-polling"
import { usePreferences } from "@/lib/stores/preferences"
import { useToast } from "@/hooks/use-toast"
import { formatBytes, formatRate, cn } from "@/lib/utils"
import type { Connection } from "@/lib/rabbitmq/types"

type SortKey = "name" | "user" | "channels" | "recv_oct"

/**
 * Display name for a connection: prefer the client-supplied name
 * (user_provided_name / client_properties.connection_name), falling back
 * to host:port — mirroring how the official management UI labels rows.
 */
export function connectionDisplayName(c: Connection): string | null {
  return c.user_provided_name || c.client_properties?.connection_name || null
}

export function ConnectionTable() {
  const vhost = usePreferences((s) => s.vhost)
  const { toast } = useToast()
  const { data, error, loading, refresh } = usePolling<Connection[]>("/api/rabbitmq/connections")

  const [search, setSearch] = React.useState("")
  const { sortKey, sortDir, toggle, compare } = useSort<SortKey>("name")
  const rowPad = useRowPadding()

  const [selected, setSelected] = React.useState<Connection | null>(null)
  const [closeTarget, setCloseTarget] = React.useState<Connection | null>(null)
  const [closing, setClosing] = React.useState(false)

  const list = React.useMemo(() => {
    let out = Array.isArray(data) ? data : []
    if (vhost) out = out.filter((c) => c.vhost === vhost)
    return out
  }, [data, vhost])

  const filtered = React.useMemo(() => {
    let out = list
    if (search) {
      const q = search.toLowerCase()
      out = out.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.user.toLowerCase().includes(q) ||
          (connectionDisplayName(c) || "").toLowerCase().includes(q) ||
          (c.client_properties?.product || "").toLowerCase().includes(q),
      )
    }
    return [...out].sort((a, b) => compare(a[sortKey], b[sortKey]))
  }, [list, search, sortKey, compare])

  const handleClose = async () => {
    if (!closeTarget) return
    setClosing(true)
    try {
      const res = await fetch(
        `/api/rabbitmq/connections/${encodeURIComponent(closeTarget.name)}`,
        { method: "DELETE" },
      )
      if (res.ok) {
        toast({ title: "Connection closed", description: connectionDisplayName(closeTarget) ?? closeTarget.name })
      } else {
        const body = await res.json().catch(() => null)
        toast({
          variant: "destructive",
          title: "Failed to close connection",
          description: body?.details || body?.error,
        })
      }
      refresh()
    } finally {
      setClosing(false)
      setCloseTarget(null)
    }
  }

  if (error && !data) return <ErrorCard message={error} type="CONNECTION" onRetry={refresh} />
  if (loading && !data) return <Skeleton className="h-[300px] w-full rounded-lg" />

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search connections…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-transparent bg-secondary/50 pl-8 text-xs transition-all focus:border-border focus:bg-background"
          />
        </div>
        <span className="ml-auto text-[11px] text-muted-foreground tnum">
          {filtered.length} connection{filtered.length !== 1 ? "s" : ""}
        </span>
        <DensityToggle />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <SortButton field="name" sortKey={sortKey} sortDir={sortDir} onToggle={toggle}>
                  Connection
                </SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="user" sortKey={sortKey} sortDir={sortDir} onToggle={toggle}>
                  User
                </SortButton>
              </TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead className="text-right">
                <SortButton field="channels" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className="justify-end">
                  Channels
                </SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field="recv_oct" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className="justify-end">
                  Throughput
                </SortButton>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={Unplug}
                    title="No active connections"
                    hint={
                      vhost
                        ? `No clients are connected to vhost ${vhost}`
                        : "Clients will appear here as they connect to the broker"
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((conn) => {
                const displayName = connectionDisplayName(conn)
                return (
                  <TableRow
                    key={conn.name}
                    className="cursor-pointer"
                    onClick={() => setSelected(conn)}
                  >
                    <TableCell className={rowPad}>
                      <div className="max-w-[260px]">
                        <div className="truncate text-[13px] font-medium">
                          {displayName ?? conn.name}
                        </div>
                        <div className="truncate font-mono text-[11px] text-muted-foreground">
                          {displayName ? conn.name : `${conn.peer_host}:${conn.peer_port}`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={cn("text-[13px]", rowPad)}>
                      {conn.user}
                      <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                        {conn.vhost}
                      </span>
                    </TableCell>
                    <TableCell className={cn("text-[13px]", rowPad)}>
                      {conn.client_properties?.product || "Unknown"}
                      {conn.client_properties?.version && (
                        <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                          {conn.client_properties.version}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={rowPad}>
                      <span className="flex items-center gap-1.5 text-[13px]">
                        {conn.protocol}
                        {conn.ssl && <Badge variant="success">TLS</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className={cn("text-right font-mono text-[13px] tnum", rowPad)}>
                      {conn.channels}
                    </TableCell>
                    <TableCell className={cn("text-right", rowPad)}>
                      <div className="font-mono text-xs tnum">
                        <span className="text-muted-foreground">↓</span> {formatBytes(conn.recv_oct)}
                        <span className="ml-1 text-muted-foreground">
                          {formatRate(conn.recv_oct_details?.rate ?? 0)}
                        </span>
                      </div>
                      <div className="font-mono text-xs tnum">
                        <span className="text-muted-foreground">↑</span> {formatBytes(conn.send_oct)}
                        <span className="ml-1 text-muted-foreground">
                          {formatRate(conn.send_oct_details?.rate ?? 0)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ConnectionDrawer
        connection={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        onCloseConnection={(c) => {
          setSelected(null)
          setCloseTarget(c)
        }}
      />

      {/* Close confirmation */}
      <Dialog open={!!closeTarget} onOpenChange={(open) => !open && setCloseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" /> Close connection
            </DialogTitle>
            <DialogDescription>
              This forcefully closes the connection and all of its channels. The client may
              reconnect automatically.
              {closeTarget && (
                <span className="mt-2 block font-mono text-xs">
                  {connectionDisplayName(closeTarget) ?? closeTarget.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClose} disabled={closing}>
              {closing ? "Closing…" : "Close connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
