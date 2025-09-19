"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function MainNav() {
  const pathname = usePathname()

  const routes = [
    {
      href: "/",
      label: "Overview",
      active: pathname === "/",
    },
    {
      href: "/queues",
      label: "Queues",
      active: pathname === "/queues",
    },
    {
      href: "/exchanges",
      label: "Exchanges",
      active: pathname === "/exchanges",
    },
    {
      href: "/connections",
      label: "Connections",
      active: pathname === "/connections",
    },
    {
      href: "/channels",
      label: "Channels",
      active: pathname === "/channels",
    },
  ]

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {routes.map((route) => (
        <Button
          key={route.href}
          variant="ghost"
          asChild
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            route.active
              ? "dark:text-white"
              : "text-muted-foreground"
          )}
        >
          <Link href={route.href}>{route.label}</Link>
        </Button>
      ))}
    </nav>
  )
}
