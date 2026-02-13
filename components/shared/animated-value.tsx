"use client"

import { useEffect, useRef } from "react"
import { useMotionValue, useSpring, useTransform } from "motion/react"

interface AnimatedValueProps {
  value: number
  format?: (n: number) => string
  className?: string
}

/**
 * Displays a number that smoothly animates between values using spring physics.
 * When the underlying value changes (e.g. 1234 -> 1267), the displayed number
 * rolls up/down over ~300ms with natural deceleration.
 */
export function AnimatedValue({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  className,
}: AnimatedValueProps) {
  const motionValue = useMotionValue(value)
  const spring = useSpring(motionValue, { stiffness: 120, damping: 25, mass: 0.5 })
  const display = useTransform(spring, (v) => format(v))
  const ref = useRef<HTMLSpanElement>(null)

  // Update the motion value whenever the target changes
  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  // Subscribe to the display transform and write to DOM directly
  // (avoids React re-renders for every animation frame)
  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v
    })
    return unsubscribe
  }, [display])

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  )
}
