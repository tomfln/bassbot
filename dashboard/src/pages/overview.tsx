import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useStats, usePlayers, useGlobalLogs } from "@/hooks/use-api"
import { formatUptime, formatDuration } from "@/lib/format"
import { ActivityLog } from "@/components/activity-log"
import { Link } from "react-router-dom"
import {
  Server,
  Users,
  Music,
  Clock,
  Radio,
  Pause,
  Play,
  Activity,
} from "lucide-react"
import type { ReactNode } from "react"

function StatCard({
  title,
  value,
  icon,
  description,
  color,
}: {
  title: string
  value: string | number
  icon: ReactNode
  description?: string
  color?: string
}) {
  return (
    <Card className="relative overflow-hidden">
      {color && (
        <div
          className="absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-15 blur-2xl"
          style={{ background: color }}
        />
      )}
      <div className="relative">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div style={color ? { color } : undefined} className={color ? "" : "text-muted-foreground"}>
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </CardContent>
      </div>
    </Card>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function OverviewPage() {
  const { data: stats, isLoading: statsLoading } = useStats()
  const { data: players, isLoading: playersLoading } = usePlayers()
  const { data: logs } = useGlobalLogs(30)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* Stats grid */}
      {statsLoading || !stats ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Guilds"
            value={stats.guildCount}
            icon={<Server className="h-4 w-4" />}
            color="oklch(0.77 0.20 131)"
          />
          <StatCard
            title="Users"
            value={stats.userCount.toLocaleString()}
            icon={<Users className="h-4 w-4" />}
            color="oklch(0.72 0.19 155)"
          />
          <StatCard
            title="Active Players"
            value={`${stats.activePlayers} / ${stats.totalPlayers}`}
            icon={<Music className="h-4 w-4" />}
            color="oklch(0.80 0.18 85)"
          />
          <StatCard
            title="Uptime"
            value={formatUptime(stats.uptime)}
            icon={<Clock className="h-4 w-4" />}
            description={`${stats.lavalinkNodes} Lavalink node${stats.lavalinkNodes !== 1 ? "s" : ""}`}
            color="oklch(0.70 0.15 250)"
          />
        </div>
      )}

      {/* Active players */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Active Players</h2>
        {playersLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !players?.length ? (
          <Card className="py-0 gap-0">
            <CardContent className="p-6 text-center text-muted-foreground">
              <Radio className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active players</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {players.filter(p => p.current).map((player) => (
              <Link
                key={player.guildId}
                to={`/players/${player.guildId}`}
                className="block"
              >
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer py-0 gap-0">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage src={player.guildIcon ?? undefined} />
                        <AvatarFallback className="rounded-lg text-xs">
                          {player.guildName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {player.guildName}
                          </span>
                          <Badge
                            variant={player.paused ? "secondary" : "default"}
                            className="shrink-0 text-xs"
                          >
                            {player.paused ? (
                              <Pause className="h-3 w-3 mr-1" />
                            ) : (
                              <Play className="h-3 w-3 mr-1" />
                            )}
                            {player.paused ? "Paused" : "Playing"}
                          </Badge>
                        </div>
                        {player.current && (
                          <div className="mt-1">
                            <p className="text-sm truncate">
                              {player.current.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {player.current.author} &middot;{" "}
                              {formatDuration(player.current.length)}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{player.queue.length} in queue</span>
                          {player.voiceChannel && (
                            <>
                              <span>&middot;</span>
                              <span>
                                {player.voiceChannel.members.length} listener{player.voiceChannel.members.length !== 1 ? "s" : ""}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Activity
        </h2>
        <Card className="py-0 gap-0">
          <CardContent className="p-2">
            <ActivityLog
              entries={logs ?? []}
              showGuild
              maxHeight="350px"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
