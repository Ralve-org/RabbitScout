"use client"

import {useState} from "react"
import {BindingViewer} from "@/components/exchanges/binding-viewer"
import {Button} from "@/components/ui/button"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu"
import {getBindings, getExchange} from "@/lib/utils"
import {Link2, MoreHorizontal} from "lucide-react"

interface ExchangeOperationsProps {
  exchange: {
    name: string
    vhost: string
  }
}

export function ExchangeOperations({exchange}: Readonly<ExchangeOperationsProps>) {
  const [bindingViewerOpen, setBindingViewerOpen] = useState(false)
  const [bindings, setBindings] = useState<any[]>([])

  const onViewBindings = async () => {
    try {
      const fetchedExchanges = await getExchange(exchange.vhost, exchange.name);
      for (const binding of fetchedExchanges) {
        const fetchedBinding = await getBindings(exchange.vhost, exchange.name, binding.destination_type.charAt(0), binding.destination);
        setBindings(prevBindings => [...prevBindings, ...fetchedBinding])
      }
      setBindingViewerOpen(true)
    } catch (error) {
      console.error("Failed to fetch bindings:", error)
    }
  }

  return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4"/>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewBindings}>
              <Link2 className="mr-2 h-4 w-4"/>
              View Bindings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <BindingViewer
            bindings={bindings}
            open={bindingViewerOpen}
            onOpenChange={setBindingViewerOpen}
            exchangeName={exchange.name}
        />
      </>
  )
}
