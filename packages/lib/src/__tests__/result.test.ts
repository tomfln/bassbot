import { describe, test, expect } from "bun:test"
import { Result } from "../result"

describe("Result", () => {
  test("Ok creates a success result", () => {
    const r = Result.Ok(42)
    expect(r.success).toBe(true)
    expect(r.value).toBe(42)
    expect(r.error).toBeUndefined()
  })

  test("Err creates a failure result", () => {
    const r = Result.Err("something went wrong")
    expect(r.success).toBe(false)
    expect(r.error).toBe("something went wrong")
    expect(r.value).toBeUndefined()
  })

  test("Ok value can be any type", () => {
    const obj = Result.Ok({ foo: "bar" })
    expect(obj.success).toBe(true)
    expect(obj.value).toEqual({ foo: "bar" })

    const arr = Result.Ok([1, 2, 3])
    expect(arr.value).toEqual([1, 2, 3])

    const nul = Result.Ok(null)
    expect(nul.value).toBeNull()
  })

  test("discriminated union narrows correctly", () => {
    const r: Result<number, string> = Result.Ok(10)
    if (r.success) {
      expect(r.value).toBe(10)
    } else {
      // Should not reach here
      expect(true).toBe(false)
    }
  })
})
