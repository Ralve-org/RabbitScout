"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { MessageSquare, Layers, Cable, Server } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/dashboard/stat-card"
import { MessageRateChart } from "@/components/dashboard/message-rate-chart"
import { QueueDistributionChart } from "@/components/dashboard/queue-distribution-chart"
import { QueuedMessagesChart } from "@/components/dashboard/queued-messages-chart"
import { ErrorCard } from "@/components/shared/error-card"
import { AnimatedValue } from "@/components/shared/animated-value"
import { formatBytes, formatUptime, formatNumber, formatRate } from "@/lib/utils"
import { motion } from "motion/react"
import type { Overview, Queue, NodeStats } from "@/lib/rabbitmq/types"

const POLL_MS = 2000
const WINDOW_SEC = 90 // 90-second chart window

const stagger = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
}

// ── Columnar data store (mutable for performance) ──────────────
interface ChartData {
  timestamps: number[]
  publishRates: number[]
  deliveryRates: number[]
  totalMessages: number[]
  readyMessages: number[]
  unackedMessages: number[]
}

function createEmptyData(): ChartData {
  return {
    timestamps: [],
    publishRates: [],
    deliveryRates: [],
    totalMessages: [],
    readyMessages: [],
    unackedMessages: [],
  }
}

function appendAndTrim(data: ChartData, ov: Overview): ChartData {
  const now = Date.now() / 1000 // uPlot uses seconds
  const cutoff = now - WINDOW_SEC - 5

  // Find trim index
  let trimIdx = 0
  while (trimIdx < data.timestamps.length && data.timestamps[trimIdx] < cutoff) trimIdx++

  const ts = trimIdx > 0 ? data.timestamps.slice(trimIdx) : [...data.timestamps]
  const pr = trimIdx > 0 ? data.publishRates.slice(trimIdx) : [...data.publishRates]
  const dr = trimIdx > 0 ? data.deliveryRates.slice(trimIdx) : [...data.deliveryRates]
  const tm = trimIdx > 0 ? data.totalMessages.slice(trimIdx) : [...data.totalMessages]
  const rm = trimIdx > 0 ? data.readyMessages.slice(trimIdx) : [...data.readyMessages]
  const um = trimIdx > 0 ? data.unackedMessages.slice(trimIdx) : [...data.unackedMessages]

  ts.push(now)
  pr.push(ov.message_stats?.publish_details?.rate ?? 0)
  dr.push(ov.message_stats?.deliver_get_details?.rate ?? 0)
  tm.push(ov.queue_totals?.messages ?? 0)
  rm.push(ov.queue_totals?.messages_ready ?? 0)
  um.push(ov.queue_totals?.messages_unacknowledged ?? 0)

  return {
    timestamps: ts,
    publishRates: pr,
    deliveryRates: dr,
    totalMessages: tm,
    readyMessages: rm,
    unackedMessages: um,
  }
}

