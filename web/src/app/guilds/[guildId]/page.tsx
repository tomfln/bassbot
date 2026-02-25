"use client"

import { useState, useCallback, use } from "react"
import Link from "next/link"
import Image from "next/image"
import { GuildIcon } from "@/components/guild-icon"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePlayer, useGuildLogs } from "@/hooks/use-api"
import { formatDuration } from "@/lib/format"
import { getApiUrl } from "@/lib/api"
import { ActivityLog } from "@/components/activity-log"
import { TrackList } from "@/components/track-list"
import { PlayBar } from "@/components/play-bar"
import { VoiceChannelCard } from "@/components/voice-channel-card"
import { useOptimisticPosition } from "@/hooks/use-optimistic-position"
import {
  ArrowLeft,
  Music,
  ListMusic,
  History,
  Activity,
  Pause,
  Play,
} from "lucide-react"

/* ── JWT helper ───────────────────────────────────────────── */

let _jwt: string | null = null
let _jwtExpiry = 0

async function getJwt(): Promise<string | null> {
  // Return cached JWT if still valid (with 60s buffer)
  if (_jwt && Date.now() < _jwtExpiry - 60_000) return _jwt

  try {
    const res = await fetch("/rest/jwt")
    if (!res.ok) return null
    const data = await res.json() as { token: string }
    _jwt = data.token

    // Parse expiry from JWT payload
    const parts = data.token.split(".")
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]!))
      _jwtExpiry = (payload.exp ?? 0) * 1000
    }
    return _jwt
  } catch {
    return null
  }
}

/** Send an authenticated request to the bot API */
async function botFetch(path: string, init?: RequestInit): Promise<Response> {
  const jwt = await getJwt()
  const base = getApiUrl()
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
  })
}

/* ── Main page ────────────────────────────────────────────── */

export default function UserPlayerPage({
  params,
}: {
  params: Promise<{ guildId: string }>
}) {
  const { guildId } = use(params)
  const [queueLimit, setQueueLimit] = useState(20)
  const [historyLimit, setHistoryLimit] = useState(10)
  const { data: player, isLoading, refetch } = usePlayer(guildId, {
    queueLimit,
    historyLimit,
  })
  const { data: logs } = useGuildLogs(guildId, 20)

  const position = useOptimisticPosition(
    player?.position ?? 0,
    player?.current?.length ?? 0,
    player?.paused ?? true,
  )

  const progress =
    player?.current && player.current.length > 0
      ? (position / player.current.length) * 100
      : 0

  const handleRefresh = useCallback(() => {
    setTimeout(() => refetch(), 300)
  }, [refetch])

  const handleQueueReorder = useCallback(
    async (from: number, to: number) => {
      try {
        await botFetch(`/api/players/${guildId}/queue/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to }),
        })
        refetch()
      } catch {
        /* ignore */
      }
    },
    [guildId, refetch],
  )

  const handleQueueRemove = useCallback(
    async (index: number) => {
      try {
        await botFetch(`/api/players/${guildId}/queue/remove`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index }),
        })
        refetch()
      } catch {
        /* ignore */
      }
    },
    [guildId, refetch],
  )

  const handlePlayNext = useCallback(
    async (index: number) => {
      if (index === 0) return // already first
      try {
        await botFetch(`/api/players/${guildId}/queue/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: index, to: 0 }),
        })
        refetch()
      } catch {
        /* ignore */
      }
    },
    [guildId, refetch],
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="space-y-6">
        <Link
          href="/guilds"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to servers
        </Link>
        <Card className="py-0 gap-0">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Music className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No active player</p>
            <p className="text-sm mt-1">
              Nobody is playing music in this server right now.
              Use <code className="text-primary">/play</code> in Discord to get started!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4 min-h-12">
        <Link
          href="/guilds"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <GuildIcon name={player.guildName} icon={player.guildIcon} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight">{player.guildName}</h1>
          <p className="text-xs text-muted-foreground">
            {player.paused ? "Paused" : "Now Playing"}
          </p>
        </div>
      </div>

      {/* Now Playing card — admin-style with blurred artwork */}
      <Card className="overflow-hidden relative py-0 gap-0">
        {player.current?.artworkUrl && (
          <div
            className="absolute inset-0 opacity-15 blur-2xl scale-110"
            style={{
              backgroundImage: `url(${player.current.artworkUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
        <CardContent className="p-4 relative">
          {player.current ? (
            <div className="space-y-3">
              <div className="flex gap-4">
                {player.current.artworkUrl ? (
                  <Image
                    src={player.current.artworkUrl}
                    alt=""
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-lg object-cover shrink-0 shadow-lg"
                    unoptimized
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Music className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {player.current.title}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {player.current.author}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={player.paused ? "outline" : "default"} className="text-xs">
                      {player.paused ? "Paused" : "Playing"}
                    </Badge>
                    {player.queueTotal > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {player.queueTotal} in queue
                      </span>
                    )}
                  </div>
                </div>
                {/* Play/Pause icon */}
                <div className="shrink-0 relative flex items-center justify-center w-6 h-6">
                  <div
                    className="absolute inset-0 rounded-full blur-md opacity-40"
                    style={{ background: player.paused ? "transparent" : "oklch(0.77 0.20 131)" }}
                  />
                  {player.paused ? (
                    <Pause className="h-6 w-6 text-muted-foreground relative" />
                  ) : (
                    <Play className="h-6 w-6 text-primary relative" />
                  )}
                </div>
              </div>
              {/* Progress bar */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatDuration(position)}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-black/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatDuration(player.current.length)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nothing playing right now</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PlayBar below info card */}
      <PlayBar
        guildId={guildId}
        paused={player.paused}
        loopMode={player.loopMode}
        volume={player.volume}
        onAction={botFetch}
        onRefresh={handleRefresh}
      />

      {/* Tabs: Queue / History / Activity */}
      <Tabs defaultValue="queue">
        <TabsList className="h-11 p-1 max-sm:w-full max-sm:*:flex-1">
          <TabsTrigger value="queue" className="gap-1.5 text-xs px-3 py-1.5">
            <ListMusic className="h-3.5 w-3.5" />
            Queue ({player.queueTotal})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs px-3 py-1.5">
            <History className="h-3.5 w-3.5" />
            History ({player.historyTotal})
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs px-3 py-1.5">
            <Activity className="h-3.5 w-3.5" />
            Activity
          </TabsTrigger>
        </TabsList>
        <TabsContent value="queue">
          {player.queueTotal === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Queue is empty
            </p>
          ) : (
            <TrackList
              tracks={player.queue}
              total={player.queueTotal}
              onReorder={handleQueueReorder}
              onRemove={handleQueueRemove}
              onPlayNext={handlePlayNext}
              onLoadMore={() => setQueueLimit((l) => l + 20)}
            />
          )}
        </TabsContent>
        <TabsContent value="history">
          {player.historyTotal === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No history
            </p>
          ) : (
            <TrackList
              tracks={player.history}
              total={player.historyTotal}
              onLoadMore={() => setHistoryLimit((l) => l + 10)}
            />
          )}
        </TabsContent>
        <TabsContent value="activity">
          <ActivityLog
            entries={logs ?? []}
            maxHeight="400px"
            limit={20}
          />
        </TabsContent>
      </Tabs>

      {/* Voice channel — below content */}
      <VoiceChannelCard voiceChannel={player.voiceChannel} compact />
    </div>
  )
}
