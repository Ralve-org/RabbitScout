"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { closeConnection } from "@/lib/utils"
import { MoreHorizontal, XCircle } from "lucide-react"

interface ConnectionOperationsProps {
  connection: {
    name: string
    client_properties?: {
      connection_name?: string
      product?: string
    }
  }
  onClose: () => void
}

export function ConnectionOperations({ connection, onClose }: ConnectionOperationsProps) {
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleClose = async () => {
    try {
      setIsLoading(true)
      await closeConnection(connection.name)
      onClose()
    } catch (error) {
      console.error("Failed to close connection:", error)
    } finally {
      setIsLoading(false)
      setCloseDialogOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onClick={() => setCloseDialogOpen(true)}
            className="text-destructive">
            <XCircle className="mr-2 h-4 w-4" />
            Close Connection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Connection</DialogTitle>
            <DialogDescription>
              <>
                Are you sure you want to close this connection?
                {connection.client_properties?.product && (` Client: ${connection.client_properties.product}`)}
                <div className="mt-1 text-sm font-mono">{connection.name}</div>
              </>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCloseDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={isLoading}
            >
              {isLoading ? "Closing..." : "Close Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
