"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Check,
  ChevronDown,
  Command as CommandIcon,
  Globe,
  LogOut,
  Menu,
  Moon,
  Pause,
  RefreshCw,
  ShieldCheck,
  Sun,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CommandMenu } from "@/components/layout/command-menu"
import { useAuth } from "@/lib/auth/store"
import {
  REFRESH_INTERVALS,
  useConnectionStatus,
  usePreferences,
} from "@/lib/stores/preferences"
import { usePolling } from "@/hooks/use-polling"
import { cn } from "@/lib/utils"
import type { VHost } from "@/lib/rabbitmq/types"

const PAGE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/queues": "Queues",
  "/exchanges": "Exchanges",
  "/connections": "Connections",
  "/channels": "Channels",
}

const STATUS_META = {
  connected: { label: "Connected", dot: "bg-success", pulse: false },
  degraded: { label: "Degraded", dot: "bg-warning", pulse: true },
  disconnected: { label: "Disconnected", dot: "bg-destructive", pulse: true },
  unknown: { label: "Connecting", dot: "bg-muted-foreground", pulse: false },
} as const

export function Header({ onMobileMenu }: { onMobileMenu?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()
  const { user, clearAuth, hydrate } = useAuth()
  const { refreshInterval, setRefreshInterval, vhost, setVhost } = usePreferences()
  const status = useConnectionStatus((s) => s.status)
  const [paletteOpen, setPaletteOpen] = React.useState(false)

  // Restore user info after hard reloads
  React.useEffect(() => {
    hydrate()
  }, [hydrate])

  // Global shortcut: ⌘K / Ctrl+K
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // VHost list refreshes slowly — it rarely changes
  const { data: vhosts } = usePolling<VHost[]>("/api/rabbitmq/vhosts", { interval: 60_000 })

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    clearAuth()
    router.push("/login")
  }

  const title = PAGE_TITLES[pathname] ?? "RabbitScout"
  const meta = STATUS_META[status]
  const currentInterval = REFRESH_INTERVALS.find((i) => i.value === refreshInterval)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md lg:px-6">
      {/* Mobile menu */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 lg:hidden"
        onClick={onMobileMenu}
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Open navigation</span>
      </Button>

      <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>

      {/* Broker status */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="hidden items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground sm:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              {meta.pulse && (
                <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", meta.dot)} />
              )}
              <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", meta.dot)} />
            </span>
            {meta.label}
          </span>
        </TooltipTrigger>
        <TooltipContent>Broker reachability, based on live polling</TooltipContent>
      </Tooltip>

      <div className="ml-auto flex items-center gap-1.5">
        {/* VHost scope */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hidden h-8 gap-1.5 px-2.5 text-xs text-muted-foreground md:inline-flex">
              <Globe className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate font-mono">{vhost ?? "All vhosts"}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuLabel>Virtual host</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setVhost(null)}>
              All vhosts
              {vhost === null && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            {(vhosts ?? []).map((v) => (
              <DropdownMenuItem key={v.name} onClick={() => setVhost(v.name)}>
                <span className="font-mono text-xs">{v.name}</span>
                {vhost === v.name && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Refresh cadence */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground">
              {refreshInterval === 0 ? (
                <>
                  <Pause className="h-3.5 w-3.5 text-warning" />
                  <span className="hidden sm:inline">Paused</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{currentInterval?.label ?? `${refreshInterval / 1000}s`}</span>
                </>
              )}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Refresh every</DropdownMenuLabel>
            {REFRESH_INTERVALS.map((opt) => (
              <DropdownMenuItem key={opt.value} onClick={() => setRefreshInterval(opt.value)}>
                {opt.label}
                {refreshInterval === opt.value && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Command palette */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground"
              onClick={() => setPaletteOpen(true)}
            >
              <CommandIcon className="h-3.5 w-3.5" />
              <kbd className="hidden rounded border bg-muted px-1 font-mono text-[10px] sm:inline">K</kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Command palette (Ctrl+K)</TooltipContent>
        </Tooltip>

        {/* Theme */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 scale-100 rotate-0 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <User className="h-4 w-4" />
              <span className="sr-only">Account</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuLabel className="flex items-center gap-2 font-normal">
              <span className="font-mono text-xs">{user?.username ?? "—"}</span>
              {user?.isAdmin && (
                <Badge variant="default" className="gap-0.5">
                  <ShieldCheck className="h-2.5 w-2.5" /> admin
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandMenu open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  )
}
