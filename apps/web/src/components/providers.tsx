"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "@web/components/ui/tooltip"
import { useWebSocket } from "@web/hooks/use-websocket"
import { useState, type ReactNode } from "react"

/** Connects the WebSocket inside the QueryClientProvider context. */
function WebSocketBridge() {
  useWebSocket()
  return null
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 2000,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketBridge />
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  )
}
