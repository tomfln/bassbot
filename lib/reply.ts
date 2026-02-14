import { type Awaitable, type ButtonInteraction, type RepliableInteraction } from "discord.js"
import { createMessageEmbed, type EmbedOpts } from "./message"

export async function replyEmbed(i: RepliableInteraction, msg: string, opts?: EmbedOpts) {
  opts = opts ?? {}

  if (i.replied || i.deferred) {
    return i.editReply({
      body: null,
      content: null,
      embeds: [createMessageEmbed(msg, opts)],
    })
  } else {
    return i.reply({
      embeds: [createMessageEmbed(msg, opts)],
      flags: opts.flags,
    })
  }
}

export async function replyWarn(i: RepliableInteraction, msg: string, opts?: EmbedOpts) {
  return replyEmbed(i, msg, { ...opts, color: 0xff8f30, flags: "Ephemeral" })
}

export async function replyError(i: RepliableInteraction, msg: string, opts?: EmbedOpts) {
  return replyEmbed(i, msg, { ...opts, color: 0xe25d50, flags: "Ephemeral" })
}

export function createReplyHelper(i: RepliableInteraction) {
  const reply = async (msg: string, opts?: EmbedOpts) => {
    return replyEmbed(i, msg, opts)
  }
  reply.error = async (msg: string, opts?: EmbedOpts) => {
    return replyError(i, msg, opts)
  }
  reply.warn = async (msg: string, opts?: EmbedOpts) => {
    return replyWarn(i, msg, opts)
  }
  return reply
}
export type ReplyHelper = ReturnType<typeof createReplyHelper>

export function createAbortHelper(i: RepliableInteraction, onAbort: () => void) {
  const abort = () => {
    onAbort()
    return null
  }
  abort.reply = async (msg: string, opts?: EmbedOpts) => {
    onAbort()
    await replyEmbed(i, msg, opts)
    return null
  }
  abort.error = async (msg: string, opts?: EmbedOpts) => {
    onAbort()
    await replyError(i, msg, opts)
    return null
  }
  abort.warn = async (msg: string, opts?: EmbedOpts) => {
    onAbort()
    await replyWarn(i, msg, opts)
    return null
  }
  return abort
}
export type AbortHelper = ReturnType<typeof createAbortHelper>

export function mockReplyHelper(i: ButtonInteraction<"cached">) {
  return mockHelper(i, () => i.deferUpdate()) as unknown as ReplyHelper
}
export function mockAbortHelper(i: ButtonInteraction<"cached">, onAbort: () => void) {
  return mockHelper(i, async () => {
    onAbort()
    await i.deferUpdate()
    return null
  }) as unknown as AbortHelper
}

const mockHelper = (i: ButtonInteraction<"cached">, fn: () => Awaitable<any>) => {
  const mockFn = fn as { (): Awaitable<any>; error: Awaitable<any>; warn: Awaitable<any> }
  mockFn.error = fn
  mockFn.warn = fn
  return fn
}
