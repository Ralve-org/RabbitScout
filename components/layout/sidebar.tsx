"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  ArrowRightLeft,
  Cable,
  LayoutDashboard,
  Layers,
  PanelLeft,
  PanelLeftClose,
  Radio,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePreferences } from "@/lib/stores/preferences"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { motion, AnimatePresence } from "motion/react"

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/queues", label: "Queues", icon: Layers },
  { href: "/exchanges", label: "Exchanges", icon: ArrowRightLeft },
  { href: "/connections", label: "Connections", icon: Cable },
  { href: "/channels", label: "Channels", icon: Radio },
]

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: (typeof navItems)[number]
  collapsed: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-(--duration-fast)",
        isActive
          ? "bg-primary/10 font-medium text-primary"
          : "text-sidebar-foreground hover:bg-accent/80 hover:text-foreground",
      )}
    >
      {isActive && (
        <motion.div
          layoutId="nav-active"
          className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      <item.icon className="h-4 w-4 shrink-0" />
      <AnimatePresence initial={false}>
        {!collapsed && (
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

  if (!collapsed) return link
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

export function SidebarContent({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <Image src="/images/logo.png" alt="RabbitScout" width={28} height={28} className="shrink-0" />
        <AnimatePresence initial={false}>
          {!collapsed && (
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
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>
    </>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = usePreferences()

  return (
    <motion.aside
      className="fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar lg:flex"
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
      transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
    >
      <SidebarContent collapsed={sidebarCollapsed} />

      {/* Footer: collapse toggle */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-accent hover:text-foreground"
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
      </div>
    </motion.aside>
  )
}
