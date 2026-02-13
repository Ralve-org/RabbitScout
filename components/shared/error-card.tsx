"use client"

import { AlertTriangle, RefreshCw, WifiOff, ShieldAlert, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ErrorType } from "@/lib/rabbitmq/errors"

interface ErrorCardProps {
  title?: string
  message: string
  type?: ErrorType
  details?: string
  onRetry?: () => void
}

const errorIcons: Record<ErrorType, React.ReactNode> = {
  CONNECTION: <WifiOff className="h-5 w-5" />,
  AUTH: <ShieldAlert className="h-5 w-5" />,
  TIMEOUT: <Clock className="h-5 w-5" />,
  API: <AlertTriangle className="h-5 w-5" />,
  UNKNOWN: <AlertTriangle className="h-5 w-5" />,
}

const errorHints: Record<ErrorType, string[]> = {
  CONNECTION: [
    "Check if the RabbitMQ server is running",
    "Verify RABBITMQ_HOST and RABBITMQ_PORT in your environment",
    "Ensure no firewall is blocking the connection",
  ],
  AUTH: [
    "Your session may have expired — try logging in again",
    "Verify the account has management permissions in RabbitMQ",
  ],
  TIMEOUT: [
    "The server is taking too long to respond",
    "Check if RabbitMQ is under heavy load",
  ],
  API: [
    "The RabbitMQ API returned an unexpected error",
    "Check the server logs for more details",
  ],
  UNKNOWN: [
    "An unexpected error occurred",
    "Try refreshing the page",
  ],
}

export function ErrorCard({ title, message, type = "UNKNOWN", details, onRetry }: ErrorCardProps) {
  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive">
          {errorIcons[type]}
          <span className="text-base">{title || "Something went wrong"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{message}</p>

        <ul className="space-y-1">
          {errorHints[type].map((hint, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
              {hint}
            </li>
          ))}
        </ul>

        {details && (
          <pre className="rounded-md bg-muted p-2 text-xs font-mono text-muted-foreground overflow-auto max-h-20">
            {details}
          </pre>
        )}

        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
