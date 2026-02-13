"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Binding } from "@/lib/rabbitmq/types"

interface BindingViewerProps {
  bindings: Binding[]
  open: boolean
  onOpenChange: (open: boolean) => void
  exchangeName: string
}

export function BindingViewer({ bindings, open, onOpenChange, exchangeName }: BindingViewerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            Bindings for <span className="font-mono">{exchangeName || "(default)"}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="text-xs">Destination</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Routing Key</TableHead>
                <TableHead className="text-xs">Arguments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bindings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                    No bindings found
                  </TableCell>
                </TableRow>
              ) : bindings.map((b, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-sm">{b.destination}</TableCell>
                  <TableCell className="text-sm capitalize">{b.destination_type}</TableCell>
                  <TableCell className="font-mono text-xs">{b.routing_key || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {b.arguments && Object.keys(b.arguments).length > 0 ? (
                      <pre className="text-xs font-mono bg-muted/50 p-1.5 rounded overflow-auto max-h-16">
                        {JSON.stringify(b.arguments, null, 2)}
                      </pre>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
