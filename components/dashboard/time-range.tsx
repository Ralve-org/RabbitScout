"use client"

import { cn } from "@/lib/utils"

/**
 * Chart time ranges. Sample increments follow the broker's default
 * retention policies (global: 5s ≤ 10m, 60s ≤ 1h, 600s ≤ ~8h, 1800s ≤ 24h),
 * so every range asks only for data the broker actually retains.
 */
export const TIME_RANGES = [
  { key: "live", label: "Live", age: 0, incr: 0 },
  { key: "10m", label: "10m", age: 600, incr: 5 },
  { key: "1h", label: "1h", age: 3600, incr: 60 },
  { key: "8h", label: "8h", age: 28800, incr: 600 },
  { key: "24h", label: "24h", age: 86400, incr: 1800 },
] as const

export type TimeRangeKey = (typeof TIME_RANGES)[number]["key"]

export function TimeRangeSelect({
  value,
  onChange,
}: {
  value: TimeRangeKey
  onChange: (key: TimeRangeKey) => void
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border bg-secondary/50 p-0.5">
      {TIME_RANGES.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors duration-(--duration-fast)",
            value === r.key
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
