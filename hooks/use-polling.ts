"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { usePreferences, useConnectionStatus } from "@/lib/stores/preferences"

interface UsePollingOptions {
  /** Override the global cadence (ms). 0 disables polling (initial fetch still runs). */
  interval?: number
  /** Skip fetching entirely while false. */
  enabled?: boolean
}

interface UsePollingResult<T> {
  data: T | null
  error: string | null
  loading: boolean
  lastUpdated: number | null
  refresh: () => Promise<void>
}

/**
 * Central polling hook for live RabbitMQ data.
 *
 * - Cadence follows the user's global refresh preference unless overridden
 * - Pauses automatically while the tab is hidden, refreshes on return
 * - Skips ticks while a request is still in flight (no self-abort churn)
 * - Resets state when the target URL changes, so one target's payload is
 *   never rendered under another target's identity
 * - Feeds the header's broker-status indicator
 * - On auth expiry (401) clears the session and returns to the login page
 */
export function usePolling<T>(url: string | null, options: UsePollingOptions = {}): UsePollingResult<T> {
  const router = useRouter()
  const globalInterval = usePreferences((s) => s.refreshInterval)
  const reportSuccess = useConnectionStatus((s) => s.reportSuccess)
  const reportError = useConnectionStatus((s) => s.reportError)

  const interval = options.interval ?? globalInterval
  const enabled = options.enabled ?? true

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const inFlightRef = useRef(false)
  const urlRef = useRef(url)
  const redirectingRef = useRef(false)

  // React to target changes during render (React's derive-state pattern):
  // clear the previous target's payload immediately so consumers never
  // show stale rows under a new identity.
  const [prevUrl, setPrevUrl] = useState<string | null>(url)
  if (url !== prevUrl) {
    setPrevUrl(url)
    setData(null)
    setError(null)
    setLastUpdated(null)
    setLoading(Boolean(url && enabled))
  }

  // Idle (no target): report not-loading without an effect
  if ((!enabled || !url) && loading) setLoading(false)

  const fetchOnce = useCallback(async () => {
    const target = urlRef.current
    if (!target || inFlightRef.current || redirectingRef.current) return

    inFlightRef.current = true
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(target, { signal: controller.signal })
      if (controller.signal.aborted) return

      if (res.status === 401) {
        // Session expired. Clear the dead cookie first — otherwise the
        // auth gate sees a cookie and bounces /login straight back.
        redirectingRef.current = true
        setError("Session expired")
        fetch("/api/auth/logout", { method: "POST" })
          .catch(() => {})
          .finally(() => router.push("/login"))
        return
      }

      if (!res.ok) {
        let message = `Request failed (${res.status})`
        try {
          const body = await res.json()
          if (body?.error) message = body.error
        } catch {
          // Non-JSON error body
        }
        setError(message)
        reportError()
        return
      }

      const json = (await res.json()) as T
      if (controller.signal.aborted) return
      setData(json)
      setError(null)
      setLastUpdated(Date.now())
      reportSuccess()
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setError("Unable to reach the server")
      reportError()
    } finally {
      inFlightRef.current = false
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [router, reportSuccess, reportError])

  useEffect(() => {
    urlRef.current = url
    if (!enabled || !url) return

    // Initial fetch is scheduled, not run in the effect body — state
    // updates then always happen from task callbacks.
    const kickoff = setTimeout(fetchOnce, 0)

    let id: ReturnType<typeof setInterval> | null = null
    if (interval > 0) {
      id = setInterval(() => {
        if (!document.hidden) fetchOnce()
      }, interval)
    }

    // Refresh immediately when the tab becomes visible again
    const onVisible = () => {
      if (!document.hidden) fetchOnce()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      clearTimeout(kickoff)
      if (id) clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
      abortRef.current?.abort()
      inFlightRef.current = false
    }
  }, [url, interval, enabled, fetchOnce])

  return { data, error, loading, lastUpdated, refresh: fetchOnce }
}
