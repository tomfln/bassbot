/**
 * WebSocket broadcast helper.
 * Tracks connected Elysia WebSocket clients and broadcasts to all.
 */

interface WsClient {
  send: (data: string | ArrayBufferLike) => void
}

const clients = new Set<WsClient>()

export function addWsClient(ws: WsClient) {
  clients.add(ws)
}

export function removeWsClient(ws: WsClient) {
  clients.delete(ws)
}

export function broadcast(event: string, data: unknown) {
  const msg = JSON.stringify({ event, data })
  for (const ws of clients) {
    ws.send(msg)
  }
}
