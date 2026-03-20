"use client"

import { treaty } from "@elysiajs/eden"
import type { App as BotApi } from "@bot/api"
import type { App as DashApi } from "@web/lib/server"

declare global {
  interface Window {
    __BOT_API_URL__: string
  }
}

/* ── URL helpers ──────────────────────────────────────────── */

// use env var if defined, otherwise in dev, use port 3001, in prod use same origin
const isDev = process.env.NODE_ENV === "development"
const win = typeof window !== "undefined" ? window : null
const origin = win?.location.origin || ""
const botUrl = isDev
 ? win ? `http://${win.location.hostname}:3001` : ""
 : win?.__BOT_API_URL__ || origin

/** Bot API URL for non-treaty use (e.g. WebSocket). */
export const BOT_API_URL = botUrl

/* ── JWT cache (for authenticated bot API calls) ────────── */

let _jwt: string | null = null
let _jwtExpiry = 0

export async function getJwt(): Promise<string | null> {
  if (_jwt && Date.now() < _jwtExpiry - 60_000) return _jwt
  try {
    const { data } = await webApi.jwt.get()
    if (!data?.token) return null
    _jwt = data.token
    const parts = data.token.split(".")
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]!))
      _jwtExpiry = (payload.exp ?? 0) * 1000
    }
    return _jwt
  } catch {
    return null
  }
}

/* ── Static treaty clients ────────────────────────────────── */

/** Bot API (Elysia on the Discord bot) — authenticated via JWT. */
export const botApi = treaty<BotApi>(`${botUrl}/api`, {
  headers: async () => {
    const jwt = await getJwt()
    return jwt ? { authorization: `Bearer ${jwt}` } : {}
  },
})

/** REST API (Elysia inside Next.js at /rest). */
export const webApi = treaty<DashApi>(`${origin}/rest`)
