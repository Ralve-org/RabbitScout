"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth/store"
import { motion } from "motion/react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAuth } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const username = form.get("username") as string
    const password = form.get("password") as string

    if (!username || !password) {
      setError("Both fields are required")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Authentication failed")
        return
      }

      if (data.authenticated && data.user) {
        setAuth(data.user)
        // Return to the page the user originally asked for
        const next = searchParams.get("next")
        router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/")
        router.refresh()
      } else {
        setError("Invalid response from server")
      }
    } catch {
      setError("Unable to connect. Check your network and RabbitMQ configuration.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-background" />
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.04] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-primary/[0.03] blur-[80px]" />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 w-full max-w-[320px]"
      >
        {/* Logo + branding */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <Image src="/images/logo.png" alt="RabbitScout" width={48} height={48} priority />
              <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-primary/10 blur-xl" />
            </div>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            Rabbit<span className="text-primary">Scout</span>
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Sign in with your RabbitMQ credentials
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs font-medium text-muted-foreground">
              Username
            </Label>
            <Input
              id="username"
              name="username"
              placeholder="guest"
              autoComplete="username"
              autoFocus
              disabled={loading}
              className="h-10 border-transparent bg-secondary/50 transition-all focus:border-border focus:bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                className="h-10 border-transparent bg-secondary/50 pr-10 transition-all focus:border-border focus:bg-background"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
            >
              {error}
            </motion.div>
          )}

          <Button type="submit" className="h-10 w-full font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting…
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </motion.form>

        <motion.p
          className="mt-6 text-center text-[11px] text-muted-foreground/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Credentials are validated directly against your RabbitMQ instance
        </motion.p>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
