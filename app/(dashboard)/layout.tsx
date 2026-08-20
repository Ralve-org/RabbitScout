"use client"

import * as React from "react"
import { Sidebar, SidebarContent } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { usePreferences } from "@/lib/stores/preferences"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { sidebarCollapsed } = usePreferences()
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen">
        <Sidebar />

        {/* Mobile navigation drawer */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[240px] bg-sidebar p-0 sm:max-w-[240px]">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-full flex-col">
              <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <div
          className={cn(
            "transition-[margin-left] duration-200 ease-in-out",
            sidebarCollapsed ? "lg:ml-16" : "lg:ml-[220px]",
          )}
        >
          <Header onMobileMenu={() => setMobileNavOpen(true)} />
          <main className="p-4 lg:p-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
