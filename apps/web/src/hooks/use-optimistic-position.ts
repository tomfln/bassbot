"use client"

import { useState, useEffect, useRef } from "react"

/**
 * Returns an optimistically interpolated position (ms) that ticks
 * forward on the client between server syncs when not paused.
 */
export function useOptimisticPosition(
  serverPosition: number,
  trackLength: number,
  paused: boolean,
): number {
  const [position, setPosition] = useState(serverPosition)
  const [syncKey, setSyncKey] = useState({ serverPosition, trackLength })
  const rafRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)
  const trackLengthRef = useRef(trackLength)

  // Detect server position changes during render (React-recommended pattern)
  if (
    serverPosition !== syncKey.serverPosition ||
    trackLength !== syncKey.trackLength
  ) {
    setSyncKey({ serverPosition, trackLength })
    setPosition(serverPosition)
  }

  // Keep trackLength ref in sync for the animation callback
  useEffect(() => {
    trackLengthRef.current = trackLength
  }, [trackLength])

  // Animation loop
  useEffect(() => {
    if (paused || trackLength <= 0) {
      cancelAnimationFrame(rafRef.current)
      lastFrameRef.current = 0
      return
    }

    lastFrameRef.current = 0

    function tick(now: number) {
      if (lastFrameRef.current === 0) {
        lastFrameRef.current = now
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const delta = now - lastFrameRef.current
      lastFrameRef.current = now
      setPosition((prev) => Math.min(prev + delta, trackLengthRef.current))
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [paused, trackLength])

  return position
}
