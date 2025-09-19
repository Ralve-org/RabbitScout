"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {useMaxNrOfMessagesStore} from "@/lib/store"
import {Rows4} from "lucide-react"

const refreshOptions = [
  { value: 50, label: "max 50 messages" },
  { value: 100, label: "max 100 messages" },
  { value: 200, label: "max 200 messages" },
  { value: 500, label: "max 500 messages" },
  { value: 1000, label: "max 1000 messages" },
]

export function MaxNrOfMessagesToggle() {
  const { maxNrOfMessages, setMaxNrOfMessages } = useMaxNrOfMessagesStore()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Rows4 className="h-[1.2rem] w-[1.2rem] transition-all" />
          <span className="sr-only">Set maximum number of messages to retrieve from queue</span>
          {maxNrOfMessages > 0 && (
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {maxNrOfMessages}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {refreshOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setMaxNrOfMessages(option.value)}
          >
            <span className={maxNrOfMessages === option.value ? "font-bold" : ""}>
              {option.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
