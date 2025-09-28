"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Binding {
  source: string
  destination: string
  destination_type: string
  routing_key: string
  arguments: Record<string, any>
}

interface BindingViewerProps {
  bindings: Binding[]
  open: boolean
  onOpenChange: (open: boolean) => void
  exchangeName: string
}

export function BindingViewer({
  bindings,
  open,
  onOpenChange,
  exchangeName,
}: Readonly<BindingViewerProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Exchange Bindings</DialogTitle>
          <DialogDescription>
            Viewing bindings for exchange &#34;{exchangeName}&#34;
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destination</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Routing Key</TableHead>
                <TableHead>Arguments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bindings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    No bindings found for this exchange
                  </TableCell>
                </TableRow>
              ) : (
                bindings.map((binding, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {binding.destination}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{binding.destination_type}</span>
                    </TableCell>
                    <TableCell>
                      {binding.routing_key || (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {Object.keys(binding.arguments).length > 0 ? (
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[100px]">
                          {JSON.stringify(binding.arguments, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
