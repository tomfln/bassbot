import { jwtVerify } from "jose"
import type { BassBot } from "../bot"
import config from "../config"

export interface JwtPayload {
  sub: string
  discordId: string
  role: "admin" | "user"
  name: string
  avatar: string
}

export async function verifyJwt(request: Request): Promise<JwtPayload | null> {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  try {
    const { payload } = await jwtVerify(
      authHeader.slice(7),
      new TextEncoder().encode(config.jwtSecret),
    )
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

/**
 * Verify JWT and check user is in the same voice channel as the bot.
 * Returns the JWT payload on success, or a Response on failure.
 */
export async function verifyUserInVC(
  bot: BassBot,
  request: Request,
  guildId: string,
): Promise<JwtPayload | Response> {
  const user = await verifyJwt(request)
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })

  // Admins bypass voice channel check
  if (user.role === "admin") return user

  const guild = bot.guilds.cache.get(guildId)
  if (!guild) return new Response(JSON.stringify({ error: "Guild not found" }), { status: 404 })

  // Check if the user is in the guild
  const member = guild.members.cache.get(user.discordId)
  if (!member) {
    return new Response(
      JSON.stringify({ error: "You are not a member of this server" }),
      { status: 403 },
    )
  }

  // Check if the bot is in a voice channel
  const botVC = guild.members.me?.voice.channel
  if (!botVC) {
    return new Response(
      JSON.stringify({ error: "Bot is not in a voice channel" }),
      { status: 400 },
    )
  }

  // Check if the user is in the same voice channel as the bot
  const userVC = member.voice.channel
  if (userVC?.id !== botVC.id) {
    return new Response(
      JSON.stringify({ error: "You must be in the same voice channel as the bot" }),
      { status: 403 },
    )
  }

  return user
}
