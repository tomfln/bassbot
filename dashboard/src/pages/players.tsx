import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { usePlayers } from "@/hooks/use-api"
import { formatDuration } from "@/lib/format"
import { Link } from "react-router-dom"
import { Radio, Pause, Play } from "lucide-react"

export function PlayersPage() {
  const { data: players, isLoading } = usePlayers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Players</h1>
        {players && (
          <span className="text-sm text-muted-foreground">
            {players.length} player{players.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !players?.length ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Radio className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No active players</p>
            <p className="text-sm mt-1">Players will appear here when music is playing</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {players.map((player) => (
            <Link
              key={player.guildId}
              to={`/players/${player.guildId}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Guild avatar */}
                    <Avatar className="h-12 w-12 rounded-lg">
                      <AvatarImage src={player.guildIcon ?? undefined} />
                      <AvatarFallback className="rounded-lg">
                        {player.guildName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
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

                      {player.current ? (
                        <>
                          <p className="text-sm truncate">
                            {player.current.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {player.current.author}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {formatDuration(player.position)}
                            </span>
                            <Progress
                              value={
                                player.current.length > 0
                                  ? (player.position / player.current.length) * 100
                                  : 0
                              }
                              className="h-1 flex-1"
                            />
                            <span className="text-xs text-muted-foreground w-10">
                              {formatDuration(player.current.length)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No track playing
                        </p>
                      )}
                    </div>

                    {/* Queue + listeners */}
                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      <p>{player.queue.length} queued</p>
                      {player.voiceChannel && (
                        <p className="mt-1">
                          {player.voiceChannel.members.length} listener{player.voiceChannel.members.length !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