// ── Main page ──────────────────────────────────────────────────
export default function OverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [nodeStats, setNodeStats] = useState<NodeStats | null>(null)
  const [queueDist, setQueueDist] = useState<{ name: string; value: number }[]>([])
  const [chartData, setChartData] = useState<ChartData>(createEmptyData)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      const [overviewRes, queuesRes] = await Promise.all([
        fetch("/api/rabbitmq/overview"),
        fetch("/api/rabbitmq/queues"),
      ])
      if (!mountedRef.current) return
      if (!overviewRes.ok) throw new Error("Failed to fetch overview")
      if (!queuesRes.ok) throw new Error("Failed to fetch queues")

      const ov: Overview = await overviewRes.json()
      const queues: Queue[] = await queuesRes.json()

      setOverview(ov)
      setError(null)
      setChartData((prev) => appendAndTrim(prev, ov))

      // Node stats (non-blocking)
      if (ov.node) {
        fetch(`/api/rabbitmq/nodes/${ov.node}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((s) => { if (mountedRef.current && s) setNodeStats(s) })
          .catch(() => {})
      }

      // Queue distribution
      const sorted = [...queues].sort((a, b) => b.messages - a.messages)
      const top = sorted.slice(0, 6).map((q) => ({ name: q.name, value: q.messages }))
      if (sorted.length > 6) {
        top.push({ name: "Others", value: sorted.slice(6).reduce((s, q) => s + q.messages, 0) })
      }
      setQueueDist(top)
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    const id = setInterval(fetchData, POLL_MS)
    return () => { mountedRef.current = false; clearInterval(id) }
  }, [fetchData])

  if (error && !overview) {
    return <ErrorCard message={error} type="CONNECTION" onRetry={fetchData} />
  }
  if (loading) return <OverviewSkeleton />

  const ov = overview!
  const publishRate = ov.message_stats?.publish_details?.rate ?? 0
  const deliveryRate = ov.message_stats?.deliver_get_details?.rate ?? 0

  return (
    <div className="space-y-6">
      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Total Messages",
            value: ov.queue_totals?.messages ?? 0,
            subtitle: `${formatNumber(ov.queue_totals?.messages_ready ?? 0)} ready \u00b7 ${formatNumber(ov.queue_totals?.messages_unacknowledged ?? 0)} unacked`,
            icon: MessageSquare,
          },
          {
            title: "Queues",
            value: ov.object_totals?.queues ?? 0,
            subtitle: `${formatNumber(ov.object_totals?.exchanges ?? 0)} exchanges`,
            icon: Layers,
          },
          {
            title: "Connections",
            value: ov.object_totals?.connections ?? 0,
            subtitle: `${formatNumber(ov.object_totals?.channels ?? 0)} channels`,
            icon: Cable,
          },
          {
            title: "Memory",
            value: nodeStats?.mem_used ?? 0,
            format: (n: number) => formatBytes(n),
            subtitle: nodeStats?.uptime ? `Up ${formatUptime(nodeStats.uptime)}` : undefined,
            icon: Server,
          },
        ].map((s, i) => (
          <motion.div key={s.title} variants={stagger} initial="hidden" animate="show" custom={i}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* ── Charts + Cluster info row ── */}
      <motion.div className="grid gap-4 lg:grid-cols-12" variants={stagger} initial="hidden" animate="show" custom={4}>
        {/* Message Rates — flex col so chart fills available height */}
        <Card className="lg:col-span-8 flex flex-col">
          <CardHeader className="pb-2 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Message Rates</CardTitle>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Publish <span className="font-mono">{formatRate(publishRate)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Deliver <span className="font-mono">{formatRate(deliveryRate)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                  </span>
                  Live
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            <MessageRateChart
              timestamps={chartData.timestamps}
              publishRates={chartData.publishRates}
              deliveryRates={chartData.deliveryRates}
            />
          </CardContent>
        </Card>

        {/* Cluster Info */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cluster</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Node" value={ov.node || "—"} mono />
            <InfoRow label="RabbitMQ" value={ov.management_version || "—"} />
            <InfoRow label="Rates mode" value={ov.rates_mode || "—"} />
            <InfoRow
              label="Consumers"
              value={formatNumber(ov.object_totals?.consumers ?? 0)}
              mono
            />
            {nodeStats && (
              <>
                <InfoRow label="Disk free" value={formatBytes(nodeStats.disk_free ?? 0)} mono />
                <InfoRow
                  label="File descriptors"
                  value={`${formatNumber(nodeStats.fd_used ?? 0)} / ${formatNumber(nodeStats.fd_total ?? 0)}`}
                  mono
                />
                <InfoRow
                  label="Sockets"
                  value={`${formatNumber(nodeStats.sockets_used ?? 0)} / ${formatNumber(nodeStats.sockets_total ?? 0)}`}
                  mono
                />
              </>
            )}
            {ov.listeners && ov.listeners.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">Listeners</p>
                <div className="space-y-0.5">
                  {ov.listeners.slice(0, 4).map((l, i) => (
                    <p key={i} className="text-xs font-mono text-muted-foreground">
                      {l.protocol} :{l.port}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Bottom row ── */}
      <motion.div className="grid gap-4 lg:grid-cols-12" variants={stagger} initial="hidden" animate="show" custom={5}>
        {/* Queued Messages — flex col so chart fills available height */}
        <Card className="lg:col-span-8 flex flex-col">
          <CardHeader className="pb-2 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Queued Messages</CardTitle>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  Total <AnimatedValue value={ov.queue_totals?.messages ?? 0} className="font-mono" />
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  Ready <AnimatedValue value={ov.queue_totals?.messages_ready ?? 0} className="font-mono" />
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[hsl(217,91%,60%)]" />
                  Unacked <AnimatedValue value={ov.queue_totals?.messages_unacknowledged ?? 0} className="font-mono" />
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            <QueuedMessagesChart
              timestamps={chartData.timestamps}
              totalMessages={chartData.totalMessages}
              readyMessages={chartData.readyMessages}
              unackedMessages={chartData.unackedMessages}
            />
          </CardContent>
        </Card>

        {/* Queue Distribution */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Queue Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[200px]">
            <div className="h-full">
              <QueueDistributionChart data={queueDist} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// ── Helper components ──────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground/70">{label}</span>
      <span className={mono ? "font-mono text-foreground" : "text-foreground"}>{value}</span>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="skeleton-stagger">
            <CardContent className="p-5">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-7 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8 skeleton-stagger" style={{ animationDelay: "400ms" }}>
          <CardContent className="p-5"><Skeleton className="h-[200px] w-full" /></CardContent>
        </Card>
        <Card className="lg:col-span-4 skeleton-stagger" style={{ animationDelay: "500ms" }}>
          <CardContent className="p-5"><Skeleton className="h-[200px] w-full" /></CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8 skeleton-stagger" style={{ animationDelay: "600ms" }}>
          <CardContent className="p-5"><Skeleton className="h-[200px] w-full" /></CardContent>
        </Card>
        <Card className="lg:col-span-4 skeleton-stagger" style={{ animationDelay: "700ms" }}>
          <CardContent className="p-5"><Skeleton className="h-[200px] w-full" /></CardContent>
        </Card>
      </div>
    </div>
  )
}
