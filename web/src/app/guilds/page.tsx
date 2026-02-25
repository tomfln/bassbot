"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { usePlayers } from "@/hooks/use-api"
import {
  Server,
  Music,
  Search,
  X,
  Radio,
} from "lucide-react"

/* ── Types ────────────────────────────────────────────────── */

interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

/* ── User guilds page ─────────────────────────────────────── */

export default function UserGuildsPage() {
  const [userGuilds, setUserGuilds] = useState<DiscordGuild[]>([])
  const [botGuildIds, setBotGuildIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const { data: players } = usePlayers()

  useEffect(() => {
    async function load() {
      try {
        // Fetch user's guilds from our web backend (which uses stored Discord token)
        const userRes = await fetch("/rest/my-guilds")
        if (userRes.ok) {
          const data = await userRes.json() as { guilds: DiscordGuild[] }
          setUserGuilds(data.guilds)
        }

        // Fetch bot's guilds from bot API
        const { getApiUrl } = await import("@/lib/api")
        const botRes = await fetch(`${getApiUrl()}/api/guilds`)
        if (botRes.ok) {
          const guilds = await botRes.json() as { id: string }[]
          setBotGuildIds(new Set(guilds.map(g => g.id)))
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
    return userGuilds
      .filter(g => botGuildIds.has(g.id))
      .filter(g =>
        !search ||
        g.name.toLowerCase().includes(search.toLowerCase()),
      )
  }, [userGuilds, botGuildIds, search])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <h1 className="text-2xl font-bold tracking-tight">My Servers</h1>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mutualGuilds.map((guild) => {
            const player = playerMap.get(guild.id)
            const isPlaying = player?.current && !player.paused

            return (
              <Link key={guild.id} href={`/guilds/${guild.id}`}>
                <Card className="py-0 gap-0 hover:border-white/15 transition-colors cursor-pointer group">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-lg shrink-0">
                      <AvatarImage src={guild.icon ?? undefined} />
                      <AvatarFallback className="rounded-lg text-xs">
                        {guild.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {guild.name}
                      </p>
                      {player?.current ? (
                        <p className="text-xs text-muted-foreground truncate">
                          {player.current.title} — {player.current.author}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">No music playing</p>
                      )}
                    </div>

                    {player?.current && (
                      <Badge
                        variant={isPlaying ? "default" : "outline"}
                        className="text-[10px] px-1.5 py-0 shrink-0"
                      >
                        {isPlaying ? (
                          <>
                            <Radio className="h-2.5 w-2.5 mr-0.5 animate-pulse" />
                            Live
                          </>
                        ) : (
                          <>
                            <Music className="h-2.5 w-2.5 mr-0.5" />
                            Paused
                          </>
                        )}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
