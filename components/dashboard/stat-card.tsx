"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AnimatedValue } from "@/components/shared/animated-value"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: number
  format?: (n: number) => string
  subtitle?: string
  icon: LucideIcon
}

export function StatCard({ title, value, format, subtitle, icon: Icon }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden card-hover glow-primary">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">
              {title}
            </p>
            <AnimatedValue
              value={value}
              format={format}
              className="block text-2xl font-semibold tracking-tight font-mono tabular-nums"
            />
            {subtitle && (
              <p className="text-[11px] text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 text-primary ring-1 ring-primary/10">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
