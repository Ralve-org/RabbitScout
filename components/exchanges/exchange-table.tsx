"use client"

import * as React from "react"
import { ArrowRightLeft, Link2, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Pagination,
  SortButton,
  StaleDataBanner,
  usePagination,
  useRowPadding,
  useSort,
} from "@/components/shared/table-utils"
import { ErrorCard } from "@/components/shared/error-card"
import { BindingViewer } from "./binding-viewer"
import { CreateExchangeDialog } from "./create-exchange-dialog"
import { usePolling } from "@/hooks/use-polling"
import { usePreferences } from "@/lib/stores/preferences"
import { useToast } from "@/hooks/use-toast"
import { formatRate, cn } from "@/lib/utils"
import type { Exchange } from "@/lib/rabbitmq/types"

type SortKey = "name" | "type"

export function ExchangeTable() {
  const vhost = usePreferences((s) => s.vhost)
  const { toast } = useToast()
  const url = vhost
    ? `/api/rabbitmq/exchanges/${encodeURIComponent(vhost)}`
    : "/api/rabbitmq/exchanges"
  const { data: exchanges, error, loading, lastUpdated, refresh } = usePolling<Exchange[]>(url)

  const [search, setSearch] = React.useState("")
  const { sortKey, sortDir, toggle, compare } = useSort<SortKey>("name")
  const rowPad = useRowPadding()

  const [bindingsFor, setBindingsFor] = React.useState<Exchange | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<Exchange | null>(null)
  const [busy, setBusy] = React.useState(false)

  const list = React.useMemo(() => (Array.isArray(exchanges) ? exchanges : []), [exchanges])

  const filtered = React.useMemo(() => {
    let out = list
    if (search) {
      const q = search.toLowerCase()
      out = out.filter((e) => e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q))
    }
    return [...out].sort((a, b) => compare(a[sortKey] || "", b[sortKey] || ""))
  }, [list, search, sortKey, compare])

  const { page, setPage, pageCount, paged } = usePagination(filtered)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      const res = await fetch(
        `/api/rabbitmq/exchanges/${encodeURIComponent(deleteTarget.vhost)}/${encodeURIComponent(deleteTarget.name)}`,
        { method: "DELETE" },
      )
      if (res.ok) {
        toast({ title: "Exchange deleted", description: deleteTarget.name })
        refresh()
      } else {
        const body = await res.json().catch(() => null)
        toast({
          variant: "destructive",
          title: "Failed to delete exchange",
          description: body?.details || body?.error,
        })
      }
    } finally {
      setBusy(false)
      setDeleteTarget(null)
    }
  }

  if (error && !exchanges) return <ErrorCard message={error} type="CONNECTION" onRetry={refresh} />
  if (loading && !exchanges) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    )
  }

  const isBuiltin = (e: Exchange) => e.name === "" || e.name.startsWith("amq.")

  return (
    <div className="space-y-3">
      {error && exchanges && <StaleDataBanner error={error} lastUpdated={lastUpdated} onRetry={refresh} />}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search exchanges…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-transparent bg-secondary/50 pl-8 text-xs transition-all focus:border-border focus:bg-background"
          />
        </div>
        <span className="ml-auto text-[11px] text-muted-foreground tnum">
          {filtered.length} of {list.length} exchange{list.length !== 1 ? "s" : ""}
        </span>
        <DensityToggle />
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New exchange
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <SortButton field="name" sortKey={sortKey} sortDir={sortDir} onToggle={toggle}>
                  Name
                </SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="type" sortKey={sortKey} sortDir={sortDir} onToggle={toggle}>
                  Type
                </SortButton>
              </TableHead>
              <TableHead>Features</TableHead>
              <TableHead className="text-right">Rate in / out</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5}>
                  <EmptyState
                    icon={ArrowRightLeft}
                    title={search ? "No exchanges match your search" : "No exchanges found"}
                    hint={search ? "Try a different name or type" : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              paged.map((ex) => (
                <TableRow key={`${ex.vhost}/${ex.name}`} className="group">
                  <TableCell className={cn("font-medium", rowPad)}>
                    {ex.name || <span className="text-muted-foreground">(default)</span>}
                  </TableCell>
                  <TableCell className={cn("font-mono text-xs", rowPad)}>{ex.type}</TableCell>
                  <TableCell className={rowPad}>
                    <div className="flex gap-1.5">
                      {ex.durable && <Badge variant="info">durable</Badge>}
                      {ex.auto_delete && <Badge variant="warning">auto-delete</Badge>}
                      {ex.internal && <Badge variant="destructive">internal</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-right font-mono text-xs tnum", rowPad)}>
                    {ex.message_stats ? (
                      <span>
                        {formatRate(ex.message_stats.publish_in_details?.rate ?? 0)} /{" "}
                        {formatRate(ex.message_stats.publish_out_details?.rate ?? 0)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className={rowPad}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setBindingsFor(ex)}>
                          <Link2 /> Bindings
                        </DropdownMenuItem>
                        {!isBuiltin(ex) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(ex)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 /> Delete exchange
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination page={page} pageCount={pageCount} onPage={setPage} />

      <BindingViewer
        exchange={bindingsFor}
        open={!!bindingsFor}
        onOpenChange={(open) => {
          if (!open) setBindingsFor(null)
        }}
      />

      <CreateExchangeDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete exchange</DialogTitle>
            <DialogDescription>
              This deletes{" "}
              <span className="font-mono font-medium text-foreground">{deleteTarget?.name}</span>{" "}
              and all of its bindings. Publishers using it will start failing. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy ? "Deleting…" : "Delete exchange"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
