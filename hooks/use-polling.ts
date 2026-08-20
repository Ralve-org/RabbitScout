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
 * - Aborts in-flight requests on unmount and between navigations
 * - Feeds the header's broker-status indicator
 * - On auth expiry (401) redirects to the login page
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
  const urlRef = useRef(url)

  // Idle (no target): report not-loading without an effect
  if ((!enabled || !url) && loading) setLoading(false)

  const fetchOnce = useCallback(async () => {
    const target = urlRef.current
    if (!target) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(target, { signal: controller.signal })
      if (controller.signal.aborted) return

      if (res.status === 401) {
        router.push("/login")
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
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [router, reportSuccess, reportError])

  useEffect(() => {
    urlRef.current = url
    if (!enabled || !url) return

    fetchOnce()

    if (interval <= 0) return

    let id: ReturnType<typeof setInterval> | null = setInterval(() => {
      if (!document.hidden) fetchOnce()
    }, interval)

    // Refresh immediately when the tab becomes visible again
    const onVisible = () => {
      if (!document.hidden) fetchOnce()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      if (id) clearInterval(id)
      id = null
      document.removeEventListener("visibilitychange", onVisible)
      abortRef.current?.abort()
    }
  }, [url, interval, enabled, fetchOnce])

  return { data, error, loading, lastUpdated, refresh: fetchOnce }
}
