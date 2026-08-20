"use client"

import { useState } from "react"
import type { Overview } from "@/lib/rabbitmq/types"

const WINDOW_SEC = 120 // rolling live window

export interface LiveSeries {
  timestamps: number[]
  publishRates: number[]
  deliveryRates: number[]
  totalMessages: number[]
  readyMessages: number[]
  unackedMessages: number[]
}

function empty(): LiveSeries {
  return {
    timestamps: [],
    publishRates: [],
    deliveryRates: [],
    totalMessages: [],
    readyMessages: [],
    unackedMessages: [],
  }
}

function append(prev: LiveSeries, overview: Overview, fetchedAtMs: number): LiveSeries {
  const t = fetchedAtMs / 1000
  const cutoff = t - WINDOW_SEC - 5
  let trimIdx = 0
  while (trimIdx < prev.timestamps.length && prev.timestamps[trimIdx] < cutoff) trimIdx++

  const slice = (arr: number[]) => (trimIdx > 0 ? arr.slice(trimIdx) : [...arr])

  const next: LiveSeries = {
    timestamps: slice(prev.timestamps),
    publishRates: slice(prev.publishRates),
    deliveryRates: slice(prev.deliveryRates),
    totalMessages: slice(prev.totalMessages),
    readyMessages: slice(prev.readyMessages),
    unackedMessages: slice(prev.unackedMessages),
  }

  next.timestamps.push(t)
  next.publishRates.push(overview.message_stats?.publish_details?.rate ?? 0)
  next.deliveryRates.push(overview.message_stats?.deliver_get_details?.rate ?? 0)
  next.totalMessages.push(overview.queue_totals?.messages ?? 0)
  next.readyMessages.push(overview.queue_totals?.messages_ready ?? 0)
  next.unackedMessages.push(overview.queue_totals?.messages_unacknowledged ?? 0)
  return next
}

/**
 * Accumulates overview snapshots into a rolling client-side window for the
 * "Live" chart range. Each poll produces a new overview object, so object
 * identity marks exactly one append per poll; passing null (historical
 * mode) resets the window. State is adjusted during render per React's
 * "derive state from props" pattern — no effects involved.
 */
export function useLiveSeries(overview: Overview | null, fetchedAtMs: number | null): LiveSeries {
  const [series, setSeries] = useState<LiveSeries>(empty)
  const [prevOverview, setPrevOverview] = useState<Overview | null>(null)

  if (overview !== prevOverview) {
    setPrevOverview(overview)
    setSeries(overview && fetchedAtMs ? append(series, overview, fetchedAtMs) : empty())
  }

  return series
}
