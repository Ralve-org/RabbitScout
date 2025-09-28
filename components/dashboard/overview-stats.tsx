"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBytes, formatUptime, rabbitMQFetch, getNodeStats } from "@/lib/utils"
import { MessageSquare, Network, Server } from "lucide-react"
import { useEffect, useState } from "react"
import { useRefreshStore } from "@/lib/store"

interface StatsCardProps {
  title: string
  value: string
  description?: string
  icon: React.ReactNode
}

function StatsCard({ title, value, description, icon }: Readonly<StatsCardProps>) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

interface OverviewStatsProps {
  data: any;
  onDataUpdate?: (data: any) => void;
}

export function OverviewStats({ data: initialData, onDataUpdate }: Readonly<OverviewStatsProps>) {
  const [data, setData] = useState(initialData);
  const [nodeStats, setNodeStats] = useState<any>(null);
  const { interval } = useRefreshStore();

  useEffect(() => {
    let mounted = true;

    const refreshData = async () => {
      try {
        // First get overview to get node name
        const newData = await rabbitMQFetch('/overview');
        console.log('[OverviewStats] Overview data:', {
          node: newData.node,
          object_totals: newData.object_totals,
          queue_totals: newData.queue_totals
        });

        // Then get node stats using the node name from overview
        const newNodeStats = await getNodeStats();
        console.log('[OverviewStats] Node Stats:', {
          raw: newNodeStats,
          memUsed: newNodeStats?.mem_used,
          uptime: newNodeStats?.uptime,
          name: newNodeStats?.name
        });

        if (mounted) {
          setData(newData);
          setNodeStats(newNodeStats);
          onDataUpdate?.(newData);
        }
      } catch (error) {
        console.error('[OverviewStats] Error refreshing data:', error);
      }
    };

    refreshData();

    let intervalId: NodeJS.Timeout | undefined;
    
    if (interval > 0) {
      intervalId = setInterval(refreshData, interval * 1000);
    }

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [interval, onDataUpdate]);

  const totalMessages = data.queue_totals?.messages ?? 0;
  const messagesReady = data.queue_totals?.messages_ready ?? 0;
  const messagesUnacked = data.queue_totals?.messages_unacknowledged ?? 0;
  const totalQueues = data.object_totals?.queues ?? 0;
  const connections = data.object_totals?.connections ?? 0;
  const memoryUsed = nodeStats?.mem_used ?? 0;
  const uptime = nodeStats?.uptime ?? 0;

  console.log('[OverviewStats] Current Memory Stats:', {
    nodeStats,
    memoryUsed,
    formatted: formatBytes(memoryUsed)
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Messages"
        value={totalMessages.toLocaleString()}
        description={`${messagesReady.toLocaleString()} ready, ${messagesUnacked.toLocaleString()} unacked`}
        icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
      />
      <StatsCard
        title="Total Queues"
        value={totalQueues.toLocaleString()}
        description={`${(data.object_totals?.exchanges ?? 0).toLocaleString()} exchanges`}
        icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
      />
      <StatsCard
        title="Connections"
        value={connections.toLocaleString()}
        description={`${(data.object_totals?.channels ?? 0).toLocaleString()} channels`}
        icon={<Network className="h-4 w-4 text-muted-foreground" />}
      />
      <StatsCard
        title="Memory Usage"
        value={formatBytes(memoryUsed)}
        description={uptime ? `Uptime: ${formatUptime(uptime)}` : undefined}
        icon={<Server className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  )
}
