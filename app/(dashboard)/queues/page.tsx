import { Suspense } from "react"
import { QueueTable } from "@/components/queues/queue-table"
import { rabbitmqFetch } from "@/lib/rabbitmq/client"
import { ErrorCard } from "@/components/shared/error-card"
import { classifyError } from "@/lib/rabbitmq/errors"
import { Skeleton } from "@/components/ui/skeleton"
import type { Queue } from "@/lib/rabbitmq/types"

export const dynamic = "force-dynamic"

async function QueuesContent() {
  try {
    const queues = await rabbitmqFetch<Queue[]>("queues")
    return <QueueTable initial={queues} />
  } catch (err) {
    const e = classifyError(err)
    return <ErrorCard message={e.message} type={e.type} details={e.details} />
  }
}

export default function QueuesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Queues</h2>
        <p className="text-sm text-muted-foreground">Manage and monitor your RabbitMQ queues</p>
      </div>
      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
        <QueuesContent />
      </Suspense>
    </div>
  )
}
