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

function hslVar(name: string): string {
  if (typeof document === "undefined") return "#888"
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return raw ? `hsl(${raw})` : "#888"
}

/**
 * Canvas-based streaming time-series chart using uPlot.
 * Fills its parent container's width AND height automatically.
 */
export function StreamingChart({ data, series, yAxisFormat }: StreamingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<uPlot | null>(null)
  const { theme } = useTheme()

  const buildOpts = useCallback(
    (width: number, height: number): uPlot.Options => {
      const textColor = hslVar("--muted-foreground")
      const gridColor = hslVar("--border")

      return {
        width,
        height,
        cursor: {
          show: true,
          drag: { x: false, y: false },
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
            values: (_u: uPlot, vals: number[]) =>
              vals.map((v) => (yAxisFormat ? yAxisFormat(v) : String(v))),
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
    <div
      ref={containerRef}
      className="w-full h-full min-h-[180px] [&_.u-wrap]:!bg-transparent [&_canvas]:rounded"
    />
  )
}
