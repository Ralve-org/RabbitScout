import { Suspense } from "react"
import { QueueTable } from "@/components/queues/queue-table"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"

export default function QueuesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Queues</h2>
        <p className="text-sm text-muted-foreground">
          Create, inspect, and manage your RabbitMQ queues
        </p>
      </div>
      {/* Suspense boundary required: QueueTable reads useSearchParams */}
      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
        <QueueTable />
      </Suspense>
    </div>
  )
}
