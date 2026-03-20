"use client"

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { BOT_API_URL, getJwt } from "@web/lib/api-client"
import type { ActivityEntry } from "@web/hooks/use-api"

interface WsEvent {
  event: string
  data: unknown
}

/**
 * WebSocket-first data flow: connects to the bot API server and
 * invalidates TanStack Query caches when the bot pushes events.
 * Auth: sends JWT token via the Sec-WebSocket-Protocol header.
 */
export function useWebSocket() {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    async function connect() {
      const token = await getJwt()
      if (!token) {
        // No JWT yet — retry after a delay
        reconnectTimer.current = setTimeout(connect, 3000)
        return
      }

      const wsUrl = BOT_API_URL.replace(/^http/, "ws") + "/api/ws"
      // Pass the JWT as a sub-protocol — the server reads it from
      // the Sec-WebSocket-Protocol header and verifies it on open.
      const ws = new WebSocket(wsUrl, [token])
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
