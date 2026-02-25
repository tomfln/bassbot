"use client"

import Image from "next/image"
import { formatDuration } from "@/lib/format"
import { Music, ExternalLink } from "lucide-react"

interface SongCardProps {
  current: {
    title: string
    author: string
    artworkUrl: string | null
    uri: string | null
    length: number
  } | null
  position: number
  progress: number
  /** Text shown when nothing is playing */
  emptyText?: string
}

/**
 * Now-playing display with blurred artwork background, progress bar, and
 * optional link to the track source. Shared by user & admin player pages.
 */
export function SongCard({
  current,
  position,
  progress,
  emptyText = "Nothing playing right now",
}: SongCardProps) {
  return (
    <div className="overflow-hidden relative rounded-xl p-4">
      {current?.artworkUrl && (
        <div
          className="absolute inset-0 opacity-50 blur-2xl scale-110"
          style={{
            backgroundImage: `url(${current.artworkUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <div className="relative">
        {current ? (
          <div className="space-y-3">
            <div className="flex gap-4 items-start">
              {current.artworkUrl ? (
                <Image
                  src={current.artworkUrl}
                  alt=""
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-lg object-cover shrink-0 shadow-lg"
                  unoptimized
                />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Music className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{current.title}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {current.author}
                </p>
              </div>
              {current.uri && (
                <a
                  href={current.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  title="Open source"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            {/* Progress bar */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatDuration(position)}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-black/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatDuration(current.length)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{emptyText}</p>
          </div>
        )}
      </div>
    </div>
  )
}
