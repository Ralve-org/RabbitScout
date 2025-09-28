"use client"

import { useState, useEffect } from "react"
import { ConnectionOperations } from "./connection-operations"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatBytes, formatRate, API_ENDPOINTS, RabbitMQError} from "@/lib/utils"
import {ArrowUpDown, Unplug} from "lucide-react"
import {Button} from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ConnectionListSkeleton } from "./connection-list-skeleton"

interface Connection {
  name: string
  user: string
  vhost: string
  host: string
  port: number
  peer_host: string
  peer_port: number
  ssl: boolean
  protocol: string
  auth_mechanism: string
  state: string
  connected_at: number
  timeout: number
  frame_max: number
  channel_max: number
  client_properties: {
    platform?: string
    product?: string
    version?: string
    information?: string
  }
  recv_oct: number
  recv_oct_details: {
    rate: number
  }
  send_oct: number
  send_oct_details: {
    rate: number
  }
  recv_cnt: number
  send_cnt: number
  send_pend: number
  channels: number
  ssl_protocol?: string
  ssl_key_exchange?: string
  ssl_cipher?: string
  ssl_hash?: string
}

type SortField = keyof Connection
type SortOrder = "asc" | "desc"

export function ConnectionList({ connections: initialConnections }: Readonly<{ connections?: Connection[] }>) {
  const [connections, setConnections] = useState<Connection[]>(initialConnections || [])
  const [isLoading, setIsLoading] = useState(!initialConnections)
  const [error, setError] = useState<RabbitMQError | null>(null)
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const { toast } = useToast()


  const fetchConnections = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.connections.list)
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText)
      }
      const data = await response.json()
      setConnections(data)
      setError(null)
      setIsLoading(false)
    } catch (err) {
      console.error("Error fetching connections:", err)
      setError({
        status: 503,
        message: 'Unable to connect to RabbitMQ server. Please check your connection settings.',
        type: 'CONNECTION',
        details: err instanceof Error ? err.message : String(err)
      })
      toast({
        variant: "destructive",
        title: "Error fetching connections",
        description: "Failed to connect to RabbitMQ server",
      })
    }
  }

  useEffect(() => {
    if (!initialConnections) {
      fetchConnections()
    }
  }, [fetchConnections, initialConnections])

  const sortConnections = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }

    const sortedConnections = [...connections].sort((a, b) => {
      const aValue = a[field]
      const bValue = b[field]

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortOrder === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })

    setConnections(sortedConnections)
  }

  const handleSort = (field: SortField) => {
    sortConnections(field)
  }

  const handleClose = () => {
    fetchConnections()
  }

  if (isLoading) {
    return <ConnectionListSkeleton />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[12.5%]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('name')}
                  className="w-full flex items-center justify-center gap-1"
                >
                  Client <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[12.5%]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('user')}
                  className="w-full flex items-center justify-center gap-1"
                >
                  User <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[12.5%]">VHost</TableHead>
              <TableHead className="w-[12.5%]">Protocol</TableHead>
              <TableHead className="w-[12.5%]">SSL/TLS</TableHead>
              <TableHead className="w-[12.5%]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('channels')}
                  className="w-full flex items-center justify-center gap-1"
                >
                  Channels <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[12.5%]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('recv_oct')}
                  className="w-full flex items-center justify-center gap-1"
                >
                  Throughput <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[12.5%]">
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-center gap-1">
                  Actions
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Unplug className="h-12 w-12" />
                    <h3 className="font-semibold">No Active Connections</h3>
                    <p className="text-sm">There are currently no active connections to the RabbitMQ server.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
                connections.map((connection) => (
                <TableRow key={connection.name}>
                  <TableCell className="w-[12.5%] font-medium">
                    {connection.client_properties?.product || "Unknown Client"}
                    <div className="text-xs text-muted-foreground">
                      {connection.name}
                    </div>
                  </TableCell>
                  <TableCell className="w-[12.5%]">
                    {connection.user}
                    <div className="text-xs text-muted-foreground">
                      {connection.auth_mechanism}
                    </div>
                  </TableCell>
                  <TableCell className="w-[12.5%]">{connection.vhost}</TableCell>
                  <TableCell className="w-[12.5%]">
                    {connection.protocol}
                    <div className="text-xs text-muted-foreground">
                      {connection.client_properties?.platform}
                    </div>
                  </TableCell>
                  <TableCell className="w-[12.5%]">
                    {connection.ssl ? (
                      <div className="flex items-center justify-center">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span>Yes</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                          <span>No</span>
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-[12.5%]">{connection.channels}</TableCell>
                  <TableCell className="w-[12.5%]">
                    <div>
                      ↓ {formatBytes(connection.recv_oct)}
                      <div className="text-xs text-muted-foreground">
                        {connection.recv_oct_details?.rate ? formatRate(connection.recv_oct_details.rate) : 0} /s
                      </div>
                    </div>
                    <div>
                      ↑ {formatBytes(connection.send_oct)}
                      <div className="text-xs text-muted-foreground">
                        {connection.send_oct_details?.rate ? formatRate(connection.send_oct_details.rate) : 0} /s
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="w-[12.5%]">
                    <div className="flex justify-center">
                      <ConnectionOperations connection={connection} onClose={handleClose} />
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
