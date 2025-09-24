"use client"

import { Suspense, useEffect, useState } from "react"
import { MessageRateChart } from "@/components/dashboard/message-rate-chart"
import { OverviewStats } from "@/components/dashboard/overview-stats"
import { QueueDistributionChart } from "@/components/dashboard/queue-distribution-chart"
import { QueuedMessagesChart } from "@/components/dashboard/queued-messages-chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getOverview, getQueues, RabbitMQError } from "@/lib/utils"
import { ApiError } from "@/components/common/api-error"

// Disable static page generation and caching
export const dynamic = 'force-dynamic'

function Overview() {
  const [error, setError] = useState<RabbitMQError | null>(null);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [queueDistribution, setQueueDistribution] = useState<Array<{ name: string; value: number }>>([]);
  const [messageRateData, setMessageRateData] = useState<Array<{
    timestamp: number
    publishRate: number
    deliveryRate: number
  }>>([]);

  const [queuedMessagesData, setQueuedMessagesData] = useState<Array<{
    timestamp: number
    messages: number
    messagesReady: number
    messagesUnacked: number
  }>>([]);

  const handleDataUpdate = (newData: any) => {
    const timestamp = Date.now();
    const oneMinuteAgo = timestamp - 60 * 1000;

    // Update message rate data
    setMessageRateData(prev => {
      const newPoint = {
        timestamp,
        publishRate: newData.message_stats?.publish_details?.rate || 0,
        deliveryRate: newData.message_stats?.deliver_get_details?.rate || 0,
      };
      // Filter out data older than 1 minute and add new point
      const filtered = prev.filter(point => point.timestamp > oneMinuteAgo);
      return [...filtered, newPoint];
    });

    // Update queued messages data
    setQueuedMessagesData(prev => {
      const newPoint = {
        timestamp,
        messages: newData.queue_totals?.messages || 0,
        messagesReady: newData.queue_totals?.messages_ready || 0,
        messagesUnacked: newData.queue_totals?.messages_unacknowledged || 0,
      };
      // Filter out data older than 1 minute and add new point
      const filtered = prev.filter(point => point.timestamp > oneMinuteAgo);
      return [...filtered, newPoint];
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get auth state from localStorage
        const authData = localStorage.getItem('auth-storage');
        if (!authData) {
          throw new Error('No authentication data found');
        }
        
        const { state } = JSON.parse(authData);
        if (!state?.authenticated || !state?.user) {
          throw new Error('User not authenticated');
        }

        const [overviewResponse, queuesResponse] = await Promise.all([
          getOverview(),
          getQueues()
        ]);

        setOverviewData(overviewResponse);
        handleDataUpdate(overviewResponse);

        // Process queue distribution data
        if (queuesResponse) {
          const distribution = queuesResponse
            .sort((a, b) => b.messages - a.messages)
            .slice(0, 6)
            .map((queue) => ({
              name: queue.name,
              value: queue.messages,
            }));

          if (queuesResponse.length > 6) {
            const othersMessages = queuesResponse
              .slice(6)
              .reduce((sum, queue) => sum + queue.messages, 0);
            distribution.push({
              name: "Others",
              value: othersMessages,
            });
          }

          setQueueDistribution(distribution);
        }

        // No error, clear any existing error
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err as RabbitMQError);
      }
    };

    const interval = setInterval(fetchData, 5000);
    fetchData(); // Initial fetch

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <ApiError error={error} />;
  }

  if (!overviewData) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="space-y-4">
      <OverviewStats data={overviewData} onDataUpdate={handleDataUpdate} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Message Rate</CardTitle>
            <CardDescription>
              Message publish and delivery rates over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <MessageRateChart data={messageRateData} />
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Queue Distribution</CardTitle>
            <CardDescription>
              Distribution of messages across queues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <QueueDistributionChart data={queueDistribution} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queued Messages</CardTitle>
          <CardDescription>
            Number of messages in queues over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <QueuedMessagesChart data={queuedMessagesData} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-[100px]" />
              </CardTitle>
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[100px]" />
              <Skeleton className="h-4 w-[150px] mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-4 w-[250px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-4 w-[250px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[150px]" />
          <Skeleton className="h-4 w-[250px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview />
    </Suspense>
  )
}
