import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link } from "react-router-dom"
import { Pause, Play, Music } from "lucide-react"
import type { PlayerSummary } from "@/lib/api"

export function PlayerCard({ player }: { player: PlayerSummary }) {
  return (
    <Link to={`/players/${player.guildId}`} className="block">
      <Card className="hover:bg-accent/30 transition-colors cursor-pointer py-0 gap-0 scope-hover scope-2xl">
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
                  {player.queueLength + (player.current ? 1 : 0)} song
                  {player.queueLength + (player.current ? 1 : 0) !== 1
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

              {/* Bottom row: guild name + node · listener count */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground truncate">
                  {player.guildName} · {player.node}
                </span>
                {player.voiceChannel &&
                  player.voiceChannel.memberCount > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                      {player.voiceChannel.memberCount} listener{player.voiceChannel.memberCount !== 1 ? "s" : ""}
                    </Badge>
                  )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
