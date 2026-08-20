"use client"

import * as React from "react"
import { Inbox } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface DataPoint {
  /** Stable identity (vhost-qualified) so segments key correctly. */
  id: string
  name: string
  value: number
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
]

const SIZE = 200
const STROKE = 22
const R = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * R
const GAP = 2.5 // degrees between segments

/**
 * Bespoke SVG donut for queue message distribution.
 * Replaces the former Recharts dependency with ~100 lines of SVG:
 * animated segment sweep, hover emphasis, center total, legend.
 */
export function DistributionDonut({ data }: { data: DataPoint[] }) {
  const [active, setActive] = React.useState<number | null>(null)

  const total = data.reduce((sum, d) => sum + d.value, 0)
  const nonZero = data.filter((d) => d.value > 0)

  if (!nonZero.length || total === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Inbox className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p className="text-xs">No messages in queues</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/60">
            Queued messages will appear here as producers publish
          </p>
        </div>
      </div>
    )
  }

  // Build segments with start angle + sweep, leaving a small gap between them
  const fractions = nonZero.map((d) => d.value / total)
  const segments = nonZero.map((d, i) => ({
    ...d,
    i,
    fraction: fractions[i],
    start: fractions.slice(0, i).reduce((a, b) => a + b, 0),
  }))

  const activeSeg = active !== null ? segments.find((s) => s.i === active) : null

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 lg:flex-row">
      <div className="relative shrink-0" style={{ width: SIZE * 0.85, height: SIZE * 0.85 }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full -rotate-90"
          onMouseLeave={() => setActive(null)}
        >
          {segments.map((seg) => {
            const gapFraction = segments.length > 1 ? GAP / 360 : 0
            const dash = Math.max(seg.fraction - gapFraction, 0.004) * CIRCUMFERENCE
            const offset = -(seg.start + gapFraction / 2) * CIRCUMFERENCE
            const isActive = active === seg.i
            const isDimmed = active !== null && !isActive
            return (
              <motion.circle
                key={seg.id}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={COLORS[Math.min(seg.i, COLORS.length - 1)]}
                strokeWidth={isActive ? STROKE + 4 : STROKE}
                strokeLinecap="butt"
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={offset}
                initial={{ opacity: 0 }}
                animate={{ opacity: isDimmed ? 0.35 : 1 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                style={{ cursor: "pointer", transition: "stroke-width 140ms" }}
                onMouseEnter={() => setActive(seg.i)}
              />
            )
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-xl font-semibold tracking-tight tnum">
            {(activeSeg?.value ?? total).toLocaleString()}
          </span>
          <span className="max-w-[100px] truncate text-[10px] text-muted-foreground">
            {activeSeg ? activeSeg.name : "total messages"}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full min-w-0 space-y-1 lg:w-auto lg:flex-1">
        {segments.map((seg) => (
          <button
            key={seg.id}
            onMouseEnter={() => setActive(seg.i)}
            onMouseLeave={() => setActive(null)}
            className={cn(
              "flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[11px] transition-colors duration-(--duration-fast)",
              active === seg.i ? "bg-surface-hover" : "hover:bg-surface-hover",
            )}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: COLORS[Math.min(seg.i, COLORS.length - 1)] }}
            />
            <span className="truncate text-muted-foreground">{seg.name}</span>
            <span className="ml-auto shrink-0 font-mono text-foreground tnum">
              {((seg.value / total) * 100).toFixed(1)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
