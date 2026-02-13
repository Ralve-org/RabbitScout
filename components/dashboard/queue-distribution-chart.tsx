"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Inbox } from "lucide-react"

interface DataPoint {
  name: string
  value: number
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted-foreground))",
]

export function QueueDistributionChart({ data }: { data: DataPoint[] }) {
  if (!data?.length || data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Inbox className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p className="text-xs">No messages in queues</p>
        </div>
      </div>
    )
  }

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as DataPoint
            const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0"
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 shadow-md">
                <p className="text-xs font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {d.value.toLocaleString()} msgs ({pct}%)
                </p>
              </div>
            )
          }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground text-lg font-semibold font-mono"
        >
          {total.toLocaleString()}
        </text>
      </PieChart>
    </ResponsiveContainer>
  )
}
