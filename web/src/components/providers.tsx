"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useWebSocket } from "@/hooks/use-websocket"
import { setApiUrl } from "@/lib/api"
import { useState, type ReactNode } from "react"

/** Connects the WebSocket inside the QueryClientProvider context. */
function WebSocketBridge() {
  useWebSocket()
  return null
}

export function Providers({ apiUrl, children }: { apiUrl: string; children: ReactNode }) {
  // Set the API URL before anything else renders
  setApiUrl(apiUrl)
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
