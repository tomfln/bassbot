// ─── API Types ──────────────────────────────────────────────────────────────

export interface Stats {
  guildCount: number
  userCount: number
  activePlayers: number
  totalPlayers: number
  uptime: number
  lavalinkNodes: number
}

export interface Track {
  title: string
  author: string
  uri: string | null
  artworkUrl: string | null
  length: number
  sourceName?: string
}

export interface VCMember {
  id: string
  displayName: string
  avatar: string
}

export interface VoiceChannel {
  name: string
  id: string
  members: VCMember[]
}

export interface PlayerInfo {
  guildId: string
  guildName: string
  guildIcon: string | null
  paused: boolean
  position: number
  current: (Track & { sourceName: string }) | null
  queue: Track[]
  history: Track[]
  voiceChannel: VoiceChannel | null
  node: string
}

export interface GuildInfo {
  id: string
  name: string
  icon: string | null
  memberCount: number
  hasPlayer: boolean
}

export interface ActivityEntry {
  timestamp: number
  guildId: string
  guildName: string
  userId: string
  userName: string
  userAvatar?: string
  action: string
  detail: string
}

// ─── Fetcher ────────────────────────────────────────────────────────────────

const BASE = "/api"

async function fetcher<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  return res.json() as Promise<T>
}

export const api = {
  stats: () => fetcher<Stats>("/stats"),
  players: () => fetcher<PlayerInfo[]>("/players"),
  player: (guildId: string) => fetcher<PlayerInfo>(`/players/${guildId}`),
  guilds: () => fetcher<GuildInfo[]>("/guilds"),
  globalLogs: (limit = 50) => fetcher<ActivityEntry[]>(`/logs?limit=${limit}`),
  guildLogs: (guildId: string, limit = 50) =>
    fetcher<ActivityEntry[]>(`/logs/${guildId}?limit=${limit}`),
}
