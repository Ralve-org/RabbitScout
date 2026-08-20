"use client"

import * as React from "react"
import { Radio, Search, XCircle, MoreHorizontal } from "lucide-react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DensityToggle,
  EmptyState,
  SortButton,
  useRowPadding,
  useSort,
} from "@/components/shared/table-utils"
import { ErrorCard } from "@/components/shared/error-card"
import { usePolling } from "@/hooks/use-polling"
import { usePreferences } from "@/lib/stores/preferences"
import { useToast } from "@/hooks/use-toast"
import { formatRate, cn } from "@/lib/utils"
import type { Channel } from "@/lib/rabbitmq/types"

type SortKey =
  | "name"
  | "user"
  | "state"
  | "prefetch_count"
  | "messages_unacknowledged"
  | "consumer_count"

export function ChannelTable() {
  const vhost = usePreferences((s) => s.vhost)
  const { toast } = useToast()
  const { data, error, loading, refresh } = usePolling<Channel[]>("/api/rabbitmq/channels")

  const [search, setSearch] = React.useState("")
  const { sortKey, sortDir, toggle, compare } = useSort<SortKey>("name")
  const rowPad = useRowPadding()

  const [closeTarget, setCloseTarget] = React.useState<Channel | null>(null)
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
          c.connection_details.name.toLowerCase().includes(q),
      )
    }
    return [...out].sort((a, b) => compare(a[sortKey], b[sortKey]))
  }, [list, search, sortKey, compare])

  const handleClose = async () => {
    if (!closeTarget) return
    setClosing(true)
    try {
      // The management API cannot close a single channel — closing the
      // parent connection is the only way, which drops all its channels.
      const res = await fetch(
        `/api/rabbitmq/connections/${encodeURIComponent(closeTarget.connection_details.name)}`,
        { method: "DELETE" },
      )
      if (res.ok) {
        toast({ title: "Connection closed", description: closeTarget.connection_details.name })
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
            placeholder="Search channels…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-transparent bg-secondary/50 pl-8 text-xs transition-all focus:border-border focus:bg-background"
          />
        </div>
        <span className="ml-auto text-[11px] text-muted-foreground tnum">
          {filtered.length} channel{filtered.length !== 1 ? "s" : ""}
        </span>
        <DensityToggle />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <SortButton field="name" sortKey={sortKey} sortDir={sortDir} onToggle={toggle}>
                  Channel
                </SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="user" sortKey={sortKey} sortDir={sortDir} onToggle={toggle}>
                  User
                </SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="state" sortKey={sortKey} sortDir={sortDir} onToggle={toggle}>
                  State
                </SortButton>
              </TableHead>
              <TableHead className="text-right">Rates</TableHead>
              <TableHead className="text-right">
                <SortButton field="prefetch_count" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className="justify-end">
                  Prefetch
                </SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field="messages_unacknowledged" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className="justify-end">
                  Unacked
                </SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field="consumer_count" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className="justify-end">
                  Consumers
                </SortButton>
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8}>
                  <EmptyState
                    icon={Radio}
                    title="No active channels"
                    hint="Channels open when clients start consuming or publishing"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((ch) => (
                <TableRow key={ch.name}>
                  <TableCell className={rowPad}>
                    <div className="font-mono text-[13px] font-medium">#{ch.number}</div>
                    <div className="max-w-[220px] truncate text-[11px] text-muted-foreground">
                      {ch.connection_details.name}
                    </div>
                  </TableCell>
                  <TableCell className={rowPad}>
                    <div className="text-[13px]">{ch.user}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{ch.vhost}</div>
                  </TableCell>
                  <TableCell className={rowPad}>
                    <Badge
                      variant={
                        ch.state === "running"
                          ? "success"
                          : ch.state === "flow"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {ch.state}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn("text-right font-mono text-xs tnum", rowPad)}>
                    {ch.message_stats ? (
                      <>
                        <div>
                          <span className="text-muted-foreground">pub</span>{" "}
                          {formatRate(ch.message_stats.publish_details?.rate ?? 0)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">del</span>{" "}
                          {formatRate(ch.message_stats.deliver_get_details?.rate ?? 0)}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className={cn("text-right font-mono text-[13px] tnum", rowPad)}>
                    {ch.prefetch_count}
                  </TableCell>
                  <TableCell className={cn("text-right font-mono text-[13px] tnum", rowPad)}>
                    {ch.messages_unacknowledged}
                  </TableCell>
                  <TableCell className={cn("text-right font-mono text-[13px] tnum", rowPad)}>
                    {ch.consumer_count}
                  </TableCell>
                  <TableCell className={rowPad}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setCloseTarget(ch)}
                          className="text-destructive focus:text-destructive"
                        >
                          <XCircle /> Close parent connection
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Close confirmation */}
      <Dialog open={!!closeTarget} onOpenChange={(open) => !open && setCloseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close parent connection</DialogTitle>
            <DialogDescription>
              AMQP channels cannot be closed individually via the management API — this closes the
              channel&apos;s parent connection, dropping <strong>all</strong> channels on it.
              {closeTarget && (
                <span className="mt-2 block font-mono text-xs">
                  {closeTarget.connection_details.name}
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
