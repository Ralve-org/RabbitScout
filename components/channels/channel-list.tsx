"use client"

import {useEffect, useState} from "react"
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table"
import {Button} from "@/components/ui/button"
import {API_ENDPOINTS, RabbitMQError} from "@/lib/utils"
import {useToast} from "@/hooks/use-toast"
import {ChannelListSkeleton} from "./channel-list-skeleton"
import {ArrowUpDown, MoreHorizontal, XCircle} from "lucide-react"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu"
import {ApiError} from "@/components/common/api-error"

interface MessageStats {
  publish?: number
  publish_details?: {
    rate: number
  }
  deliver_get?: number
  deliver_get_details?: {
    rate: number
  }
  confirm?: number
  confirm_details?: {
    rate: number
  }
  get?: number
  get_details?: {
    rate: number
  }
  deliver?: number
  deliver_details?: {
    rate: number
  }
  deliver_no_ack?: number
  deliver_no_ack_details?: {
    rate: number
  }
  redeliver?: number
  redeliver_details?: {
    rate: number
  }
  return_unroutable?: number
  return_unroutable_details?: {
    rate: number
  }
}

interface Channel {
  name: string
  number: number
  user: string
  connection_details: {
    name: string
    peer_host: string
    peer_port: number
    user: string
  }
  state: string
  prefetch_count: number
  messages_unacknowledged: number
  messages_unconfirmed: number
  messages_uncommitted: number
  acks_uncommitted: number
  consumer_count: number
  confirm: boolean
  transactional: boolean
  global_prefetch_count: number
  message_stats?: MessageStats
  idle_since?: string
  node: string
  vhost: string
}

type SortField = "name" | "connection" | "state" | "prefetch" | "messages" | "consumers" | "rate" | "user"
type SortOrder = "asc" | "desc"

export function ChannelList() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<RabbitMQError | null>(null)
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const {toast} = useToast()



  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.channels.list)
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(errorText)
        }
        const data = await response.json()
        setChannels(data)
        setError(null)
        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching channels:", err)
        setError({
          status: 503,
          message: 'Unable to connect to RabbitMQ server. Please check your connection settings.',
          type: 'CONNECTION',
          details: err instanceof Error ? err.message : String(err)
        })
        toast({
          variant: "destructive",
          title: "Error fetching channels",
          description: "Failed to connect to RabbitMQ server",
        })
      }
    }

    fetchChannels()
  }, [toast])

  const sortChannels = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const getSortedChannels = () => {
    return [...channels].sort((a, b) => {
      const multiplier = sortOrder === "asc" ? 1 : -1
      switch (sortField) {
        case "name":
          return multiplier * a.name.localeCompare(b.name)
        case "connection":
          return multiplier * a.connection_details.name.localeCompare(b.connection_details.name)
        case "state":
          return multiplier * a.state.localeCompare(b.state)
        case "prefetch":
          return multiplier * (a.prefetch_count - b.prefetch_count)
        case "messages":
          return multiplier * (a.messages_unacknowledged - b.messages_unacknowledged)
        case "consumers":
          return multiplier * (a.consumer_count - b.consumer_count)
        case "rate": {
          const rateA = a.message_stats?.publish_details?.rate ?? 0
          const rateB = b.message_stats?.publish_details?.rate ?? 0
          return multiplier * (rateA - rateB)
        }
        case "user":
          return multiplier * a.user.localeCompare(b.user)
        default:
          return 0
      }
    })
  }

  if (isLoading && !error) {
    return <ChannelListSkeleton/>
  }

  if (error) {
    return <ApiError error={error}>{null}</ApiError>
  }

  return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">
                <Button
                    variant="ghost"
                    onClick={() => sortChannels("name")}
                    className="w-full flex items-center justify-center gap-1"
                >
                  Channel
                  <ArrowUpDown className="ml-2 h-4 w-4"/>
                </Button>
              </TableHead>
              <TableHead className="w-[15%]">
                <Button
                    variant="ghost"
                    onClick={() => sortChannels("user")}
                    className="w-full flex items-center justify-center gap-1"
                >
                  User
                  <ArrowUpDown className="ml-2 h-4 w-4"/>
                </Button>
              </TableHead>
              <TableHead className="w-[15%]">
                <Button
                    variant="ghost"
                    onClick={() => sortChannels("state")}
                    className="w-full flex items-center justify-center gap-1"
                >
                  State
                  <ArrowUpDown className="ml-2 h-4 w-4"/>
                </Button>
              </TableHead>
              <TableHead className="w-[10%]">
                <Button
                    variant="ghost"
                    onClick={() => sortChannels("prefetch")}
                    className="w-full flex items-center justify-center gap-1"
                >
                  Prefetch
                  <ArrowUpDown className="ml-2 h-4 w-4"/>
                </Button>
              </TableHead>
              <TableHead className="w-[10%]">
                <Button
                    variant="ghost"
                    onClick={() => sortChannels("messages")}
                    className="w-full flex items-center justify-center gap-1"
                >
                  Unacked
                  <ArrowUpDown className="ml-2 h-4 w-4"/>
                </Button>
              </TableHead>
              <TableHead className="w-[10%]">
                <Button
                    variant="ghost"
                    onClick={() => sortChannels("consumers")}
                    className="w-full flex items-center justify-center gap-1"
                >
                  Consumers
                  <ArrowUpDown className="ml-2 h-4 w-4"/>
                </Button>
              </TableHead>
              <TableHead className="w-[10%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getSortedChannels().map((channel) => (
                <TableRow key={channel.name}>
                  <TableCell className="w-[30%]">
                    <div className="font-medium">#{channel.number}</div>
                    <div className="text-sm text-muted-foreground">
                      {channel.connection_details.name}
                    </div>
                  </TableCell>
                  <TableCell className="w-[15%]">
                    <div>{channel.user}</div>
                    <div className="text-sm text-muted-foreground">
                      {channel.vhost}
                    </div>
                  </TableCell>
                  <TableCell className="w-[15%]">
                    <div className="flex items-center justify-center">
                      {channel.state}
                    </div>
                  </TableCell>
                  <TableCell className="w-[10%]">
                    <div className="text-center">{channel.prefetch_count}</div>
                  </TableCell>
                  <TableCell className="w-[10%]">
                    <div className="text-center">{channel.messages_unacknowledged}</div>
                  </TableCell>
                  <TableCell className="w-[10%]">
                    <div className="text-center">{channel.consumer_count}</div>
                  </TableCell>
                  <TableCell className="w-[10%]">
                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4"/>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center">
                          <DropdownMenuItem
                              className="text-destructive cursor-not-allowed opacity-50"
                              disabled
                          >
                            <XCircle className="mr-2 h-4 w-4"/>
                            Close Channel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
  )
}
