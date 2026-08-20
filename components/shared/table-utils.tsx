"use client"

import * as React from "react"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  RefreshCw,
  Rows3,
  Rows4,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePreferences } from "@/lib/stores/preferences"
import { cn } from "@/lib/utils"

// ── Sorting ────────────────────────────────────────────────────

export function useSort<K extends string>(initialKey: K, initialDir: "asc" | "desc" = "asc") {
  // Key and direction live in one state so toggling stays a pure update
  const [sort, setSort] = React.useState<{ key: K; dir: "asc" | "desc" }>({
    key: initialKey,
    dir: initialDir,
  })
  const { key: sortKey, dir: sortDir } = sort

  const toggle = React.useCallback((key: K) => {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    )
  }, [])

  const compare = React.useCallback(
    (av: unknown, bv: unknown) => {
      const mul = sortDir === "asc" ? 1 : -1
      if (typeof av === "string" && typeof bv === "string") return mul * av.localeCompare(bv)
      if (typeof av === "number" && typeof bv === "number") return mul * (av - bv)
      if (typeof av === "boolean" && typeof bv === "boolean") return mul * (Number(av) - Number(bv))
      return 0
    },
    [sortDir],
  )

  return { sortKey, sortDir, toggle, compare }
}

export function SortButton<K extends string>({
  field,
  sortKey,
  sortDir,
  onToggle,
  children,
  className,
}: {
  field: K
  sortKey: K
  sortDir: "asc" | "desc"
  onToggle: (key: K) => void
  children: React.ReactNode
  className?: string
}) {
  const active = sortKey === field
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown
  return (
    <button
      onClick={() => onToggle(field)}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium transition-colors duration-(--duration-fast) hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
        className,
      )}
    >
      {children}
      <Icon className={cn("h-3 w-3", active ? "opacity-100" : "opacity-40")} />
    </button>
  )
}

// ── Density ────────────────────────────────────────────────────

export function DensityToggle() {
  const { density, setDensity } = usePreferences()
  const compact = density === "compact"
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={() => setDensity(compact ? "comfortable" : "compact")}
        >
          {compact ? <Rows3 className="h-4 w-4" /> : <Rows4 className="h-4 w-4" />}
          <span className="sr-only">Toggle table density</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{compact ? "Comfortable rows" : "Compact rows"}</TooltipContent>
    </Tooltip>
  )
}

export function useRowPadding() {
  const density = usePreferences((s) => s.density)
  return density === "compact" ? "py-1.5" : "py-2.5"
}

// ── Stale data banner ──────────────────────────────────────────

/**
 * Shown above a table when polling fails but previous data is still on
 * screen — stale rows must never masquerade as live ones silently.
 */
export function StaleDataBanner({
  error,
  lastUpdated,
  onRetry,
}: {
  error: string | null
  lastUpdated: number | null
  onRetry: () => void
}) {
  if (!error) return null
  return (
    <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 truncate">
        Live data unavailable ({error})
        {lastUpdated && ` — showing data from ${new Date(lastUpdated).toLocaleTimeString()}`}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto h-6 shrink-0 gap-1 px-2 text-xs text-warning hover:text-warning"
        onClick={onRetry}
      >
        <RefreshCw className="h-3 w-3" /> Retry
      </Button>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
      <Icon className="mb-2 h-8 w-8 opacity-30" />
      <p className="text-sm font-medium text-foreground/80">{title}</p>
      {hint && <p className="mt-0.5 text-xs">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

// ── Client-side pagination (keeps DOM light on large brokers) ──

export function usePagination<T>(items: T[], perPage = 50) {
  const [page, setPage] = React.useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / perPage))
  // Clamp during render instead of via an effect — shrinking result sets
  // (filtering, deletions) snap back to the last valid page immediately
  if (page > pageCount) setPage(pageCount)
  const clamped = Math.min(page, pageCount)
  const paged = React.useMemo(
    () => items.slice((clamped - 1) * perPage, clamped * perPage),
    [items, clamped, perPage],
  )
  return { page: clamped, setPage, pageCount, paged }
}

export function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number
  pageCount: number
  onPage: (p: number) => void
}) {
  if (pageCount <= 1) return null
  return (
    <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
      <Button variant="ghost" size="sm" className="h-7 px-2" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span className="px-2 font-mono tnum">
        {page} / {pageCount}
      </span>
      <Button variant="ghost" size="sm" className="h-7 px-2" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </div>
  )
}
