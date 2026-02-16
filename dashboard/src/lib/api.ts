import { treaty } from "@elysiajs/eden"
import type { App } from "@server/api"

export const api = treaty<App>(window.location.origin)

// ─── Inferred Types ─────────────────────────────────────────────────────────

type Unwrap<T> = T extends { data: infer D } ? NonNullable<D> : never
type ApiResponse<T> = T extends (...args: never[]) => Promise<infer R>
  ? Unwrap<R>
  : never

export type Stats = ApiResponse<typeof api.api.stats.get>
export type PlayerInfo = ApiResponse<typeof api.api.players.get>[number]
export type GuildInfo = ApiResponse<typeof api.api.guilds.get>[number]
export type ActivityEntry = ApiResponse<typeof api.api.logs.get>[number]
export type Track = PlayerInfo["queue"][number]

// Guild detail is from a parameterized route, extract from Eden's response type
export type GuildMember = {
  id: string
  displayName: string
  username: string
  avatar: string
  isBot: boolean
  isOwner: boolean
  joinedAt: number | null
}

export type GuildDetail = {
  id: string
  name: string
  icon: string | null
  banner: string | null
  memberCount: number
  createdAt: number
  owner: {
    id: string
    displayName: string
    username: string
    avatar: string
  } | null
  hasPlayer: boolean
  members: GuildMember[]
}
