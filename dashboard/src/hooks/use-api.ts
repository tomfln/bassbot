import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Stats, PlayerInfo, GuildInfo, ActivityEntry } from "@/lib/api"

const REFETCH_INTERVAL = 5000

async function unwrap<T>(promise: Promise<{ data: T | null; error: unknown }>): Promise<T> {
  const res = await promise
  if (res.error) throw res.error
  return res.data as T
}

export function useStats() {
  return useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: () => unwrap(api.api.stats.get()),
    refetchInterval: REFETCH_INTERVAL,
  })
}

export function usePlayers() {
  return useQuery<PlayerInfo[]>({
    queryKey: ["players"],
    queryFn: () => unwrap(api.api.players.get()),
    refetchInterval: REFETCH_INTERVAL,
  })
}

export function usePlayer(guildId: string | undefined) {
  return useQuery<PlayerInfo>({
    queryKey: ["player", guildId],
    queryFn: () => unwrap(api.api.players({ guildId: guildId! }).get()),
    enabled: !!guildId,
    refetchInterval: REFETCH_INTERVAL,
  })
}

export function useGuilds() {
  return useQuery<GuildInfo[]>({
    queryKey: ["guilds"],
    queryFn: () => unwrap(api.api.guilds.get()),
    refetchInterval: REFETCH_INTERVAL,
  })
}

export function useGlobalLogs(limit = 50) {
  return useQuery<ActivityEntry[]>({
    queryKey: ["global-logs", limit],
    queryFn: () => unwrap(api.api.logs.get({ query: { limit: String(limit) } })),
    refetchInterval: REFETCH_INTERVAL,
  })
}

export function useGuildLogs(guildId: string | undefined, limit = 50) {
  return useQuery<ActivityEntry[]>({
    queryKey: ["guild-logs", guildId, limit],
    queryFn: () => unwrap(api.api.logs({ guildId: guildId! }).get({ query: { limit: String(limit) } })),
    enabled: !!guildId,
    refetchInterval: REFETCH_INTERVAL,
  })
}
