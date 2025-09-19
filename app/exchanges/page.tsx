import { Suspense } from "react"
import { ExchangeList } from "@/components/exchanges/exchange-list"
import { ExchangeListSkeleton } from "@/components/exchanges/exchange-list-skeleton"
import { ApiError } from "@/components/common/api-error"
import { getRabbitMQAuthHeaders, getRabbitMQBaseUrl } from "@/lib/config"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function ExchangesPage() {
  try {
    const baseUrl = getRabbitMQBaseUrl()
    const url = `${baseUrl}/api/exchanges`
    
    const response = await fetch(url, {
      headers: getRabbitMQAuthHeaders(),
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`RabbitMQ API error: ${response.statusText}`)
    }

    const exchanges = await response.json()
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Exchanges</h2>
            <p className="text-muted-foreground">
              Manage and monitor RabbitMQ exchanges
            </p>
          </div>
        </div>
        <ExchangeList exchanges={exchanges} />
      </div>
    )
  } catch (error: any) {
    console.error("[ExchangesPage] Error:", error)
    return <ApiError error={error} />
  }
}

export default function Page() {
  return (
    <Suspense fallback={<ExchangeListSkeleton />}>
      <ExchangesPage />
    </Suspense>
  )
}
