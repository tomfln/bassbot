"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { GuildCard } from "@/components/guild-card"
import { usePlayers, useUserGuilds } from "@/hooks/use-api"
import {
  Server,
  Search,
  X,
} from "lucide-react"

/* ── User guilds page ─────────────────────────────────────── */

export default function UserGuildsPage() {
  const [search, setSearch] = useState("")
  const { data: userGuildsData, isLoading } = useUserGuilds()
  const { data: players } = usePlayers()

  // Build player map for quick lookup
  const playerMap = useMemo(() => {
    const map = new Map<string, { current: { title: string; author: string } | null; paused: boolean }>()
    if (players) {
      for (const p of players) {
        map.set(p.guildId, { current: p.current, paused: p.paused })
      }
    }
    return map
  }, [players])

  // Mutual guilds (user is in AND bot is in)
  const mutualGuilds = useMemo(() => {
    if (!userGuildsData) return []
    return userGuildsData.guilds
      .filter(g => userGuildsData.botGuildIds.has(g.id))
      .filter(g =>
        !search ||
        g.name.toLowerCase().includes(search.toLowerCase()),
      )
  }, [userGuildsData, search])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="min-h-12 flex items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Guilds</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Servers you share with bassbot
          </p>
        </div>
      </div>

      {/* Search */}
      {mutualGuilds.length > 3 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search servers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-card pl-9 pr-8 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Guild list */}
      {mutualGuilds.length === 0 ? (
        <Card className="py-0 gap-0">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Server className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No shared servers found</p>
            <p className="text-sm mt-1">
              {search
                ? "No servers match your search."
                : "You don't share any servers with bassbot yet. Invite the bot to one of your servers!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {mutualGuilds.map((guild) => {
            const player = playerMap.get(guild.id)

            return (
              <GuildCard
                key={guild.id}
                id={guild.id}
                name={guild.name}
                icon={guild.icon}
                href={`/guilds/${guild.id}`}
                currentSong={player?.current}
                paused={player?.paused}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
