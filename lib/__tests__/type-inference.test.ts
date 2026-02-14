/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function, @typescript-eslint/no-empty-object-type */
/**
 * Type-level tests for the command/middleware/validator system.
 * These verify that TypeScript infers types correctly at compile time.
 * If any assertion fails, the file will produce a compile error.
 */

import type { ButtonInteraction, ChatInputCommandInteraction, ContextMenuCommandInteraction } from "discord.js"
import { createCommand, buildOptions } from "@bot/command"
import { createMiddleware } from "@bot/middleware"
import { createValidator } from "@bot/validator"

// ─── Type assertion helpers ──────────────────────────────────────────────────

type Expect<T extends true> = T
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false

// ─── 1. Sources inference ────────────────────────────────────────────────────
// Default source: only slash commands
{
  createCommand({
    description: "test",
    run: async (ctx) => {
      type _I = Expect<Equal<typeof ctx.i, ChatInputCommandInteraction<"cached">>>
      type _Opts = Expect<Equal<typeof ctx.options, {}>>
    },
  })
}

// Button + command source: i should be union  
{
  createCommand({
    description: "test",
    sources: { command: true, button: true },
    run: async (ctx) => {
      type _I = Expect<Equal<
        typeof ctx.i,
        ChatInputCommandInteraction<"cached"> | ButtonInteraction<"cached">
      >>
    },
  })
}

// All three sources
{
  createCommand({
    description: "test",
    sources: { command: true, button: true, contextMenu: true },
    run: async (ctx) => {
      type _I = Expect<Equal<
        typeof ctx.i,
        | ChatInputCommandInteraction<"cached">
        | ButtonInteraction<"cached">
        | ContextMenuCommandInteraction<"cached">
      >>
    },
  })
}

// Button-only source: options should be undefined
{
  createCommand({
    description: "test",
    sources: { button: true },
    run: async (ctx) => {
      type _I = Expect<Equal<typeof ctx.i, ButtonInteraction<"cached">>>
      type _Opts = Expect<Equal<typeof ctx.options, undefined>>
    },
  })
}

// ─── 2. Options resolution ──────────────────────────────────────────────────

// Options should be strongly typed based on builder
{
  createCommand({
    description: "test",
    options: buildOptions()
      .string({ name: "song", description: "The song", required: true as const })
      .boolean({ name: "next", description: "Play next" })
      .build(),

    run: async ({ options }) => {
      type _Song = Expect<Equal<typeof options.song, string>>
      type _Next = Expect<Equal<typeof options.next, boolean | null>>
    },
  })
}

// Options should be undefined when sources exclude command
{
  createCommand({
    description: "test",
    sources: { button: true },
    options: buildOptions()
      .string({ name: "query", description: "Search", required: true as const })
      .build(),

    run: async ({ options }) => {
      type _Opts = Expect<Equal<typeof options, undefined>>
    },
  })
}

// Options should be potentially undefined for command+button sources
{
  createCommand({
    description: "test",
    sources: { command: true, button: true },
    options: buildOptions()
      .string({ name: "query", description: "Search", required: true as const })
      .build(),

    run: async ({ options }) => {
      type _Opts = Expect<Equal<typeof options, { query: string } | undefined>>
    },
  })
}

// ─── 3. Middleware data inference ────────────────────────────────────────────

// Single middleware: data should contain its return type
{
  const getPlayer = createMiddleware(async (_ctx, _abort) => {
    return { player: "mock" as const }
  })

  createCommand({
    description: "test",
    middleware: (m) => m.use(getPlayer),
    run: async ({ data }) => {
      type _Player = Expect<Equal<typeof data.player, "mock">>
    },
  })
}

// Chained middlewares: data should be merged
{
  const getPlayer = createMiddleware(async (_ctx, _abort) => {
    return { player: "mock" as const }
  })
  const getChannel = createMiddleware(async (_ctx, _abort) => {
    return { channel: "mock-channel" as const }
  })

  createCommand({
    description: "test",
    middleware: (m) => m.use(getPlayer).use(getChannel),
    run: async ({ data }) => {
      type _Player = Expect<Equal<typeof data.player, "mock">>
      type _Channel = Expect<Equal<typeof data.channel, "mock-channel">>
    },
  })
}

// ─── 4. Validators ──────────────────────────────────────────────────────────

// Validator with no args
{
  const isGuild = createValidator(async (ctx) => {
    return !!ctx.i
  })

  createCommand({
    description: "test",
    validators: [isGuild()],
    run: async () => {},
  })
}

// Validator with args
{
  const hasRole = createValidator<[roleId: string]>(async (ctx, roleId) => {
    type _RoleId = Expect<Equal<typeof roleId, string>>
    return !!ctx.i && !!roleId
  })

  createCommand({
    description: "test",
    validators: [hasRole("123")],
    run: async () => {},
  })
}

// Validator with deps
{
  const isGuild = createValidator(async (ctx) => !!ctx.i)
  const isInVC = createValidator({
    deps: [isGuild()],
    validator: async (ctx) => !!ctx.i,
  })

  createCommand({
    description: "test",
    validators: [isInVC()],
    run: async () => {},
  })
}

// ─── 5. Combined: sources + options + middleware ─────────────────────────────

{
  const requirePlayer = createMiddleware(async (_ctx, _abort) => {
    return { player: { name: "test" } }
  })

  createCommand({
    description: "Combined test",
    sources: { command: true, button: true },
    options: buildOptions()
      .integer({ name: "page", description: "Page number" })
      .build(),

    middleware: (m) => m.use(requirePlayer),

    run: async ({ i, options, data }) => {
      // i should be a union of command and button interactions
      type _I = Expect<Equal<
        typeof i,
        ChatInputCommandInteraction<"cached"> | ButtonInteraction<"cached">
      >>
      // options should be optional due to button source
      type _Opts = Expect<Equal<typeof options, { page: number | null } | undefined>>
      // data should have the player from middleware
      type _Player = Expect<Equal<typeof data.player, { name: string }>>
    },
  })
}
