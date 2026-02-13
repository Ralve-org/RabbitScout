"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Layers,
  ArrowRightLeft,
  Cable,
  Radio,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth/store"
import { usePreferences } from "@/lib/stores/preferences"
import { motion, AnimatePresence } from "motion/react"

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/queues", label: "Queues", icon: Layers },
  { href: "/exchanges", label: "Exchanges", icon: ArrowRightLeft },
  { href: "/connections", label: "Connections", icon: Cable },
  { href: "/channels", label: "Channels", icon: Radio },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth } = useAuth()
  const { sidebarCollapsed, toggleSidebar } = usePreferences()

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    clearAuth()
    router.push("/login")
  }

  return (
    <motion.aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))]",
        "transition-[width] duration-200 ease-in-out",
      )}
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-[hsl(var(--sidebar-border))] px-4">
        <Image
          src="/images/logo.png"
          alt="RabbitScout"
          width={28}
          height={28}
          className="shrink-0"
        />
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap text-sm font-semibold tracking-tight"
            >
              Rabbit<span className="text-primary">Scout</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-[hsl(var(--sidebar-foreground))] hover:bg-accent/80 hover:text-foreground hover:translate-x-0.5",
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon className="h-4 w-4 shrink-0" />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[hsl(var(--sidebar-border))] p-2 space-y-1">
        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-[hsl(var(--sidebar-foreground))] transition-colors hover:bg-accent hover:text-foreground"
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span className="overflow-hidden whitespace-nowrap">Collapse</span>
            </>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-[hsl(var(--sidebar-foreground))] transition-colors hover:bg-destructive/10 hover:text-destructive"
          title={sidebarCollapsed ? `Logout (${user?.username})` : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}
