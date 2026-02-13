import { Suspense } from "react"
import { ConnectionTable } from "@/components/connections/connection-table"
import { rabbitmqFetch } from "@/lib/rabbitmq/client"
import { ErrorCard } from "@/components/shared/error-card"
import { classifyError } from "@/lib/rabbitmq/errors"
import { Skeleton } from "@/components/ui/skeleton"
import type { Connection } from "@/lib/rabbitmq/types"

export const dynamic = "force-dynamic"

async function ConnectionsContent() {
  try {
    const connections = await rabbitmqFetch<Connection[]>("connections")
    return <ConnectionTable initial={connections} />
  } catch (err) {
    const e = classifyError(err)
    return <ErrorCard message={e.message} type={e.type} details={e.details} />
  }
}

export default function ConnectionsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Connections</h2>
        <p className="text-sm text-muted-foreground">Monitor and manage active RabbitMQ connections</p>
      </div>
      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
        <ConnectionsContent />
      </Suspense>
    </div>
  )
}
