import { useState } from "react"
import { formatDuration } from "@/lib/format"
import { Music, ChevronDown } from "lucide-react"
import type { Track } from "@/lib/api"

const INITIAL_ITEMS = 10
const LOAD_MORE_COUNT = 10

export function TrackRow({
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
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${
        active
          ? "bg-primary/10 border-primary/20"
          : "bg-card border-border hover:bg-accent/50"
      }`}
    >
      <span className="text-xs text-muted-foreground w-4 text-center shrink-0">
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

export function TrackList({
  tracks,
  activeIndex,
}: {
  tracks: Track[]
  activeIndex?: number
}) {
  const [showCount, setShowCount] = useState(INITIAL_ITEMS)
  const displayed = tracks.slice(0, showCount)
  const remaining = tracks.length - showCount

  return (
    <div className="space-y-1.5">
      {displayed.map((track, i) => (
        <TrackRow key={i} track={track} index={i} active={i === activeIndex} />
      ))}
      {remaining > 0 && (
        <button
          onClick={() => setShowCount((c) => c + LOAD_MORE_COUNT)}
          className="flex items-center justify-center gap-1.5 w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Show more ({remaining} remaining)
        </button>
      )}
    </div>
  )
}
