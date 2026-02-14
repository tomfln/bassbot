import type { Awaitable } from "discord.js"
import type { CommandContext } from "./command"
import type { AbortHelper } from "./reply"

export type MiddlewareFn<
  NewData extends Record<string, any> = Record<string, never>,
> = (ctx: CommandContext<any, any, any>, abort: AbortHelper) => Awaitable<NewData | null>

export function createMiddleware<NewData extends Record<string, any>>(
  fn: (ctx: CommandContext<any, any, any>, abort: AbortHelper) => Awaitable<NewData | null>,
) {
  return fn
}