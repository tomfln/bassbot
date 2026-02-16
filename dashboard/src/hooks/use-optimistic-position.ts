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
  const [prevServer, setPrevServer] = useState(serverPosition)
  const rafRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)
  const tickRef = useRef<FrameRequestCallback>(() => {})

  // Sync to server value when it changes (React recommended pattern)
  if (serverPosition !== prevServer) {
    setPrevServer(serverPosition)
    setPosition(serverPosition)
  }

  const tick = useCallback(
    (now: number) => {
      if (lastFrameRef.current === 0) {
        lastFrameRef.current = now
        rafRef.current = requestAnimationFrame(tickRef.current)
        return
      }
      const delta = now - lastFrameRef.current
      lastFrameRef.current = now
      setPosition((prev) => Math.min(prev + delta, trackLength))
      rafRef.current = requestAnimationFrame(tickRef.current)
    },
    [trackLength],
  )

  // Keep ref in sync with latest tick callback
  useEffect(() => {
    tickRef.current = tick
  }, [tick])

  useEffect(() => {
    if (paused || trackLength <= 0) {
      cancelAnimationFrame(rafRef.current)
      lastFrameRef.current = 0
      return
    }

    rafRef.current = requestAnimationFrame(tickRef.current)
    return () => cancelAnimationFrame(rafRef.current)
  }, [paused, trackLength, tick])

  return position
}
