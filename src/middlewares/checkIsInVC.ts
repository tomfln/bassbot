import { createMiddleware } from "@bot/middleware";

export default createMiddleware((ctx, abort) => {
  const vc = ctx.i.member.voice.channel
  if (!vc) return abort.warn("You need to be in a voice channel to use this command.")

  return { vc }
})