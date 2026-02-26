"use client"

import { useState, useCallback, use } from "react"
import Link from "next/link"
import { GuildIcon } from "@/components/guild-icon"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePlayer, useGuildLogs } from "@/hooks/use-api"
import { botApi } from "@/lib/api-client"
import { ActivityLog } from "@/components/activity-log"
import { TrackList } from "@/components/track-list"
import { PlayBar } from "@/components/play-bar"
import { SongCard } from "@/components/song-card"
import { VoiceChannelCard } from "@/components/voice-channel-card"
import { useOptimisticPosition } from "@/hooks/use-optimistic-position"
import {
  ArrowLeft,
  Music,
  ListMusic,
  History,
  Activity,
} from "lucide-react"

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
        await botApi.players({ guildId }).queue.move.post({ from, to })
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
        await botApi.players({ guildId }).queue.remove.post({ index })
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
        await botApi.players({ guildId }).queue.move.post({ from: index, to: 0 })
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

      {/* Now Playing card */}
      <SongCard
        current={player.current}
        position={position}
        progress={progress}
      />

      {/* PlayBar below info card */}
      <PlayBar
        guildId={guildId}
        paused={player.paused}
        loopMode={player.loopMode}
        volume={player.volume}
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
