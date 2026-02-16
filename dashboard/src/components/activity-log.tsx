import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Link } from "react-router-dom"
import type { ActivityEntry } from "@/lib/api"
import {
  Play,
  SkipForward,
  SkipBack,
  Pause,
  Square,
  Trash2,
  Shuffle,
  Volume2,
  Repeat,
  Timer,
  ArrowUpDown,
  ListPlus,
  PlayCircle,
  ArrowRight,
} from "lucide-react"

const ACTION_ICONS: Record<string, typeof Play> = {
  play: Play,
  skip: SkipForward,
  prev: SkipBack,
  pause: Pause,
  resume: PlayCircle,
  stop: Square,
  clear: Trash2,
  remove: Trash2,
  shuffle: Shuffle,
  volume: Volume2,
  loop: Repeat,
  seek: Timer,
  move: ArrowUpDown,
  loadqueue: ListPlus,
}

const ACTION_BG_COLORS: Record<string, string> = {
  play: "bg-green-500",
  skip: "bg-blue-500",
  prev: "bg-blue-500",
  pause: "bg-yellow-500",
  resume: "bg-green-500",
  stop: "bg-red-500",
  clear: "bg-red-500",
  remove: "bg-red-500",
  shuffle: "bg-purple-500",
  volume: "bg-orange-500",
  loop: "bg-cyan-500",
  seek: "bg-amber-500",
  move: "bg-indigo-500",
  loadqueue: "bg-teal-500",
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)

  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function ActivityLog({
  entries,
  showGuild = false,
  maxHeight = "400px",
  limit,
  seeAllHref,
}: {
  entries: ActivityEntry[]
  showGuild?: boolean
  maxHeight?: string
  limit?: number
  seeAllHref?: string
}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No activity yet
      </p>
    )
  }

  const displayed = limit ? entries.slice(0, limit) : entries

  const items = (
    <div className="space-y-1.5">
      {displayed.map((entry, i) => {
        const Icon = ACTION_ICONS[entry.action] ?? Play
        const iconBg = ACTION_BG_COLORS[entry.action] ?? "bg-primary"
        return (
          <div
            key={`${entry.timestamp}-${i}`}
            className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors"
          >
            {/* User avatar with action icon overlay */}
            <div className="relative shrink-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={entry.userAvatar} />
                <AvatarFallback className="text-xs">
                  {entry.userName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full ${iconBg} border-2 border-card flex items-center justify-center`}
              >
                <Icon className="h-2 w-2 text-white dark:text-black" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-tight">
                <span className="font-medium">{entry.userName}</span>{" "}
                <span className="text-muted-foreground">{entry.detail}</span>
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{formatRelativeTime(entry.timestamp)}</span>
                {showGuild && (
                  <>
                    <span>&middot;</span>
                    <span className="truncate">{entry.guildName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div>
      {limit ? (
        items
      ) : (
        <ScrollArea style={{ maxHeight }}>
          {items}
        </ScrollArea>
      )}
      {seeAllHref && (
        <Link
          to={seeAllHref}
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pt-3"
        >
          See all logs
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}
