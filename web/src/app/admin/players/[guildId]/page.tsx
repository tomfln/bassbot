"use client"

import { useState, useCallback, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card"
import { Skeleton } from "@web/components/ui/skeleton"
import { GuildIcon } from "@web/components/guild-icon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@web/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@web/components/ui/dropdown-menu"
import { ConfirmDialog } from "@web/components/confirm-dialog"
import { Button } from "@web/components/ui/button"
import { usePlayer, useGuildLogs, useDestroyPlayer, useClearQueue } from "@web/hooks/use-api"
import { formatUptime } from "@web/lib/format"
import { ActivityLog } from "@web/components/activity-log"
import { TrackList } from "@web/components/track-list"
import { PlayBar } from "@web/components/play-bar"
import { SongCard } from "@web/components/song-card"
import { VoiceChannelCard } from "@web/components/voice-channel-card"
import { useOptimisticPosition } from "@web/hooks/use-optimistic-position"
import {
  ArrowLeft,
  ListMusic,
  History,
  Activity,
  Cpu,
  MemoryStick,
  Info,
  MoreVertical,
  Trash2,
  ListX,
} from "lucide-react"

/* ── Right‑column sub‑components ─────────────────────────── */

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

export default function AdminPlayerDetailPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = use(params)
  const router = useRouter()
  const [queueLimit, setQueueLimit] = useState(10)
  const [historyLimit, setHistoryLimit] = useState(10)
  const [confirmDestroy, setConfirmDestroy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const { data: player, isLoading, error, refetch } = usePlayer(guildId, { queueLimit, historyLimit })
  const { data: guildLogs } = useGuildLogs(guildId)
  const destroyPlayer = useDestroyPlayer(guildId)
  const clearQueue = useClearQueue(guildId)

  const optimisticPosition = useOptimisticPosition(
    player?.position ?? 0,
    player?.current?.length ?? 0,
    player?.paused ?? true,
  )

  const handleRefresh = useCallback(() => {
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

  if (error || !player) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/players"
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
          href="/admin/players"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <GuildIcon name={player.guildName} icon={player.guildIcon} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight">{player.guildName}</h1>
          <p className="text-xs text-muted-foreground">
            Node: {player.node}
          </p>
        </div>
        {/* Action menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onClick={() => setConfirmClear(true)}
            >
              <ListX className="h-4 w-4 text-muted-foreground" />
              Clear Queue
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="gap-2 cursor-pointer"
              onClick={() => setConfirmDestroy(true)}
            >
              <Trash2 className="h-4 w-4" />
              Destroy Player
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Confirm: clear queue */}
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear queue?"
        description="This will remove all tracks from the queue. The current track will keep playing."
        confirmLabel="Clear"
        onConfirm={() => clearQueue.mutate()}
      />

      {/* Confirm: destroy player */}
      <ConfirmDialog
        open={confirmDestroy}
        onOpenChange={setConfirmDestroy}
        title="Destroy player?"
        description="The bot will stop playing and leave the voice channel. The queue will be saved."
        confirmLabel="Destroy"
        destructive
        onConfirm={() => destroyPlayer.mutate(undefined, { onSuccess: () => router.push("/admin/players") })}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left column — Now playing + Queue */}
        <div className="space-y-4 min-w-0">
          {/* Now playing */}
          <SongCard
            current={player.current}
            position={optimisticPosition}
            progress={progress}
            emptyText="Nothing playing"
          />

          {/* PlayBar */}
          <PlayBar
            guildId={guildId}
            paused={player.paused}
            loopMode={player.loopMode}
            volume={player.volume}
            onRefresh={handleRefresh}
          />

          {/* Queue / History / Logs tabs */}
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
                seeAllHref={`/admin/logs?guild=${guildId}`}
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
