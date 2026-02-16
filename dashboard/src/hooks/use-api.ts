import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type {
  Stats,
  PlayerSummary,
  PlayerDetail,
  GuildInfo,
  GuildDetail,
  ActivityEntry,
  PaginatedResponse,
  Track,
  GuildMember,
} from "@/lib/api"

/* ── Helpers ──────────────────────────────────────────────── */

async function unwrap<T>(promise: Promise<{ data: unknown; error: unknown }>): Promise<T> {
  const res = await promise
  if (res.error) throw res.error
  return res.data as T
}

/*
 * No polling — all data is fetched once on mount.
 * WebSocket events invalidate the relevant query keys,
 * which triggers a single background refetch.
 */

/* ── Stats ────────────────────────────────────────────────── */

export function useStats() {
  return useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: () => unwrap(api.api.stats.get()),
    staleTime: Infinity,
  })
}

/* ── Players ──────────────────────────────────────────────── */

export function usePlayers() {
  return useQuery<PlayerSummary[]>({
    queryKey: ["players"],
    queryFn: () => unwrap(api.api.players.get()),
    staleTime: Infinity,
  })
}

export function usePlayer(
  guildId: string | undefined,
  opts: { queueLimit?: number; historyLimit?: number } = {},
) {
  const ql = opts.queueLimit ?? 10
  const hl = opts.historyLimit ?? 10
  return useQuery<PlayerDetail>({
    queryKey: ["player", guildId, ql, hl],
    queryFn: () =>
      unwrap(
        api.api.players({ guildId: guildId! }).get({
          query: { ql: String(ql), hl: String(hl) },
        }),
      ),
    enabled: !!guildId,
    staleTime: Infinity,
  })
}

/* ── Paginated queue / history ────────────────────────────── */

export function usePlayerQueue(
  guildId: string | undefined,
  offset: number,
  limit: number,
) {
  return useQuery<PaginatedResponse<Track>>({
    queryKey: ["player-queue", guildId, offset, limit],
    queryFn: () =>
      unwrap(
        api.api.players({ guildId: guildId! }).queue.get({
          query: { offset: String(offset), limit: String(limit) },
        }),
      ),
    enabled: !!guildId && offset > 0,
    staleTime: Infinity,
  })
}

export function usePlayerHistory(
  guildId: string | undefined,
  offset: number,
  limit: number,
) {
  return useQuery<PaginatedResponse<Track>>({
    queryKey: ["player-history", guildId, offset, limit],
    queryFn: () =>
      unwrap(
        api.api.players({ guildId: guildId! }).history.get({
          query: { offset: String(offset), limit: String(limit) },
        }),
      ),
    enabled: !!guildId && offset > 0,
    staleTime: Infinity,
  })
}

/* ── Guilds ───────────────────────────────────────────────── */

export function useGuilds() {
  return useQuery<GuildInfo[]>({
    queryKey: ["guilds"],
    queryFn: () => unwrap(api.api.guilds.get()),
    staleTime: Infinity,
  })
}

export function useGuild(
  guildId: string | undefined,
  opts: { memberLimit?: number } = {},
) {
  const ml = opts.memberLimit ?? 20
  return useQuery<GuildDetail>({
    queryKey: ["guild", guildId, ml],
    queryFn: () =>
      unwrap(
        api.api.guilds({ guildId: guildId! }).get({
          query: { ml: String(ml) },
        }),
      ),
    enabled: !!guildId,
    staleTime: Infinity,
  })
}

/* ── Paginated guild members ──────────────────────────────── */

export function useGuildMembers(
  guildId: string | undefined,
  offset: number,
  limit: number,
  search = "",
) {
  return useQuery<PaginatedResponse<GuildMember>>({
    queryKey: ["guild-members", guildId, offset, limit, search],
    queryFn: () =>
      unwrap(
        api.api.guilds({ guildId: guildId! }).members.get({
          query: {
            offset: String(offset),
            limit: String(limit),
            search,
          },
        }),
      ),
    enabled: !!guildId && (offset > 0 || search.length > 0),
    staleTime: Infinity,
  })
}

/* ── Logs — fetched once, new entries pushed via WebSocket ── */

export function useGlobalLogs(limit = 50) {
  return useQuery<ActivityEntry[]>({
    queryKey: ["global-logs", limit],
    queryFn: () => unwrap(api.api.logs.get({ query: { limit: String(limit) } })),
    staleTime: Infinity,
  })
}

export function useGuildLogs(guildId: string | undefined, limit = 50) {
  return useQuery<ActivityEntry[]>({
    queryKey: ["guild-logs", guildId, limit],
    queryFn: () =>
      unwrap(api.api.logs({ guildId: guildId! }).get({ query: { limit: String(limit) } })),
    enabled: !!guildId,
    staleTime: Infinity,
  })
}
