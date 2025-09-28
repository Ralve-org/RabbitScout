"use client"

import { useState } from "react"
import { ExchangeOperations } from "@/components/exchanges/exchange-operations"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatRate, ExchangeStats } from "@/lib/utils"
import { ArrowUpDown } from "lucide-react"

interface Exchange extends ExchangeStats {
  name: string
  vhost: string
  type: string
  durable: boolean
  auto_delete: boolean
  internal: boolean
  arguments: Record<string, any>
}

interface ExchangeListProps {
  exchanges: Exchange[]
}

type SortField = keyof Exchange
type SortOrder = "asc" | "desc"

export function ExchangeList({ exchanges: initialExchanges }: Readonly<ExchangeListProps>) {
  const [exchanges, setExchanges] = useState(initialExchanges)
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")

  const sortExchanges = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }

    const sortedExchanges = [...exchanges].sort((a, b) => {
      const aValue = a[field]
      const bValue = b[field]

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

    setExchanges(sortedExchanges)
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => sortExchanges(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[20%] text-center">
              <SortButton field="name">Name</SortButton>
            </TableHead>
            <TableHead className="w-[20%] text-center">
              <SortButton field="type">Type</SortButton>
            </TableHead>
            <TableHead className="w-[20%] text-center">Features</TableHead>
            <TableHead className="w-[20%] text-center">Message Rate</TableHead>
            <TableHead className="w-[20%] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exchanges.map((exchange) => (
            <TableRow key={`${exchange.vhost}/${exchange.name}`}>
              <TableCell className="text-center font-medium">
                {exchange.name === "" ? (
                  <span className="flex justify-center items-center gap-2">
                    <span className="text-muted-foreground">(Default Exchange)</span>
                  </span>
                ) : (
                  exchange.name
                )}
              </TableCell>
              <TableCell className="text-center">{exchange.type}</TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-2">
                  {exchange.durable && (
                    <span className="rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-800/30 dark:text-blue-500">
                      Durable
                    </span>
                  )}
                  {exchange.auto_delete && (
                    <span className="rounded-md bg-yellow-100 px-2 py-1 text-xs text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-500">
                      Auto-delete
                    </span>
                  )}
                  {exchange.internal && (
                    <span className="rounded-md bg-red-100 px-2 py-1 text-xs text-red-800 dark:bg-red-800/30 dark:text-red-500">
                      Internal
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                {exchange.message_stats ? (
                  <div className="flex flex-col items-center">
                    <div>
                      In: {formatRate(exchange.message_stats.publish_in_details?.rate || 0)}/s
                    </div>
                    <div>
                      Out: {formatRate(exchange.message_stats.publish_out_details?.rate || 0)}/s
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">No messages</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center">
                  <ExchangeOperations exchange={exchange} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
