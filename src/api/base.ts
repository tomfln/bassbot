import { Elysia } from "elysia"
import { HttpError } from "./error"
import { checkRateLimit } from "./rate-limit"

/** Base Elysia plugin: structured error handler + per-IP rate limiter. */
export function apiBase() {
  return new Elysia({ name: "api-base" })
    .onError(({ error, set }) => {
      if (error instanceof HttpError) {
        set.status = error.statusCode
        set.headers["content-type"] = "application/json"
        if (error.responseHeaders) {
          for (const [k, v] of Object.entries(error.responseHeaders)) {
            set.headers[k] = v
          }
        }
        return error.body as never
      }
    })
    .onBeforeHandle(({ request }) => {
      checkRateLimit(request)
    })
}
