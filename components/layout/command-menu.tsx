"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useCommandState } from "cmdk"
import {
  ArrowRightLeft,
  Cable,
  Layers,
  LayoutDashboard,
  Moon,
  Pause,
  Play,
  Radio,
  Sun,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { usePreferences } from "@/lib/stores/preferences"
import type { Queue } from "@/lib/rabbitmq/types"

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Renders queue results filtered against the palette query BEFORE
 * truncating, so any queue on the broker is reachable by typing its
 * name — not just the first 50 of the raw list.
 */
function QueueResults({
  queues,
  onSelect,
}: {
  queues: Queue[]
  onSelect: (q: Queue) => void
}) {
  const search = useCommandState((s) => s.search)

  const matches = React.useMemo(() => {
    if (!search) return queues.slice(0, 20)
    const q = search.toLowerCase()
    return queues.filter((x) => x.name.toLowerCase().includes(q)).slice(0, 50)
  }, [queues, search])

  if (matches.length === 0) return null
  return (
    <>
      <CommandSeparator />
      <CommandGroup heading="Queues">
        {matches.map((q) => (
          <CommandItem
            key={`${q.vhost}/${q.name}`}
            value={`queue ${q.vhost} ${q.name}`}
            onSelect={() => onSelect(q)}
          >
            <Layers />
            <span className="truncate">{q.name}</span>
            <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground tnum">
              {(q.messages ?? 0).toLocaleString()}
            </span>
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  )
}

/**
 * ⌘K palette: page navigation, fuzzy jump-to-queue, and quick actions.
 * The queue list refreshes each time the palette opens (stale results
 * stay rendered while the refetch is in flight).
 */
export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()
  const { refreshInterval, setRefreshInterval, setVhost } = usePreferences()
  const [queues, setQueues] = React.useState<Queue[] | null>(null)

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch("/api/rabbitmq/queues")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data)) setQueues(data)
        else setQueues((prev) => prev ?? [])
      })
      .catch(() => {
        if (!cancelled) setQueues((prev) => prev ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const run = React.useCallback(
    (fn: () => void) => {
      onOpenChange(false)
      fn()
    },
    [onOpenChange],
  )

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, queues, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => run(() => router.push("/"))}>
            <LayoutDashboard /> Overview
            <CommandShortcut>G O</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/queues"))}>
            <Layers /> Queues
            <CommandShortcut>G Q</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/exchanges"))}>
            <ArrowRightLeft /> Exchanges
            <CommandShortcut>G E</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/connections"))}>
            <Cable /> Connections
            <CommandShortcut>G C</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/channels"))}>
            <Radio /> Channels
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}
          >
            {resolvedTheme === "dark" ? <Sun /> : <Moon />}
            Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
          </CommandItem>
          {refreshInterval === 0 ? (
            <CommandItem onSelect={() => run(() => setRefreshInterval(5000))}>
              <Play /> Resume live updates
            </CommandItem>
          ) : (
            <CommandItem onSelect={() => run(() => setRefreshInterval(0))}>
              <Pause /> Pause live updates
            </CommandItem>
          )}
        </CommandGroup>

        {queues && queues.length > 0 && (
          <QueueResults
            queues={queues}
            onSelect={(q) =>
              run(() => {
                // Align the global scope so the jumped-to queue is visible
                setVhost(q.vhost)
                router.push(`/queues?q=${encodeURIComponent(q.name)}`)
              })
            }
          />
        )}
      </CommandList>
    </CommandDialog>
  )
}
