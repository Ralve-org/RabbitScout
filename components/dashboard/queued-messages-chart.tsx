"use client"

import { useMemo } from "react"
import { StreamingChart, type ColumnarData } from "./streaming-chart"

interface QueuedMessagesChartProps {
  timestamps: number[]
  totalMessages: number[]
  readyMessages: number[]
  unackedMessages: number[]
}

export function QueuedMessagesChart({
  timestamps,
  totalMessages,
  readyMessages,
  unackedMessages,
}: QueuedMessagesChartProps) {
  const data: ColumnarData = useMemo(
    () => [timestamps, totalMessages, readyMessages, unackedMessages],
    [timestamps, totalMessages, readyMessages, unackedMessages],
  )

  const series = useMemo(
    () => [
      {
        label: "Total",
        stroke: "hsl(0, 72%, 51%)",
        fill: "hsla(0, 72%, 51%, 0.06)",
      },
      {
        label: "Ready",
        stroke: "hsl(38, 92%, 50%)",
        fill: "hsla(38, 92%, 50%, 0.05)",
      },
      {
        label: "Unacked",
        stroke: "hsl(217, 91%, 60%)",
        fill: "hsla(217, 91%, 60%, 0.05)",
      },
    ],
    [],
  )

  return (
    <StreamingChart
      data={data}
      series={series}
      yAxisFormat={(v) => v.toLocaleString()}
    />
  )
}
