import { treaty } from "@elysiajs/eden"
import type { App } from "@server/api"

export const api = treaty<App>(window.location.origin)

// ─── Inferred Types ─────────────────────────────────────────────────────────

type Unwrap<T> = T extends { data: infer D } ? NonNullable<D> : never
type ApiResponse<T> = T extends (...args: never[]) => Promise<infer R>
  ? Unwrap<R>
  : never

export type Stats = ApiResponse<typeof api.api.stats.get>
export type PlayerSummary = ApiResponse<typeof api.api.players.get>[number]
export type PlayerDetail = ApiResponse<typeof api.api.players.get> extends unknown
  ? {
      guildId: string
      guildName: string
      guildIcon: string | null
      paused: boolean
      position: number
      current: {
        title: string
        author: string
        uri: string | null
        artworkUrl: string | null
        length: number
        sourceName: string | null
      } | null
      queue: Track[]
      queueTotal: number
      history: Track[]
      historyTotal: number
      voiceChannel: {
        name: string
        id: string
        members: { id: string; displayName: string; avatar: string }[]
      } | null
      node: string
      nodeStats: {
        players: number
        playingPlayers: number
        uptime: number
        cpu: { cores: number; systemLoad: number; lavalinkLoad: number }
        memory: { used: number; allocated: number }
        frameStats?: { sent: number; nulled: number; deficit: number } | null
      } | null
    }
  : never
export type GuildInfo = ApiResponse<typeof api.api.guilds.get>[number]
export type ActivityEntry = ApiResponse<typeof api.api.logs.get>[number]
export type Track = {
  title: string
  author: string
  uri: string | null
  artworkUrl: string | null
  length: number
}

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
  memberTotal: number
  humanCount: number
  botCount: number
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  offset: number
}
