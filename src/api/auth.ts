import { verifyAuthHeader, verifyJwt, type JwtPayload } from "@lib/jwt"
import type { BassBot } from "../bot"
import config from "../config"
import { HttpError } from "./error"

export { type JwtPayload }

/** Require any valid JWT. Returns the payload or throws 401. */
export async function requireAuth(request: Request): Promise<JwtPayload> {
  const user = await verifyAuthHeader(request.headers.get("authorization"), config.jwtSecret)
  if (!user) throw new HttpError(401, { error: "Unauthorized" })
  return user
}

/** Require JWT with admin role. Returns the payload or throws 401/403. */
export async function requireAdmin(request: Request): Promise<JwtPayload> {
  const user = await requireAuth(request)
  if (user.role !== "admin") throw new HttpError(403, { error: "Forbidden" })
  return user
}

/** Require the authenticated user to be in the same voice channel as the bot. Admins bypass. */
export async function requireUserInVC(
  bot: BassBot,
  request: Request,
  guildId: string,
): Promise<JwtPayload> {
  const user = await requireAuth(request)
  if (user.role === "admin") return user

  const guild = bot.guilds.cache.get(guildId)
  if (!guild) throw new HttpError(404, { error: "Guild not found" })

  const member = guild.members.cache.get(user.discordId)
  if (!member) throw new HttpError(403, { error: "You are not a member of this server" })

  const botVC = guild.members.me?.voice.channel
  if (!botVC) throw new HttpError(400, { error: "Bot is not in a voice channel" })

  const userVC = member.voice.channel
  if (userVC?.id !== botVC.id) {
    throw new HttpError(403, { error: "You must be in the same voice channel as the bot" })
  }

  return user
}

/** Verify a raw JWT string. Used for WebSocket auth (Sec-WebSocket-Protocol). */
export async function verifyToken(token: string): Promise<JwtPayload> {
  try {
    return await verifyJwt(token, config.jwtSecret)
  } catch {
    throw new HttpError(401, { error: "Invalid token" })
  }
}
