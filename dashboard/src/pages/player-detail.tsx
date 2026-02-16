import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePlayer, useGuildLogs } from "@/hooks/use-api"
import { formatDuration, formatUptime } from "@/lib/format"
import { ActivityLog } from "@/components/activity-log"
import { TrackList } from "@/components/track-list"
import { useOptimisticPosition } from "@/hooks/use-optimistic-position"
import {
  ArrowLeft,
  Pause,
  Play,
  Music,
  Headphones,
  ListMusic,
  History,
  Activity,
  Cpu,
  MemoryStick,
  Info,
} from "lucide-react"

/* ── Right‑column sub‑components ─────────────────────────── */

interface VoiceChannelCardProps {
  voiceChannel: {
    name: string
    members: { id: string; displayName: string; avatar: string }[]
  } | null
}

function VoiceChannelCard({ voiceChannel }: VoiceChannelCardProps) {
  return (
    <Card className="py-0 gap-0">
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Headphones className="h-4 w-4" />
          Voice Channel
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {voiceChannel ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">{voiceChannel.name}</p>
            {voiceChannel.members.length === 0 ? (
              <p className="text-xs text-muted-foreground">No listeners</p>
            ) : (
              <div className="space-y-2">
                {voiceChannel.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="text-xs">
                        {member.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">
                      {member.displayName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Not in a voice channel
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface NodeStatsCardProps {
  node: string
  nodeStats: {
    players: number
    playingPlayers: number
    uptime: number
    cpu: { cores: number; systemLoad: number; lavalinkLoad: number }
    memory: { used: number; allocated: number }
    frameStats?: { sent: number; nulled: number; deficit: number } | null
  } | null
}

function NodeStatsCard({ node, nodeStats }: NodeStatsCardProps) {
  return (
    <Card className="py-0 gap-0">
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Node: {node}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {nodeStats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Players</p>
                <p className="text-sm font-medium">
                  {nodeStats.playingPlayers} / {nodeStats.players}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Uptime</p>
                <p className="text-sm font-medium">
                  {formatUptime(nodeStats.uptime / 1000)}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Cpu className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">CPU</p>
                <span className="text-[11px] text-muted-foreground opacity-50">
                  ({nodeStats.cpu.cores} core{nodeStats.cpu.cores !== 1 ? "s" : ""})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">System</p>
                  <p className="text-sm font-medium tabular-nums">
                    {(nodeStats.cpu.systemLoad * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Lavalink</p>
                  <p className="text-sm font-medium tabular-nums">
                    {(nodeStats.cpu.lavalinkLoad * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <MemoryStick className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Memory</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">Used</p>
                  <p className="text-sm font-medium tabular-nums">
                    {(nodeStats.memory.used / 1024 / 1024).toFixed(0)} MB
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Allocated</p>
                  <p className="text-sm font-medium tabular-nums">
                    {(nodeStats.memory.allocated / 1024 / 1024).toFixed(0)} MB
                  </p>
                </div>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (nodeStats.memory.used / nodeStats.memory.allocated) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {nodeStats.frameStats && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Frames</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Sent</p>
                    <p className="text-sm font-medium tabular-nums">
                      {nodeStats.frameStats.sent}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Nulled</p>
                    <p className="text-sm font-medium tabular-nums">
                      {nodeStats.frameStats.nulled}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Deficit</p>
                    <p className="text-sm font-medium tabular-nums">
                      {nodeStats.frameStats.deficit}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No stats available
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function PlayerDetailPage() {
  const { guildId } = useParams<{ guildId: string }>()
  const [queueLimit, setQueueLimit] = useState(10)
  const [historyLimit, setHistoryLimit] = useState(10)
  const { data: player, isLoading, error } = usePlayer(guildId, { queueLimit, historyLimit })
  const { data: guildLogs } = useGuildLogs(guildId)

  const optimisticPosition = useOptimisticPosition(
    player?.position ?? 0,
    player?.current?.length ?? 0,
    player?.paused ?? true,
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !player) {
    return (
      <div className="space-y-4">
        <Link
          to="/players"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to players
        </Link>
        <Card className="py-0 gap-0">
          <CardContent className="p-6 text-center text-muted-foreground">
            <p className="text-lg font-medium">Player not found</p>
            <p className="text-sm mt-1">This guild may not have an active player</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const progress =
    player.current && player.current.length > 0
      ? (optimisticPosition / player.current.length) * 100
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 min-h-12">
        <Link
          to="/players"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Avatar className="h-10 w-10 rounded-lg">
          <AvatarImage src={player.guildIcon ?? undefined} />
          <AvatarFallback className="rounded-lg">
            {player.guildName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{player.guildName}</h1>
          <p className="text-xs text-muted-foreground">
            Node: {player.node}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left column — Now playing + Queue */}
        <div className="space-y-4 min-w-0">
          {/* Now playing */}
          <Card className="overflow-hidden relative py-0 gap-0">
            {/* Background blur artwork */}
            {player.current?.artworkUrl && (
              <div
                className="absolute inset-0 opacity-15 blur-2xl scale-110"
                style={{ backgroundImage: `url(${player.current.artworkUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
              />
            )}
            <CardContent className="p-4 relative">
              {player.current ? (
                <div className="space-y-3">
                  <div className="flex gap-4">
                    {player.current.artworkUrl ? (
                      <img
                        src={player.current.artworkUrl}
                        alt=""
                        className="h-20 w-20 rounded-lg object-cover shrink-0 shadow-lg"
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
                  {/* Progress bar below all content */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDuration(optimisticPosition)}
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
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nothing playing
                </p>
              )}
            </CardContent>
          </Card>

          {/* Queue / History / Logs tabs */}
          <Tabs defaultValue="queue">
            <TabsList className="h-11 p-1 max-sm:w-full max-sm:[&>*]:flex-1">
              <TabsTrigger value="queue" className="gap-1.5 text-xs px-3 py-1.5">
                <ListMusic className="h-3.5 w-3.5" />
                Queue ({player.queueTotal})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5 text-xs px-3 py-1.5">
                <History className="h-3.5 w-3.5" />
                History ({player.historyTotal})
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-1.5 text-xs px-3 py-1.5">
                <Activity className="h-3.5 w-3.5" />
                Logs
              </TabsTrigger>
              <TabsTrigger value="info" className="gap-1.5 text-xs px-3 py-1.5 lg:hidden">
                <Info className="h-3.5 w-3.5" />
                Info
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
                  onLoadMore={() => setQueueLimit((l) => l + 10)}
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
            <TabsContent value="logs">
              <ActivityLog
                entries={guildLogs ?? []}
                maxHeight="400px"
                limit={10}
                seeAllHref={`/logs?guild=${guildId}`}
              />
            </TabsContent>
            <TabsContent value="info" className="lg:hidden">
              <div className="space-y-4">
                <VoiceChannelCard voiceChannel={player.voiceChannel} />
                <NodeStatsCard node={player.node} nodeStats={player.nodeStats} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column — hidden on mobile (shown in Info tab instead) */}
        <div className="hidden lg:block space-y-4">
          <VoiceChannelCard voiceChannel={player.voiceChannel} />
          <NodeStatsCard node={player.node} nodeStats={player.nodeStats} />
        </div>
      </div>
    </div>
  )
}
