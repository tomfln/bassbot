"use client"

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { getApiUrl } from "@/lib/api"
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

const BASE = getApiUrl()

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json() as Promise<T>
}

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
  if (entries.length === 0) return ""
  return "?" + new URLSearchParams(entries).toString()
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
    queryFn: () => fetchApi("/api/stats"),
    staleTime: Infinity,
  })
}

/* ── Players ──────────────────────────────────────────────── */

export function usePlayers() {
  return useQuery<PlayerSummary[]>({
    queryKey: ["players"],
    queryFn: () => fetchApi("/api/players"),
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
      fetchApi(`/api/players/${guildId}${qs({ ql: String(ql), hl: String(hl) })}`),
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
  return useQuery<PaginatedResponse<Track>>({
    queryKey: ["player-queue", guildId, offset, limit],
    queryFn: () =>
      fetchApi(`/api/players/${guildId}/queue${qs({ offset: String(offset), limit: String(limit) })}`),
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
      fetchApi(`/api/players/${guildId}/history${qs({ offset: String(offset), limit: String(limit) })}`),
    enabled: !!guildId && offset > 0,
    staleTime: Infinity,
  })
}

/* ── Guilds ───────────────────────────────────────────────── */

export function useGuilds() {
  return useQuery<GuildInfo[]>({
    queryKey: ["guilds"],
    queryFn: () => fetchApi("/api/guilds"),
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
      fetchApi(`/api/guilds/${guildId}${qs({ ml: String(ml) })}`),
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
      fetchApi(`/api/guilds/${guildId}/members${qs({
        offset: String(offset),
        limit: String(limit),
        search: search || undefined,
      })}`),
    enabled: !!guildId && (offset > 0 || search.length > 0),
    staleTime: Infinity,
  })
}

/* ── Logs — fetched once, new entries pushed via WebSocket ── */

export function useGlobalLogs(limit = 50) {
  return useQuery<ActivityEntry[]>({
    queryKey: ["global-logs", limit],
    queryFn: () => fetchApi(`/api/logs${qs({ limit: String(limit) })}`),
    staleTime: Infinity,
  })
}

export function useGuildLogs(guildId: string | undefined, limit = 50) {
  return useQuery<ActivityEntry[]>({
    queryKey: ["guild-logs", guildId, limit],
    queryFn: () =>
      fetchApi(`/api/logs/${guildId}${qs({ limit: String(limit) })}`),
    enabled: !!guildId,
    staleTime: Infinity,
  })
}

/* ── BotSettings ──────────────────────────────────────────── */

export type BotSettings = { commandsEnabled: boolean; slogans: string[] }

export function useBotSettings() {
  return useQuery<BotSettings>({
    queryKey: ["bot-settings"],
    queryFn: () => fetchApi("/api/control/settings"),
    staleTime: Infinity,
  })
}

export function useUpdateBotSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<BotSettings>) =>
      fetchApi<BotSettings>("/api/control/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData<BotSettings>(["bot-settings"], data)
    },
  })
}

/* ── Player actions ───────────────────────────────────────── */

export function useDestroyPlayer(guildId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      fetchApi<{ ok: boolean }>(`/api/players/${guildId}`, { method: "DELETE" }),
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
    mutationFn: () =>
      fetchApi<{ ok: boolean }>(`/api/players/${guildId}/clear`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player", guildId] })
    },
  })
}

/* ── Guild actions ────────────────────────────────────────── */

export function useLeaveGuild(guildId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      fetchApi<{ ok: boolean }>(`/api/guilds/${guildId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guilds"] })
      queryClient.removeQueries({ queryKey: ["guild", guildId] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
    },
  })
}
