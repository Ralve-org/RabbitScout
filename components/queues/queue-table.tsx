"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Layers, Plus, Search } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DensityToggle,
  EmptyState,
  Pagination,
  SortButton,
  StaleDataBanner,
  usePagination,
  useRowPadding,
  useSort,
} from "@/components/shared/table-utils"
import { ErrorCard } from "@/components/shared/error-card"
import { QueueDrawer } from "./queue-drawer"
import { CreateQueueDialog } from "./create-queue-dialog"
import { usePolling } from "@/hooks/use-polling"
import { usePreferences } from "@/lib/stores/preferences"
import { formatRate, cn } from "@/lib/utils"
import type { Queue } from "@/lib/rabbitmq/types"

type SortKey =
  | "name"
  | "messages"
  | "messages_ready"
  | "messages_unacknowledged"
  | "consumers"
  | "state"

const TYPE_BADGES: Record<string, "info" | "secondary" | "warning"> = {
  quorum: "info",
  stream: "warning",
  classic: "secondary",
}

export function QueueTable() {
  const vhost = usePreferences((s) => s.vhost)
  const url = vhost
    ? `/api/rabbitmq/queues/${encodeURIComponent(vhost)}`
    : "/api/rabbitmq/queues"
  const { data: queues, error, loading, lastUpdated, refresh } = usePolling<Queue[]>(url)

  const searchParams = useSearchParams()
  const qParam = searchParams.get("q")
  const [search, setSearch] = React.useState(qParam ?? "")
  // Keep the filter in sync with ?q= deep links (command palette jumps) —
  // state adjusted during render per React's derive-from-props pattern
  const [prevQParam, setPrevQParam] = React.useState(qParam)
  if (qParam !== prevQParam) {
    setPrevQParam(qParam)
    if (qParam !== null) setSearch(qParam)
  }
  const [stateFilter, setStateFilter] = React.useState<string>("all")
  const { sortKey, sortDir, toggle, compare } = useSort<SortKey>("name")
  const rowPad = useRowPadding()

  const [selected, setSelected] = React.useState<Queue | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)

  const list = React.useMemo(() => (Array.isArray(queues) ? queues : []), [queues])

  const states = React.useMemo(
    () => Array.from(new Set(list.map((q) => q.state))).sort(),
    [list],
  )

  const filtered = React.useMemo(() => {
    let out = list
    if (stateFilter !== "all") out = out.filter((q) => q.state === stateFilter)
    if (search) {
      const q = search.toLowerCase()
      out = out.filter(
        (queue) =>
          queue.name.toLowerCase().includes(q) || queue.vhost.toLowerCase().includes(q),
      )
    }
    return [...out].sort((a, b) => compare(a[sortKey], b[sortKey]))
  }, [list, search, stateFilter, sortKey, compare])

  const { page, setPage, pageCount, paged } = usePagination(filtered)

  if (error && !queues) return <ErrorCard message={error} type="CONNECTION" onRetry={refresh} />
  if (loading && !queues) return <QueueTableSkeleton />

  const queueType = (q: Queue) =>
    q.type ?? (q.arguments?.["x-queue-type"] as string | undefined) ?? "classic"

  return (
    <div className="space-y-3">
      {error && queues && <StaleDataBanner error={error} lastUpdated={lastUpdated} onRetry={refresh} />}
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search queues…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-transparent bg-secondary/50 pl-8 text-xs transition-all focus:border-border focus:bg-background"
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
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      s === "running" ? "bg-success" : "bg-warning",
                    )}
                  />
                  {s}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-[11px] text-muted-foreground tnum">
          {filtered.length} of {list.length} queue{list.length !== 1 ? "s" : ""}
        </span>
        <DensityToggle />
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New queue
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <SortButton field="name" sortKey={sortKey} sortDir={sortDir} onToggle={toggle}>
                  Name
                </SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field="messages" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className="justify-end">
                  Messages
                </SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field="messages_ready" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className="justify-end">
                  Ready
                </SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field="messages_unacknowledged" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className="justify-end">
                  Unacked
                </SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field="consumers" sortKey={sortKey} sortDir={sortDir} onToggle={toggle} className="justify-end">
                  Consumers
                </SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="state" sortKey={sortKey} sortDir={sortDir} onToggle={toggle}>
                  State
                </SortButton>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={Layers}
                    title={
                      search || stateFilter !== "all"
                        ? "No queues match your filters"
                        : vhost
                          ? `No queues in vhost ${vhost}`
                          : "No queues yet"
                    }
                    hint={
                      search || stateFilter !== "all"
                        ? "Try clearing the search or state filter"
                        : "Create a queue to start routing messages"
                    }
                    action={
                      !search && stateFilter === "all" ? (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                          <Plus className="h-3.5 w-3.5" /> Create queue
                        </Button>
                      ) : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              paged.map((q) => (
                <TableRow
                  key={`${q.vhost}/${q.name}`}
                  className="cursor-pointer"
                  onClick={() => setSelected(q)}
                >
                  <TableCell className={cn("font-medium", rowPad)}>
                    <span className="flex items-center gap-2">
                      <span className="truncate">{q.name}</span>
                      {queueType(q) !== "classic" && (
                        <Badge variant={TYPE_BADGES[queueType(q)] ?? "secondary"}>
                          {queueType(q)}
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className={cn("text-right font-mono tnum", rowPad)}>
                    {(q.messages ?? 0).toLocaleString()}
                    {q.message_stats?.publish_details?.rate ? (
                      <span className="ml-1.5 text-[11px] text-muted-foreground">
                        {formatRate(q.message_stats.publish_details.rate)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className={cn("text-right font-mono tnum", rowPad)}>
                    {(q.messages_ready ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className={cn("text-right font-mono tnum", rowPad)}>
                    {(q.messages_unacknowledged ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className={cn("text-right font-mono tnum", rowPad)}>
                    {q.consumers ?? 0}
                  </TableCell>
                  <TableCell className={rowPad}>
                    <span className="inline-flex items-center gap-1.5 text-[13px]">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          q.state === "running" ? "bg-success" : "bg-warning",
                        )}
                      />
                      {q.state}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination page={page} pageCount={pageCount} onPage={setPage} />

      <QueueDrawer
        queue={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        onChanged={refresh}
      />

      <CreateQueueDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
    </div>
  )
}

function QueueTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-[130px]" />
        <Skeleton className="ml-auto h-8 w-24" />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["Name", "Messages", "Ready", "Unacked", "Consumers", "State"].map((h) => (
                <TableHead key={h} className="text-xs">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-12" /></TableCell>
                <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-8" /></TableCell>
                <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-8" /></TableCell>
                <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-6" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
