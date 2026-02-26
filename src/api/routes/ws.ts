import { Elysia } from "elysia"
import { addWsClient, removeWsClient } from "../../util/broadcast"

export const wsRoutes = new Elysia()
  .ws("/ws", {
    open(ws) {
      addWsClient(ws)
    },
    close(ws) {
      removeWsClient(ws)
    },
    message() {
      // Client→server messages not used; all updates are server-pushed
    },
  })
