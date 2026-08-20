"use client"

import { useEffect, useRef, useCallback } from "react"
import { useTheme } from "next-themes"
import uPlot from "uplot"
import "uplot/dist/uPlot.min.css"

export type ColumnarData = [number[], ...number[][]]

interface StreamingChartProps {
  data: ColumnarData
  series: Array<{
    label: string
    stroke: string
    fill?: string
  }>
  yAxisFormat?: (v: number) => string
}

function cssVar(name: string): string {
  if (typeof document === "undefined") return "#888"
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return raw || "#888"
}

/**
 * Canvas-based time-series chart using uPlot with a cursor tooltip.
 * Fills its parent container's width AND height automatically.
 */
export function StreamingChart({ data, series, yAxisFormat }: StreamingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<uPlot | null>(null)
  const { theme } = useTheme()

  const buildOpts = useCallback(
    (width: number, height: number): uPlot.Options => {
      const textColor = cssVar("--muted-foreground")
      const gridColor = cssVar("--border")

      const fmt = (v: number) => (yAxisFormat ? yAxisFormat(v) : String(v))

      return {
        width,
        height,
        cursor: {
          show: true,
          drag: { x: false, y: false },
          points: { size: 6 },
        },
        legend: { show: false },
        padding: [8, 8, 0, 0],
        scales: {
          x: { time: true },
        },
        axes: [
          {
            stroke: textColor,
            grid: { stroke: gridColor, width: 1 },
            ticks: { stroke: gridColor, width: 1 },
            font: "12px var(--font-geist-mono), monospace",
            gap: 8,
          },
          {
            stroke: textColor,
            grid: { stroke: gridColor, width: 1 },
            ticks: { stroke: gridColor, width: 1 },
            font: "11px var(--font-geist-mono), monospace",
            size: 55,
            gap: 6,
            values: (_u: uPlot, vals: number[]) => vals.map(fmt),
          },
        ],
        series: [
          { label: "Time" },
          ...series.map((s) => ({
            label: s.label,
            stroke: s.stroke,
            fill: s.fill,
            width: 1.5,
            points: { show: false },
          })),
        ],
        hooks: {
          setCursor: [
            (u: uPlot) => {
              const tt = tooltipRef.current
              if (!tt) return
              const { left, top, idx } = u.cursor
              if (idx == null || left == null || left < 0 || top == null || top < 0) {
                tt.style.display = "none"
                return
              }
              const ts = u.data[0][idx]
              if (ts == null) {
                tt.style.display = "none"
                return
              }
              const time = new Date(ts * 1000).toLocaleTimeString()
              const rows = series
                .map((s, i) => {
                  const v = u.data[i + 1]?.[idx]
                  return `<div style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:9999px;background:${s.stroke};display:inline-block"></span><span>${s.label}</span><span style="margin-left:auto;font-variant-numeric:tabular-nums">${v == null ? "—" : fmt(v)}</span></div>`
                })
                .join("")
              tt.innerHTML = `<div style="opacity:.65;margin-bottom:4px">${time}</div>${rows}`
              tt.style.display = "block"
              const rect = u.over.getBoundingClientRect()
              const ttw = tt.offsetWidth
              const x = left + ttw + 20 > rect.width ? left - ttw - 12 : left + 12
              tt.style.transform = `translate(${x}px, ${Math.min(top, rect.height - tt.offsetHeight)}px)`
            },
          ],
        },
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- theme triggers color recalculation
    [series, yAxisFormat, theme],
  )

  // Create / destroy chart, and resize to fill container
  useEffect(() => {
    if (!containerRef.current) return

    const el = containerRef.current
    const w = el.clientWidth
    const h = el.clientHeight || 200

    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    const chart = new uPlot(buildOpts(w, h), data, el)
    chartRef.current = chart

    // Tooltip element lives inside the plotting area
    if (tooltipRef.current) chart.over.appendChild(tooltipRef.current)

    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect && chartRef.current) {
        chartRef.current.setSize({ width: rect.width, height: rect.height || 200 })
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      chart.destroy()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, buildOpts])

  // Update data without recreating the chart
  useEffect(() => {
    if (chartRef.current && data[0].length > 0) {
      chartRef.current.setData(data)
    }
  }, [data])

  return (
    <div ref={containerRef} className="relative h-full min-h-[180px] w-full [&_canvas]:rounded">
      <div
        ref={tooltipRef}
        style={{ display: "none" }}
        className="pointer-events-none absolute left-0 top-0 z-10 min-w-[150px] rounded-md border bg-popover px-2.5 py-2 text-[11px] text-popover-foreground shadow-md"
      />
    </div>
  )
}
