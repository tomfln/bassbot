"use client"

import { useState, useCallback, use } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePlayer, useGuildLogs } from "@/hooks/use-api"
import { formatDuration } from "@/lib/format"
import { getApiUrl } from "@/lib/api"
import { ActivityLog } from "@/components/activity-log"
import { TrackList } from "@/components/track-list"
import { useOptimisticPosition } from "@/hooks/use-optimistic-position"
import {
  ArrowLeft,
  Pause,
  Play,
  SkipForward,
  SkipBack,
  Repeat,
  Repeat1,
  Shuffle,
  Music,
  Headphones,
  ListMusic,
  History,
  Activity,
  Search,
  AlertCircle,
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

/* ── Types ────────────────────────────────────────────────── */

interface VoiceChannelCardProps {
  voiceChannel: {
    name: string
    members: { id: string; displayName: string; avatar: string }[]
  } | null
}

/* ── Sub-components ───────────────────────────────────────── */

function VoiceChannelCard({ voiceChannel }: VoiceChannelCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Headphones className="h-4 w-4" />
          Voice Channel
        </CardTitle>
      </CardHeader>
      <CardContent>
        {voiceChannel ? (
          <div>
            <p className="text-sm font-medium">{voiceChannel.name}</p>
            <div className="mt-2 space-y-1.5">
              {voiceChannel.members.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={m.avatar} />
                    <AvatarFallback className="text-[9px]">
                      {m.displayName.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate">
                    {m.displayName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not connected</p>
        )}
      </CardContent>
    </Card>
  )
}

function ProgressBar({
  position,
  length,
}: {
  position: number
  length: number
}) {
  const pct = length > 0 ? Math.min((position / length) * 100, 100) : 0

  return (
    <div className="space-y-1">
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>{formatDuration(position)}</span>
        <span>{formatDuration(length)}</span>
      </div>
    </div>
  )
}

/* ── Player controls ──────────────────────────────────────── */

function PlayerControls({
  guildId,
  paused,
  loopMode,
  onRefresh,
}: {
  guildId: string
  paused: boolean
  loopMode?: string
  onRefresh: () => void
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function sendAction(action: string) {
    setLoading(action)
    setError(null)
    try {
      const res = await botFetch(`/api/players/${guildId}/${action}`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? `Action failed (${res.status})`)
      }
      onRefresh()
    } catch {
      setError("Failed to send command")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => sendAction("shuffle")}
          disabled={loading !== null}
          title="Shuffle queue"
        >
          <Shuffle className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => sendAction("prev")}
          disabled={loading !== null}
          title="Previous track"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="default"
          size="icon"
          className="h-11 w-11 rounded-full"
          onClick={() => sendAction(paused ? "resume" : "pause")}
          disabled={loading !== null}
        >
          {loading === "pause" || loading === "resume" ? (
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          ) : paused ? (
            <Play className="h-5 w-5 ml-0.5" />
          ) : (
            <Pause className="h-5 w-5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => sendAction("next")}
          disabled={loading !== null}
          title="Next track"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => sendAction("loop")}
          disabled={loading !== null}
          title="Toggle loop"
        >
          {loopMode === "track" ? (
            <Repeat1 className="h-4 w-4 text-primary" />
          ) : loopMode === "queue" ? (
            <Repeat className="h-4 w-4 text-primary" />
          ) : (
            <Repeat className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive justify-center">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}
    </div>
  )
}

/* ── Search bar ───────────────────────────────────────────── */

function SearchBar({
  guildId,
  onRefresh,
}: {
  guildId: string
  onRefresh: () => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<
    { title: string; author: string; uri: string; length: number }[]
  >([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await botFetch(
        `/api/players/${guildId}/search?q=${encodeURIComponent(query.trim())}`,
      )
      if (res.ok) {
        const data = await res.json() as { results: typeof results }
        setResults(data.results ?? [])
      }
    } catch {
      /* ignore */
    } finally {
      setSearching(false)
    }
  }

  async function addTrack(uri: string) {
    setAdding(uri)
    try {
      const res = await botFetch(`/api/players/${guildId}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri }),
      })
      if (res.ok) {
        onRefresh()
        // Remove from results to indicate it was added
        setResults((prev) => prev.filter((r) => r.uri !== uri))
      }
    } catch {
      /* ignore */
    } finally {
      setAdding(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Search className="h-4 w-4" />
          Search & Add
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search for a song…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
          />
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={searching || !query.trim()}
          >
            {searching ? (
              <div className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              "Search"
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {results.map((r) => (
              <div
                key={r.uri}
                className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.author} • {formatDuration(r.length)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-xs"
                  onClick={() => addTrack(r.uri)}
                  disabled={adding === r.uri}
                >
                  {adding === r.uri ? "Adding…" : "+ Add"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Main page ────────────────────────────────────────────── */

export default function UserPlayerPage({
  params,
}: {
  params: Promise<{ guildId: string }>
}) {
  const { guildId } = use(params)
  const { data: player, isLoading, refetch } = usePlayer(guildId, {
    queueLimit: 20,
    historyLimit: 10,
  })
  const { data: logs } = useGuildLogs(guildId, 20)

  const position = useOptimisticPosition(
    player?.position ?? 0,
    player?.current?.length ?? 0,
    player?.paused ?? true,
  )

  const handleRefresh = useCallback(() => {
    // Small delay for state to propagate on the bot side
    setTimeout(() => refetch(), 300)
  }, [refetch])

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
      <div className="space-y-3">
        <Link
          href="/guilds"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to servers
        </Link>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-lg">
            <AvatarImage src={player.guildIcon ?? undefined} />
            <AvatarFallback className="rounded-lg text-xs">
              {player.guildName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{player.guildName}</h1>
            <p className="text-xs text-muted-foreground">
              {player.paused ? "Paused" : "Now Playing"}
            </p>
          </div>
        </div>
      </div>

      {/* Now Playing Card */}
      <Card>
        <CardContent className="p-6 space-y-4">
          {player.current ? (
            <>
              <div className="flex items-start gap-4">
                {player.current.artworkUrl && (
                  <Image
                    src={player.current.artworkUrl}
                    alt=""
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-lg object-cover shrink-0"
                    unoptimized
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate">
                    {player.current.title}
                  </h2>
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
              </div>

              <ProgressBar position={position} length={player.current.length} />

              <PlayerControls
                guildId={guildId}
                paused={player.paused}
                loopMode={(player as unknown as { loopMode?: string }).loopMode}
                onRefresh={handleRefresh}
              />
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nothing playing right now</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Queue */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ListMusic className="h-4 w-4" />
                Queue
                {player.queueTotal > 0 && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    {player.queueTotal}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {player.queue.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Queue is empty
                </p>
              ) : (
                <TrackList tracks={player.queue} />
              )}
            </CardContent>
          </Card>

          {/* History */}
          {player.history.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <History className="h-4 w-4" />
                  History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrackList tracks={player.history} />
              </CardContent>
            </Card>
          )}

          {/* Activity */}
          {logs && logs.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Activity className="h-4 w-4" />
                Recent Activity
              </h3>
              <ActivityLog entries={logs} maxHeight="300px" limit={20} />
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Search */}
          <SearchBar guildId={guildId} onRefresh={handleRefresh} />

          {/* Voice channel */}
          <VoiceChannelCard voiceChannel={player.voiceChannel} />
        </div>
      </div>
    </div>
  )
}
