"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { usePreferences } from "@/lib/stores/preferences"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { sidebarCollapsed } = usePreferences()

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div
        className={cn(
          "transition-[margin-left] duration-200 ease-in-out",
          sidebarCollapsed ? "ml-16" : "ml-[220px]",
        )}
      >
        <Header />
        <main className="p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
