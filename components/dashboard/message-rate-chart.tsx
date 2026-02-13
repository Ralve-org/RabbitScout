"use client"

import { useMemo } from "react"
import { StreamingChart, type ColumnarData } from "./streaming-chart"

interface MessageRateChartProps {
  timestamps: number[]
  publishRates: number[]
  deliveryRates: number[]
}

export function MessageRateChart({ timestamps, publishRates, deliveryRates }: MessageRateChartProps) {
  const data: ColumnarData = useMemo(
    () => [timestamps, publishRates, deliveryRates],
    [timestamps, publishRates, deliveryRates],
  )

  const series = useMemo(
    () => [
      {
        label: "Publish",
        stroke: "hsl(24, 95%, 53%)",
        fill: "hsla(24, 95%, 53%, 0.08)",
      },
      {
        label: "Deliver",
        stroke: "hsl(142, 71%, 45%)",
        fill: "hsla(142, 71%, 45%, 0.06)",
      },
    ],
    [],
  )

  return (
    <StreamingChart
      data={data}
      series={series}
      yAxisFormat={(v) => `${v}/s`}
    />
  )
}
