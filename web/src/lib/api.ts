/**
 * Runtime API base URL.
 *
 * Set once by the root Providers component (which receives it from the
 * Server Component layout that reads `process.env.API_URL`).
 *
 * - Non-empty string → separate-hosts mode (e.g. "http://bot:3001")
 * - Empty string      → proxy mode (API lives on the same origin)
 */
let _apiUrl = ""

/** Called once at app startup by the Providers component. */
export function setApiUrl(url: string) {
  _apiUrl = url
}

/** Full API base URL. Falls back to current origin in proxy mode. */
export function getApiUrl(): string {
  if (_apiUrl) return _apiUrl
  if (typeof window !== "undefined") return window.location.origin
  return ""
}

export type Stats = {
  botName: string
  botAvatar: string | null
  botId: string | null
  version: string
  guildCount: number
  userCount: number
  activePlayers: number
  totalPlayers: number
  uptime: number
  lavalinkNodes: number
}

export type Track = {
  title: string
  author: string
  uri: string | null
  artworkUrl: string | null
  length: number
}

export type PlayerSummary = {
  guildId: string
  guildName: string
  guildIcon: string | null
  paused: boolean
  position: number
  current: Track | null
  queueLength: number
  voiceChannel: {
    name: string
    id: string
    memberCount: number
  } | null
  node: string
}

export type PlayerDetail = {
  guildId: string
  guildName: string
  guildIcon: string | null
  paused: boolean
  position: number
  current: (Track & { sourceName: string | null }) | null
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

export type GuildInfo = {
  id: string
  name: string
  icon: string | null
  memberCount: number
  hasPlayer: boolean
}

export type ActivityEntry = {
  timestamp: number
  guildId: string
  guildName: string
  userId: string
  userName: string
  userAvatar: string
  action: string
  detail: string
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


