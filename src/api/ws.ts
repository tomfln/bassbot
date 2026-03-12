import { Elysia } from "elysia"
import { addWsClient, removeWsClient } from "../util/broadcast"
import { verifyToken } from "./auth"

/**
 * WebSocket route for real-time push updates.
 * Auth: client sends JWT as the Sec-WebSocket-Protocol header value.
 */
export function wsRoute() {
  return new Elysia().ws("/ws", {
    async open(ws) {
      const protocol = ws.data.request.headers.get("sec-websocket-protocol")
      if (!protocol) {
        ws.close(4001, "Missing token")
        return
      }
      try {
        await verifyToken(protocol)
        addWsClient(ws)
      } catch {
        ws.close(4003, "Invalid token")
      }
    },
    close(ws) {
      removeWsClient(ws)
    },
    message() {},
  })
}
