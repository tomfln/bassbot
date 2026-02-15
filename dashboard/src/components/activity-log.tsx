import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

const ACTION_COLORS: Record<string, string> = {
  play: "text-green-400",
  skip: "text-blue-400",
  prev: "text-blue-400",
  pause: "text-yellow-400",
  resume: "text-green-400",
  stop: "text-red-400",
  clear: "text-red-400",
  remove: "text-red-400",
  shuffle: "text-purple-400",
  volume: "text-orange-400",
  loop: "text-cyan-400",
  seek: "text-amber-400",
  move: "text-indigo-400",
  loadqueue: "text-teal-400",
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
}: {
  entries: ActivityEntry[]
  showGuild?: boolean
  maxHeight?: string
}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No activity yet
      </p>
    )
  }

  return (
    <ScrollArea className="overflow-hidden" style={{ maxHeight }}>
      <div className="space-y-0.5 pr-3">
        {entries.map((entry, i) => {
          const Icon = ACTION_ICONS[entry.action] ?? Play
          const iconColor = ACTION_COLORS[entry.action] ?? "text-primary"
          return (
            <div
              key={`${entry.timestamp}-${i}`}
              className="flex items-start gap-2.5 px-2 py-1.5 rounded-md hover:bg-accent/30 transition-colors"
            >
              <div className="mt-0.5 shrink-0 h-6 w-6 rounded-md bg-accent/50 flex items-center justify-center">
                <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
              </div>
              <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                <AvatarImage src={entry.userAvatar} />
                <AvatarFallback className="text-[10px]">
                  {entry.userName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
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
    </ScrollArea>
  )
}
