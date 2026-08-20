import { ChannelTable } from "@/components/channels/channel-table"

export const dynamic = "force-dynamic"

export default function ChannelsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Channels</h2>
        <p className="text-sm text-muted-foreground">
          View channel state, prefetch, and consumer activity
        </p>
      </div>
      <ChannelTable />
    </div>
  )
}
