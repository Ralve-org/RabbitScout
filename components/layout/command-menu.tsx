"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
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
 * ⌘K palette: page navigation, fuzzy jump-to-queue, and quick actions.
 * Queues are fetched lazily the first time the palette opens.
 */
export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()
  const { refreshInterval, setRefreshInterval } = usePreferences()
  const [queues, setQueues] = React.useState<Queue[] | null>(null)

  React.useEffect(() => {
    if (!open || queues !== null) return
    let cancelled = false
    fetch("/api/rabbitmq/queues")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setQueues(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setQueues([])
      })
    return () => {
      cancelled = true
    }
  }, [open, queues])

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
          <>
            <CommandSeparator />
            <CommandGroup heading="Queues">
              {queues.slice(0, 50).map((q) => (
                <CommandItem
                  key={`${q.vhost}/${q.name}`}
                  value={`queue ${q.name}`}
                  onSelect={() =>
                    run(() =>
                      router.push(
                        `/queues?q=${encodeURIComponent(q.name)}`,
                      ),
                    )
                  }
                >
                  <Layers />
                  <span className="truncate">{q.name}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground tnum">
                    {q.messages.toLocaleString()}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
