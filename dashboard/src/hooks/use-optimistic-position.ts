import { useState, useEffect, useRef, useCallback } from "react"

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
  const rafRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)

  // Sync to server value whenever it changes
  useEffect(() => {
    setPosition(serverPosition)
    lastFrameRef.current = 0
  }, [serverPosition])

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

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [paused, trackLength, tick])

  return position
}
