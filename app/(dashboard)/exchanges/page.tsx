import { Suspense } from "react"
import { ExchangeTable } from "@/components/exchanges/exchange-table"
import { rabbitmqFetch } from "@/lib/rabbitmq/client"
import { ErrorCard } from "@/components/shared/error-card"
import { classifyError } from "@/lib/rabbitmq/errors"
import { Skeleton } from "@/components/ui/skeleton"
import type { Exchange } from "@/lib/rabbitmq/types"

export const dynamic = "force-dynamic"

async function ExchangesContent() {
  try {
    const exchanges = await rabbitmqFetch<Exchange[]>("exchanges")
    return <ExchangeTable initial={exchanges} />
  } catch (err) {
    const e = classifyError(err)
    return <ErrorCard message={e.message} type={e.type} details={e.details} />
  }
}

export default function ExchangesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Exchanges</h2>
        <p className="text-sm text-muted-foreground">View and inspect RabbitMQ exchanges and their bindings</p>
      </div>
      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
        <ExchangesContent />
      </Suspense>
    </div>
  )
}
