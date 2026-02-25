"use client"

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { bot, rest } from "@/lib/api-client"

/* ── Helpers ──────────────────────────────────────────────── */

function unwrap<T>(result: { data: T | null; error: unknown }): NonNullable<T> {
  if (result.error) throw result.error
  if (result.data == null) throw new Error("No data")
  return result.data as NonNullable<T>
}

/*
 * No polling — all data is fetched once on mount.
 * WebSocket events invalidate the relevant query keys,
 * which triggers a single background refetch.
 */

/* ── Stats ────────────────────────────────────────────────── */

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => unwrap(await bot.api.stats.get()),
    staleTime: Infinity,
  })
}

/* ── Players ──────────────────────────────────────────────── */

export function usePlayers() {
  return useQuery({
    queryKey: ["players"],
    queryFn: async () => unwrap(await bot.api.players.get()),
    staleTime: Infinity,
  })
}

export function usePlayer(
  guildId: string | undefined,
  opts: { queueLimit?: number; historyLimit?: number } = {},
) {
  const ql = opts.queueLimit ?? 10
  const hl = opts.historyLimit ?? 10
  return useQuery({
    queryKey: ["player", guildId, ql, hl],
    queryFn: async () =>
      unwrap(
        await bot.api.players({ guildId: guildId! })
          .get({ query: { ql: String(ql), hl: String(hl) } }),
      ),
    enabled: !!guildId,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  })
}

/* ── Paginated queue / history ────────────────────────────── */

export function usePlayerQueue(
  guildId: string | undefined,
  offset: number,
  limit: number,
) {
  return useQuery({
    queryKey: ["player-queue", guildId, offset, limit],
    queryFn: async () =>
      unwrap(
        await bot.api.players({ guildId: guildId! })
          .queue.get({ query: { offset: String(offset), limit: String(limit) } }),
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
  return useQuery({
    queryKey: ["player-history", guildId, offset, limit],
    queryFn: async () =>
      unwrap(
        await bot.api.players({ guildId: guildId! })
          .history.get({ query: { offset: String(offset), limit: String(limit) } }),
      ),
    enabled: !!guildId && offset > 0,
    staleTime: Infinity,
  })
}

/* ── Guilds ───────────────────────────────────────────────── */

export function useGuilds() {
  return useQuery({
    queryKey: ["guilds"],
    queryFn: async () => unwrap(await bot.api.guilds.get()),
    staleTime: Infinity,
  })
}

export function useGuild(
  guildId: string | undefined,
  opts: { memberLimit?: number } = {},
) {
  const ml = opts.memberLimit ?? 20
  return useQuery({
    queryKey: ["guild", guildId, ml],
    queryFn: async () =>
      unwrap(
        await bot.api.guilds({ guildId: guildId! })
          .get({ query: { ml: String(ml) } }),
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
  return useQuery({
    queryKey: ["guild-members", guildId, offset, limit, search],
    queryFn: async () =>
      unwrap(
        await bot.api.guilds({ guildId: guildId! })
          .members.get({
            query: {
              offset: String(offset),
              limit: String(limit),
              ...(search ? { search } : {}),
            },
          }),
      ),
    enabled: !!guildId && (offset > 0 || search.length > 0),
    staleTime: Infinity,
  })
}

/* ── Logs — fetched once, new entries pushed via WebSocket ── */

export function useGlobalLogs(limit = 50) {
  return useQuery({
    queryKey: ["global-logs", limit],
    queryFn: async () =>
      unwrap(await bot.api.logs.get({ query: { limit: String(limit) } })),
    staleTime: Infinity,
  })
}

export function useGuildLogs(guildId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["guild-logs", guildId, limit],
    queryFn: async () =>
      unwrap(
        await bot.api.logs({ guildId: guildId! })
          .get({ query: { limit: String(limit) } }),
      ),
    enabled: !!guildId,
    staleTime: Infinity,
  })
}

/* ── BotSettings ──────────────────────────────────────────── */

export function useBotSettings() {
  return useQuery({
    queryKey: ["bot-settings"],
    queryFn: async () => unwrap(await bot.api.control.settings.get()),
    staleTime: Infinity,
  })
}

export function useUpdateBotSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (patch: { commandsEnabled?: boolean; slogans?: string[] }) => {
      const result = await bot.api.control.settings.patch(patch)
      return unwrap(result)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["bot-settings"], data)
    },
  })
}

/* ── Player actions ───────────────────────────────────────── */

export function useDestroyPlayer(guildId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      return unwrap(await bot.api.players({ guildId }).delete())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] })
      queryClient.removeQueries({ queryKey: ["player", guildId] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
    },
  })
}

export function useClearQueue(guildId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      return unwrap(await bot.api.players({ guildId }).clear.post())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player", guildId] })
    },
  })
}

/* ── User guilds (mutual guilds cached via React Query) ─── */

async function fetchUserGuilds() {
  const [userRes, botRes] = await Promise.all([
    rest.rest["my-guilds"].get(),
    bot.api.guilds.get(),
  ])
  const guilds = userRes.data?.guilds ?? []
  const botGuilds = botRes.data ?? []
  const botGuildIds = new Set(
    (botGuilds as { id: string }[]).map((g) => g.id),
  )
  return { guilds, botGuildIds }
}

export function useUserGuilds() {
  return useQuery({
    queryKey: ["user-guilds"],
    queryFn: fetchUserGuilds,
    staleTime: 5 * 60 * 1000, // cache 5 min
  })
}

/* ── Guild actions ────────────────────────────────────────── */

export function useLeaveGuild(guildId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      return unwrap(await bot.api.guilds({ guildId }).delete())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guilds"] })
      queryClient.removeQueries({ queryKey: ["guild", guildId] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
    },
  })
}

/* ── Re-exported types (inferred from hooks) ──────────────── */

export type PlayerDetail = NonNullable<ReturnType<typeof usePlayer>["data"]>
export type PlayerSummary = NonNullable<ReturnType<typeof usePlayers>["data"]>[number]
export type Track = PlayerDetail["queue"][number]
export type GuildInfo = NonNullable<ReturnType<typeof useGuilds>["data"]>[number]
export type ActivityEntry = NonNullable<ReturnType<typeof useGlobalLogs>["data"]>[number]
export type DiscordGuild = NonNullable<Awaited<ReturnType<typeof fetchUserGuilds>>["guilds"]>[number]
