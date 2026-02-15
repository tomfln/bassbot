import { useParams, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePlayer, useGuildLogs } from "@/hooks/use-api"
import { formatDuration } from "@/lib/format"
import { ActivityLog } from "@/components/activity-log"
import {
  ArrowLeft,
  Pause,
  Play,
  Music,
  Headphones,
  ListMusic,
  History,
  Activity,
} from "lucide-react"
import type { Track } from "@/lib/api"

function TrackRow({
  track,
  index,
  active,
}: {
  track: Track
  index: number
  active?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-md ${
        active ? "bg-primary/10" : "hover:bg-accent/50"
      }`}
    >
      <span className="text-xs text-muted-foreground w-4 text-right shrink-0">
        {index + 1}
      </span>
      {track.artworkUrl ? (
        <img
          src={track.artworkUrl}
          alt=""
          className="h-8 w-8 rounded object-cover shrink-0"
        />
      ) : (
        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
          <Music className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-tight truncate ${active ? "text-primary font-medium" : ""}`}>
          {track.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">{track.author}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {formatDuration(track.length)}
      </span>
    </div>
  )
}

export function PlayerDetailPage() {
  const { guildId } = useParams<{ guildId: string }>()
  const { data: player, isLoading, error } = usePlayer(guildId)
  const { data: guildLogs } = useGuildLogs(guildId)

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
      ? (player.position / player.current.length) * 100
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
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
        <div className="space-y-6">
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDuration(player.position)}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-black/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
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
            <TabsList className="h-10 p-1">
              <TabsTrigger value="queue" className="gap-1.5 text-xs">
                <ListMusic className="h-3.5 w-3.5" />
                Queue ({player.queue.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5 text-xs">
                <History className="h-3.5 w-3.5" />
                History ({player.history.length})
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-1.5 text-xs">
                <Activity className="h-3.5 w-3.5" />
                Logs
              </TabsTrigger>
            </TabsList>
            <TabsContent value="queue">
              <Card className="py-0 gap-0">
                <CardContent className="p-2">
                  {player.queue.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Queue is empty
                    </p>
                  ) : (
                    <ScrollArea className="max-h-[400px] overflow-hidden">
                      <div>
                        {player.queue.map((track, i) => (
                          <TrackRow key={i} track={track} index={i} />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history">
              <Card className="py-0 gap-0">
                <CardContent className="p-2">
                  {player.history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No history
                    </p>
                  ) : (
                    <ScrollArea className="max-h-[400px] overflow-hidden">
                      <div>
                        {player.history.map((track, i) => (
                          <TrackRow key={i} track={track} index={i} />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="logs">
              <Card className="py-0 gap-0">
                <CardContent className="p-2">
                  <ActivityLog
                    entries={guildLogs ?? []}
                    maxHeight="400px"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column — Voice Channel members */}
        <div>
          <Card className="py-0 gap-0">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Headphones className="h-4 w-4" />
                Voice Channel
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {player.voiceChannel ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">{player.voiceChannel.name}</p>
                  {player.voiceChannel.members.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No listeners</p>
                  ) : (
                    <div className="space-y-2">
                      {player.voiceChannel.members.map((member) => (
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
        </div>
      </div>
    </div>
  )
}
