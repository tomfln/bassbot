import { useParams, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePlayer } from "@/hooks/use-api"
import { formatDuration } from "@/lib/format"
import {
  ArrowLeft,
  Pause,
  Play,
  Music,
  Headphones,
  ListMusic,
  History,
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
      className={`flex items-center gap-3 px-3 py-2 rounded-md ${
        active ? "bg-primary/10" : "hover:bg-accent/50"
      }`}
    >
      <span className="text-xs text-muted-foreground w-6 text-right shrink-0">
        {index + 1}
      </span>
      {track.artworkUrl ? (
        <img
          src={track.artworkUrl}
          alt=""
          className="h-9 w-9 rounded object-cover shrink-0"
        />
      ) : (
        <div className="h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0">
          <Music className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${active ? "text-primary font-medium" : ""}`}>
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
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Music className="h-4 w-4" />
                Now Playing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {player.current ? (
                <div className="flex gap-4">
                  {player.current.artworkUrl ? (
                    <img
                      src={player.current.artworkUrl}
                      alt=""
                      className="h-24 w-24 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Music className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={player.paused ? "secondary" : "default"}
                        className="text-xs"
                      >
                        {player.paused ? (
                          <Pause className="h-3 w-3 mr-1" />
                        ) : (
                          <Play className="h-3 w-3 mr-1" />
                        )}
                        {player.paused ? "Paused" : "Playing"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {player.current.sourceName}
                      </Badge>
                    </div>
                    <h3 className="font-semibold truncate mt-2">
                      {player.current.title}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {player.current.author}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {formatDuration(player.position)}
                      </span>
                      <Progress value={progress} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-10">
                        {formatDuration(player.current.length)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nothing playing
                </p>
              )}
            </CardContent>
          </Card>

          {/* Queue / History tabs */}
          <Tabs defaultValue="queue">
            <TabsList>
              <TabsTrigger value="queue" className="gap-1.5">
                <ListMusic className="h-3.5 w-3.5" />
                Queue ({player.queue.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <History className="h-3.5 w-3.5" />
                History ({player.history.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="queue">
              <Card>
                <CardContent className="p-2">
                  {player.queue.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Queue is empty
                    </p>
                  ) : (
                    <ScrollArea className="max-h-[400px]">
                      <div className="space-y-0.5">
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
              <Card>
                <CardContent className="p-2">
                  {player.history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No history
                    </p>
                  ) : (
                    <ScrollArea className="max-h-[400px]">
                      <div className="space-y-0.5">
                        {player.history.map((track, i) => (
                          <TrackRow key={i} track={track} index={i} />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column — Voice Channel members */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Headphones className="h-4 w-4" />
                Voice Channel
              </CardTitle>
            </CardHeader>
            <CardContent>
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
