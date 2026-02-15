import { describe, test, expect } from "bun:test"
import { createValidator, runValidators } from "../validator"
import type { CommandContext } from "../command"

// Minimal mock context for testing
function mockCtx(overrides?: Partial<CommandContext<any, any, any>>): CommandContext<any, any, any> {
  return {
    i: {} as any,
    bot: {} as any,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    reply: (() => {}) as any,
    options: {},
    data: {},
    ...overrides,
  }
}

describe("createValidator", () => {
  test("creates a validator from a simple predicate", () => {
    const isGuild = createValidator(() => Promise.resolve(true))
    const instance = isGuild()

    expect(instance._id).toBeDefined()
    expect(typeof instance.validate).toBe("function")
    expect(instance.deps).toBeUndefined()
  })

  test("creates a validator with args", () => {
    const hasRole = createValidator<[roleId: string]>((_ctx, roleId) => {
      return Promise.resolve(roleId === "admin")
    })

    const adminValidator = hasRole("admin")
    const userValidator = hasRole("user")

    // Different args should produce different IDs (same base, different hash)
    expect(adminValidator._id).not.toBe(userValidator._id)
    // Same args should produce the same hash suffix
    expect(hasRole("admin")._id).toBe(adminValidator._id)
  })

  test("creates a validator with deps", () => {
    const isGuild = createValidator(() => Promise.resolve(true))
    const isInVC = createValidator({
      deps: [isGuild()],
      validator: () => Promise.resolve(true),
    })
    const instance = isInVC()

    expect(instance.deps).toHaveLength(1)
  })
})

describe("runValidators", () => {
  test("returns true when all validators pass", async () => {
    const v1 = createValidator(() => Promise.resolve(true))
    const v2 = createValidator(() => Promise.resolve(true))
    const ctx = mockCtx()

    const result = await runValidators([v1(), v2()], ctx)
    expect(result).toBe(true)
  })

  test("returns false when any validator fails", async () => {
    const pass = createValidator(() => Promise.resolve(true))
    const fail = createValidator(() => Promise.resolve(false))
    const ctx = mockCtx()

    const result = await runValidators([pass(), fail()], ctx)
    expect(result).toBe(false)
  })

  test("short-circuits on first failure", async () => {
    let secondRan = false
    const fail = createValidator(() => Promise.resolve(false))
    const second = createValidator(() => {
      secondRan = true
      return Promise.resolve(true)
    })
    const ctx = mockCtx()

    await runValidators([fail(), second()], ctx)
    expect(secondRan).toBe(false)
  })

  test("caches validator results (same validator not run twice)", async () => {
    let runCount = 0
    const expensive = createValidator(() => {
      runCount++
      return Promise.resolve(true)
    })
    const instance = expensive()

    // Create a validator with deps that references the same instance
    const dependent = createValidator({
      deps: [instance],
      validator: () => Promise.resolve(true),
    })
    const ctx = mockCtx()

    // Run both: dependent checks its dep (expensive), then expensive runs as a top-level validator
    await runValidators([dependent(), instance], ctx)
    // expensive() should only have been called once due to caching
    expect(runCount).toBe(1)
  })

  test("fails dependent when dep fails", async () => {
    const failingDep = createValidator(() => Promise.resolve(false))
    let dependentRan = false
    const dependent = createValidator({
      deps: [failingDep()],
      validator: () => {
        dependentRan = true
        return Promise.resolve(true)
      },
    })
    const ctx = mockCtx()

    const result = await runValidators([dependent()], ctx)
    expect(result).toBe(false)
    expect(dependentRan).toBe(false)
  })

  test("returns true for empty validator array", async () => {
    const ctx = mockCtx()
    const result = await runValidators([], ctx)
    expect(result).toBe(true)
  })
})
