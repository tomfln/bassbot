import { HttpError } from "./error"

const WINDOW_MS = 60_000
const MAX_REQUESTS = 120
const MAX_TRACKED_IPS = 10_000

const ipHits = new Map<string, { count: number; resetAt: number }>()

// Prune stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of ipHits) {
    if (now > entry.resetAt) ipHits.delete(ip)
  }
}, 300_000).unref()

export function checkRateLimit(request: Request): void {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"

  const now = Date.now()
  let entry = ipHits.get(ip)

  if (!entry || now > entry.resetAt) {
    // Evict oldest 10 % when at capacity (Map iterates in insertion order)
    if (ipHits.size >= MAX_TRACKED_IPS) {
      const evictCount = Math.ceil(MAX_TRACKED_IPS * 0.1)
      const it = ipHits.keys()
      for (let i = 0; i < evictCount; i++) {
        const key = it.next().value
        if (key) ipHits.delete(key)
      }
    }
    entry = { count: 0, resetAt: now + WINDOW_MS }
    ipHits.set(ip, entry)
  }

  entry.count++
  if (entry.count > MAX_REQUESTS) {
    throw new HttpError(429, { error: "Too many requests" }, {
      "retry-after": String(Math.ceil((entry.resetAt - now) / 1000)),
    })
  }
}
