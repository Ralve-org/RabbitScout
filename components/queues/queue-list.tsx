"use client"

import {useEffect, useMemo, useState} from "react"
import {QueueOperations} from "@/components/queues/queue-operations"
import {Button} from "@/components/ui/button"
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table"
import {cn, formatRate, QueueStats, RabbitMQError} from "@/lib/utils"
import {ArrowUpDown} from "lucide-react"
import {useToast} from "@/hooks/use-toast"
import {useRefreshStore} from "@/lib/store"
import {Skeleton} from "@/components/ui/skeleton"

interface Queue extends QueueStats {
  name: string
  vhost: string
  state: string
  consumers: number
  consumer_utilisation: number
  policy: string
  exclusive: boolean
  auto_delete: boolean
  durable: boolean
}

interface QueueListProps {
  queues?: Queue[]
}

type SortField = keyof Queue
type SortOrder = "asc" | "desc"

export function QueueList({queues: initialQueues}: Readonly<QueueListProps>) {
  const [isInitialLoading, setIsInitialLoading] = useState(!initialQueues)
  const [queues, setQueues] = useState<Queue[]>(initialQueues || [])
  const [error, setError] = useState<RabbitMQError | null>(null)
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const {toast} = useToast()
  const {interval} = useRefreshStore()


  useEffect(() => {
    const fetchQueues = async (isInitialFetch = false) => {
      try {
        // Skip initial fetch since we get data from props
        if (isInitialFetch && initialQueues) {
          return;
        }

        if (isInitialFetch) {
          setIsInitialLoading(true);
        }

        const response = await fetch('/api/queues', {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Let's validate the data structure
        const validQueues = Array.isArray(data) ? data.map(queue => ({
          name: queue.name || '',
          vhost: queue.vhost || '/',
          state: queue.state || 'unknown',
          consumers: queue.consumers || 0,
          consumer_utilisation: queue.consumer_utilisation || 0,
          policy: queue.policy || '',
          exclusive: queue.exclusive || false,
          auto_delete: queue.auto_delete || false,
          durable: queue.durable || false,
          messages: queue.messages || 0,
          messages_ready: queue.messages_ready || 0,
          messages_unacknowledged: queue.messages_unacknowledged || 0,
          message_stats: queue.message_stats || {}
        })) : [];

        setQueues(validQueues);
        setError(null);
      } catch (err) {
        console.error("[QueueList] Error fetching queues:", err)
        setError(err as RabbitMQError)
        toast({
          variant: "destructive",
          title: "Error fetching queues",
          description: (err as RabbitMQError).message || "Failed to connect to RabbitMQ server",
        })
      } finally {
        if (isInitialFetch) {
          setIsInitialLoading(false)
        }
        console.log('[QueueList] Loading state finished')
      }
    }


    let mounted = true
    let intervalId: NodeJS.Timeout | undefined

    const refreshData = async () => {
      if (!mounted) return
      await fetchQueues(false) // Regular interval refresh
    }

    if (!initialQueues) {
      console.log('[QueueList] No initial queues provided, fetching queues...')
      fetchQueues(true) // Initial fetch
    }

    if (interval > 0) {
      console.log(`[QueueList] Setting up refresh interval: ${interval}s`)
      intervalId = setInterval(refreshData, interval * 1000)
    }

    return () => {
      mounted = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [initialQueues, interval, toast])

  // Memoize the sorting function itself to avoid recreating it on every render
  const sortQueuesFn = useMemo(() => (queues: Queue[]) => {
    return [...queues].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue
      }

      return 0
    })
  }, [sortField, sortOrder])

  // Apply the memoized sort function to the queues
  const displayQueues = useMemo(() => {
    return sortQueuesFn(queues);
  }, [queues, sortQueuesFn]);

  const sortQueues = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Queues</h3>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
    )
  }

  if (!queues.length) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">No Queues Found</h3>
          <p className="text-muted-foreground">There are no queues in this virtual host.</p>
        </div>
    )
  }

  return (
      <div className="flex flex-col gap-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[14%] text-center">
                  <Button
                      variant="ghost"
                      onClick={() => sortQueues("name")}
                      className="w-full justify-center"
                  >
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4"/>
                  </Button>
                </TableHead>
                <TableHead className="w-[14%] text-center">
                  <Button
                      variant="ghost"
                      onClick={() => sortQueues("messages")}
                      className="w-full justify-center"
                  >
                    Messages
                    <ArrowUpDown className="ml-2 h-4 w-4"/>
                  </Button>
                </TableHead>
                <TableHead className="w-[14%] text-center">
                  <Button
                      variant="ghost"
                      onClick={() => sortQueues("messages_ready")}
                      className="w-full justify-center"
                  >
                    Ready
                    <ArrowUpDown className="ml-2 h-4 w-4"/>
                  </Button>
                </TableHead>
                <TableHead className="w-[14%] text-center">
                  <Button
                      variant="ghost"
                      onClick={() => sortQueues("messages_unacknowledged")}
                      className="w-full justify-center"
                  >
                    Unacked
                    <ArrowUpDown className="ml-2 h-4 w-4"/>
                  </Button>
                </TableHead>
                <TableHead className="w-[14%] text-center">
                  <Button
                      variant="ghost"
                      onClick={() => sortQueues("consumers")}
                      className="w-full justify-center"
                  >
                    Consumers
                    <ArrowUpDown className="ml-2 h-4 w-4"/>
                  </Button>
                </TableHead>
                <TableHead className="w-[14%] text-center">
                  <Button
                      variant="ghost"
                      onClick={() => sortQueues("state")}
                      className="w-full justify-center"
                  >
                    State
                    <ArrowUpDown className="ml-2 h-4 w-4"/>
                  </Button>
                </TableHead>
                <TableHead className="w-[14%] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isInitialLoading ? (
                  Array.from({length: 5}).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-center">
                          <Skeleton className="h-4 w-[150px] mx-auto"/>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <Skeleton className="h-4 w-[60px]"/>
                            <Skeleton className="h-3 w-[40px] mt-1"/>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Skeleton className="h-4 w-[40px] mx-auto"/>
                        </TableCell>
                        <TableCell className="text-center">
                          <Skeleton className="h-4 w-[40px] mx-auto"/>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <Skeleton className="h-4 w-[30px]"/>
                            <Skeleton className="h-3 w-[50px] mt-1"/>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Skeleton className="h-2 w-2 rounded-full mr-2"/>
                            <Skeleton className="h-4 w-[60px]"/>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Skeleton className="h-8 w-8 rounded-full"/>
                          </div>
                        </TableCell>
                      </TableRow>
                  ))
              ) : (
                  displayQueues.map((queue) => (
                      <TableRow key={`${queue.vhost}/${queue.name}`}>
                        <TableCell className="font-medium text-center">
                          {queue.name}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span>{queue.messages.toLocaleString()}</span>
                            {queue.message_stats?.publish_details && (
                                <span className="text-xs text-muted-foreground">
                          {formatRate(queue.message_stats.publish_details.rate)}/s
                        </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {queue.messages_ready.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {queue.messages_unacknowledged.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span>{queue.consumers}</span>
                            {queue.consumer_utilisation !== undefined && (
                                <span className="text-xs text-muted-foreground">
                          {(queue.consumer_utilisation * 100).toFixed(1)}% util
                        </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                      <span
                          className={cn(
                              "flex h-2 w-2 rounded-full mr-2",
                              queue.state === "running"
                                  ? "bg-green-600"
                                  : "bg-yellow-600"
                          )}
                      />
                            {queue.state}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <QueueOperations queue={queue}/>
                          </div>
                        </TableCell>
                      </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
  )
}
