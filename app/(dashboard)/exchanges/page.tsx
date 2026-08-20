import { ExchangeTable } from "@/components/exchanges/exchange-table"

export const dynamic = "force-dynamic"

export default function ExchangesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Exchanges</h2>
        <p className="text-sm text-muted-foreground">
          Declare exchanges, inspect bindings, and route messages
        </p>
      </div>
      <ExchangeTable />
    </div>
  )
}
