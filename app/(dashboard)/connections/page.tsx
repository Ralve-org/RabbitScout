import { ConnectionTable } from "@/components/connections/connection-table"

export const dynamic = "force-dynamic"

export default function ConnectionsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Connections</h2>
        <p className="text-sm text-muted-foreground">
          Monitor and manage active RabbitMQ connections
        </p>
      </div>
      <ConnectionTable />
    </div>
  )
}
