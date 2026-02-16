import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Link } from "react-router-dom"
import { Pause, Play, Music } from "lucide-react"
import type { PlayerInfo } from "@/lib/api"

function AvatarStack({
  members,
}: {
  members: { id: string; avatar: string; displayName: string }[]
}) {
  const max = 4
  const visible = members.slice(0, max)
  const overflow = members.length - max

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((m) => (
        <Avatar key={m.id} className="h-7 w-7 border-2 border-card">
          <AvatarImage src={m.avatar} />
          <AvatarFallback className="text-[10px]">
            {m.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div className="h-7 w-7 rounded-full border-2 border-card bg-muted flex items-center justify-center">
          <span className="text-[10px] font-medium text-muted-foreground">
            +{overflow}
          </span>
        </div>
      )}
    </div>
  )
}

export function PlayerCard({ player }: { player: PlayerInfo }) {
  return (
    <Link to={`/players/${player.guildId}`} className="block">
      <Card className="hover:bg-accent/30 transition-colors cursor-pointer py-0 gap-0">
        <CardContent className="p-2.5">
          <div className="flex h-24 gap-2.5">
            {/* Album art — inset rounded rect */}
            <div className="w-24 h-24 shrink-0 relative rounded-lg overflow-hidden bg-muted">
              {player.current?.artworkUrl ? (
                <img
                  src={player.current.artworkUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Music className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {/* Guild icon overlay — bottom right of album art */}
              {player.guildIcon ? (
                <img
                  src={player.guildIcon}
                  alt=""
                  className="absolute bottom-1 right-1 h-6 w-6 rounded-md border-2 border-card shadow-md object-cover"
                />
              ) : (
                <div className="absolute bottom-1 right-1 h-6 w-6 rounded-md border-2 border-card shadow-md bg-muted flex items-center justify-center">
                  <span className="text-[9px] font-medium text-muted-foreground">
                    {player.guildName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info section */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              {/* Top row: pills */}
              <div className="flex items-center justify-end gap-1.5">
                <Badge
                  variant="secondary"
                  className="text-[11px] px-2 py-0.5 shrink-0"
                >
                  {player.queue.length + (player.current ? 1 : 0)} song
                  {player.queue.length + (player.current ? 1 : 0) !== 1
                    ? "s"
                    : ""}
                </Badge>
                <Badge
                  variant={player.paused ? "secondary" : "default"}
                  className="text-[11px] px-2 py-0.5 shrink-0"
                >
                  {player.paused ? (
                    <Pause className="h-3 w-3 mr-1" />
                  ) : (
                    <Play className="h-3 w-3 mr-1" />
                  )}
                  {player.paused ? "Paused" : "Playing"}
                </Badge>
              </div>

              {/* Middle: track info */}
              <div className="min-w-0">
                {player.current ? (
                  <>
                    <p className="text-sm font-semibold truncate leading-tight">
                      {player.current.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {player.current.author}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No track playing
                  </p>
                )}
              </div>

              {/* Bottom row: guild name + node · avatar stack */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground truncate">
                  {player.guildName} · {player.node}
                </span>
                {player.voiceChannel &&
                  player.voiceChannel.members.length > 0 && (
                    <AvatarStack members={player.voiceChannel.members} />
                  )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
