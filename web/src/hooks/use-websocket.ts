"use client"

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { BOT_API_URL } from "@/lib/api-client"
import type { ActivityEntry } from "@/hooks/use-api"

interface WsEvent {
  event: string
  data: unknown
}

/**
 * WebSocket-first data flow: connects to the bot API server and
 * invalidates TanStack Query caches when the bot pushes events.
 */
export function useWebSocket() {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    function connect() {
      const wsUrl = BOT_API_URL.replace(/^http/, "ws") + "/api/ws"
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.addEventListener("message", (e) => {
        try {
          const { event, data } = JSON.parse(e.data) as WsEvent

          switch (event) {
            /* ── New log entry — prepend to cache directly ── */
            case "log:new": {
              const entry = data as ActivityEntry
              queryClient.setQueriesData<ActivityEntry[]>(
                { queryKey: ["global-logs"] },
                (old) => (old ? [entry, ...old] : [entry]),
              )
              queryClient.setQueriesData<ActivityEntry[]>(
                { queryKey: ["guild-logs", entry.guildId] },
                (old) => (old ? [entry, ...old] : [entry]),
              )
              break
            }

            /* ── Player state changed — invalidate to trigger refetch ── */
            case "player:update": {
              const { guildId } = data as { guildId: string }
              queryClient.invalidateQueries({ queryKey: ["players"] })
              queryClient.invalidateQueries({ queryKey: ["player", guildId] })
              queryClient.invalidateQueries({ queryKey: ["player-queue", guildId] })
              queryClient.invalidateQueries({ queryKey: ["player-history", guildId] })
              queryClient.invalidateQueries({ queryKey: ["stats"] })
              break
            }

            /* ── Player destroyed — remove from cache + invalidate ── */
            case "player:destroy": {
              const { guildId } = data as { guildId: string }
              queryClient.invalidateQueries({ queryKey: ["players"] })
              queryClient.removeQueries({ queryKey: ["player", guildId] })
              queryClient.removeQueries({ queryKey: ["player-queue", guildId] })
              queryClient.removeQueries({ queryKey: ["player-history", guildId] })
              queryClient.invalidateQueries({ queryKey: ["stats"] })
              break
            }
          }
        } catch {
          // Ignore malformed messages
        }
      })

      ws.addEventListener("close", () => {
        reconnectTimer.current = setTimeout(connect, 3000)
      })

      ws.addEventListener("error", () => {
        ws.close()
      })
    }

    connect()

    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [queryClient])
}
