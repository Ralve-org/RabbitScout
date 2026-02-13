import { Suspense } from "react"
import { ChannelTable } from "@/components/channels/channel-table"
import { rabbitmqFetch } from "@/lib/rabbitmq/client"
import { ErrorCard } from "@/components/shared/error-card"
import { classifyError } from "@/lib/rabbitmq/errors"
import { Skeleton } from "@/components/ui/skeleton"
import type { Channel } from "@/lib/rabbitmq/types"

export const dynamic = "force-dynamic"

async function ChannelsContent() {
  try {
    const channels = await rabbitmqFetch<Channel[]>("channels")
    return <ChannelTable initial={channels} />
  } catch (err) {
    const e = classifyError(err)
    return <ErrorCard message={e.message} type={e.type} details={e.details} />
  }
}

export default function ChannelsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Channels</h2>
        <p className="text-sm text-muted-foreground">View and manage active RabbitMQ channels</p>
      </div>
      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
        <ChannelsContent />
      </Suspense>
    </div>
  )
}
