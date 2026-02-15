import useSWR from "swr"
import { api } from "@/lib/api"
import type { Stats, PlayerInfo, GuildInfo } from "@/lib/api"

const REFRESH_INTERVAL = 5000

export function useStats() {
  return useSWR<Stats>("stats", () => api.stats(), {
    refreshInterval: REFRESH_INTERVAL,
  })
}

export function usePlayers() {
  return useSWR<PlayerInfo[]>("players", () => api.players(), {
    refreshInterval: REFRESH_INTERVAL,
  })
}

export function usePlayer(guildId: string | undefined) {
  return useSWR<PlayerInfo>(
    guildId ? `player-${guildId}` : null,
    () => api.player(guildId!),
    { refreshInterval: REFRESH_INTERVAL },
  )
}

export function useGuilds() {
  return useSWR<GuildInfo[]>("guilds", () => api.guilds(), {
    refreshInterval: REFRESH_INTERVAL,
  })
}
