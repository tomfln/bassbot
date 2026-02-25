"use client"

import { useState, useEffect, useRef, useCallback } from "react"

/**
 * Returns an optimistically interpolated position (ms) that ticks
 * forward on the client between server syncs when not paused.
 *
 * Uses a generation counter derived from serverPosition + trackLength
 * to correctly detect track changes even when both values reset to 0.
 */
export function useOptimisticPosition(
  serverPosition: number,
  trackLength: number,
  paused: boolean,
): number {
  const [position, setPosition] = useState(serverPosition)
  const prevServerRef = useRef(serverPosition)
  const prevLengthRef = useRef(trackLength)
  const rafRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)

  // Detect server value changes (position OR track length changed → new data)
  if (
    serverPosition !== prevServerRef.current ||
    trackLength !== prevLengthRef.current
  ) {
    prevServerRef.current = serverPosition
    prevLengthRef.current = trackLength
    lastFrameRef.current = 0 // Reset frame timing on server sync
    setPosition(serverPosition)
  }

  const tick = useCallback(
    (now: number) => {
      if (lastFrameRef.current === 0) {
        lastFrameRef.current = now
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const delta = now - lastFrameRef.current
      lastFrameRef.current = now
      setPosition((prev) => Math.min(prev + delta, trackLength))
      rafRef.current = requestAnimationFrame(tick)
    },
    [trackLength],
  )

  useEffect(() => {
    if (paused || trackLength <= 0) {
      cancelAnimationFrame(rafRef.current)
      lastFrameRef.current = 0
      return
    }

    lastFrameRef.current = 0 // Fresh start for animation timing
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [paused, trackLength, tick])

  return position
}
