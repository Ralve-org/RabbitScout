"use client"

import { useRouter } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { MainNav } from "./main-nav"
import { RefreshToggle } from "@/components/refresh-toggle"
import {MaxNrOfMessagesToggle} from "@/components/max-nr-of-messages-toggle";

export function Header() {
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center px-16">
        <MainNav />
        <div className="ml-auto flex items-center gap-2">
          <MaxNrOfMessagesToggle />
          <RefreshToggle />
          <ModeToggle />
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
