import { describe, test, expect } from "bun:test"
import { createMiddleware, type MiddlewareFn } from "../middleware"
import { MiddlewareBuilder } from "../command"
import type { CommandContext } from "../command"
import type { AbortHelper } from "../reply"

function mockCtx(data?: Record<string, any>): CommandContext<any, any, any> {
  return {
    i: {} as any,
    bot: {} as any,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    reply: (() => {}) as any,
    options: {},
    data: data ?? {},
  }
}

function mockAbort(): AbortHelper {
  const abort = () => null
  abort.reply = () => Promise.resolve(null)
  abort.error = () => Promise.resolve(null)
  abort.warn = () => Promise.resolve(null)
  return abort as AbortHelper
}

describe("createMiddleware", () => {
  test("wraps a function as a middleware", () => {
    const mw = createMiddleware(() => Promise.resolve({ player: "test" }))
    expect(typeof mw).toBe("function")
  })

  test("middleware receives ctx and abort", async () => {
    let receivedCtx = false
    let receivedAbort = false

    const mw = createMiddleware((ctx, abort) => {
      receivedCtx = !!ctx
      receivedAbort = !!abort
      return Promise.resolve({})
    })

    await mw(mockCtx(), mockAbort())
    expect(receivedCtx).toBe(true)
    expect(receivedAbort).toBe(true)
  })

  test("middleware returns data", async () => {
    const mw = createMiddleware(() => Promise.resolve({ key: "value" }))
    const result = await mw(mockCtx(), mockAbort())
    expect(result).toEqual({ key: "value" })
  })

  test("middleware can return null (abort)", async () => {
    const mw = createMiddleware((_ctx, abort) => {
      return Promise.resolve(abort())
    })
    const result = await mw(mockCtx(), mockAbort())
    expect(result).toBeNull()
  })
})

describe("MiddlewareBuilder", () => {
  test("starts with empty middleware list", () => {
    const builder = new MiddlewareBuilder()
    expect(builder.middlewares).toEqual([])
  })

  test("use() adds middlewares to the list", () => {
    const mw1 = createMiddleware(() => Promise.resolve({ a: 1 }))
    const mw2 = createMiddleware(() => Promise.resolve({ b: 2 }))

    const builder = new MiddlewareBuilder().use(mw1).use(mw2)
    expect(builder.middlewares).toHaveLength(2)
  })

  test("running chained middlewares merges data", async () => {
    const mw1: MiddlewareFn<{ player: string }> = () => Promise.resolve({ player: "test" })
    const mw2: MiddlewareFn<{ guild: string }> = () => Promise.resolve({ guild: "123" })

    const builder = new MiddlewareBuilder().use(mw1).use(mw2)
    const ctx = mockCtx()
    const abort = mockAbort()

    // Simulate the data merging that Bot.handleInteraction does
    for (const fn of builder.middlewares) {
      const newData = await fn(ctx, abort)
      if (newData) ctx.data = { ...ctx.data, ...newData }
    }

    expect(ctx.data).toEqual({ player: "test", guild: "123" })
  })
})
