"use client"

import Link from "next/link"
import { Card, CardContent } from "@web/components/ui/card"
import { Badge } from "@web/components/ui/badge"
import { GuildIcon } from "@web/components/guild-icon"
import { Music, Radio, Users } from "lucide-react"

interface GuildCardProps {
  id: string
  name: string
  icon?: string | null
  href: string
  /** Member count — shown as a badge when provided */
  memberCount?: number
  /** Currently playing song — shown below guild name */
  currentSong?: { title: string; author?: string } | null
  /** Whether the player is paused */
  paused?: boolean
  /** Extra badge linking to the player page */
  playerHref?: string
  onClick?: (e: React.MouseEvent) => void
}

export function GuildCard({
  name,
  icon,
  href,
  memberCount,
  currentSong,
  paused,
  playerHref,
  onClick,
}: GuildCardProps) {
  const isPlaying = !!currentSong && !paused

  const content = (
    <Card className="py-0 gap-0 hover:bg-accent/30 hover:text-primary transition-colors cursor-pointer scope-hover scope-2xl">
      <CardContent className="p-2.5">
        <div className="flex h-16 gap-2.5">
          {/* Guild icon — large, like album art in player cards */}
          <GuildIcon
            name={name}
            icon={icon}
            className="h-16 w-16 rounded-lg text-lg"
          />

          {/* Info section */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
            {/* Guild name */}
            <p className="text-sm font-semibold truncate leading-tight">
              {name}
            </p>

            {/* Currently playing song OR idle text */}
            {currentSong ? (
              <p className="text-xs text-muted-foreground truncate leading-tight">
                {currentSong.title}
                {currentSong.author && ` — ${currentSong.author}`}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/60 truncate leading-tight">
                No music playing
              </p>
            )}
          </div>

          {/* Badges column */}
          <div className="flex flex-col items-end justify-between py-0.5 shrink-0">
            <div className="flex items-center gap-1.5">
              {memberCount != null && (
                <Badge
                  variant="secondary"
                  className="text-[11px] px-2 py-0.5 shrink-0"
                >
                  <Users className="h-3 w-3 mr-1" />
                  {memberCount.toLocaleString()}
                </Badge>
              )}
            </div>

            {currentSong && (
              <div onClick={(e) => playerHref && e.stopPropagation()}>
                {playerHref ? (
                  <Link href={playerHref} className="shrink-0">
                    <Badge
                      variant={isPlaying ? "default" : "outline"}
                      className="text-[10px] px-1.5 py-0 hover:bg-primary/80"
                    >
                      {isPlaying ? (
                        <>
                          <Radio className="h-2.5 w-2.5 mr-0.5 animate-pulse" />
                          Live
                        </>
                      ) : (
                        <>
                          <Music className="h-2.5 w-2.5 mr-0.5" />
                          Paused
                        </>
                      )}
                    </Badge>
                  </Link>
                ) : (
                  <Badge
                    variant={isPlaying ? "default" : "outline"}
                    className="text-[10px] px-1.5 py-0 shrink-0"
                  >
                    {isPlaying ? (
                      <>
                        <Radio className="h-2.5 w-2.5 mr-0.5 animate-pulse" />
                        Live
                      </>
                    ) : (
                      <>
                        <Music className="h-2.5 w-2.5 mr-0.5" />
                        Paused
                      </>
                    )}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (onClick) {
    return (
      <div className="block cursor-pointer" onClick={onClick}>
        {content}
      </div>
    )
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  )
}
