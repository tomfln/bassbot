import { useState, useMemo } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useGlobalLogs, useGuilds } from "@/hooks/use-api"
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
  Search,
  Server,
  Zap,
  X,
  ChevronDown,
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

const ALL_ACTIONS = Object.keys(ACTION_ICONS)

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

export function LogsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const guildFilter = searchParams.get("guild") ?? ""
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [showCount, setShowCount] = useState(20)

  const { data: logs } = useGlobalLogs(200)
  const { data: guilds } = useGuilds()

  const filtered = useMemo(() => {
    if (!logs) return []
    return logs.filter((entry) => {
      if (guildFilter && entry.guildId !== guildFilter) return false
      if (actionFilter !== "all" && entry.action !== actionFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          entry.userName.toLowerCase().includes(q) ||
          entry.detail.toLowerCase().includes(q) ||
          entry.guildName?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [logs, guildFilter, actionFilter, search])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Activity Logs
      </h1>

      {/* Search bar — full width on mobile, flex-grow on desktop */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 pl-9 text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters row — flex-grow on mobile */}
      <div className="flex flex-row items-stretch sm:items-center gap-2">
        {/* Guild filter */}
        <Select
          value={guildFilter || "all"}
          onValueChange={(v) => {
            if (v === "all") {
              setSearchParams({})
            } else {
              setSearchParams({ guild: v })
            }
          }}
        >
          <SelectTrigger className="flex-1 sm:flex-initial sm:w-[220px] rounded-lg border-border bg-card py-2 h-auto text-sm">
            <SelectValue placeholder="All guilds" />
          </SelectTrigger>
          <SelectContent className="rounded-lg p-1.5">
            <SelectItem value="all" className="rounded-md py-2.5 pl-3 pr-8">
              <Server className="size-3.5 text-muted-foreground shrink-0" />
              All guilds
            </SelectItem>
            {guilds?.map((g) => (
              <SelectItem key={g.id} value={g.id} className="rounded-md py-2.5 pl-3 pr-8">
                <Server className="size-3.5 text-muted-foreground shrink-0" />
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Action filter */}
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="flex-1 sm:flex-initial sm:w-[200px] rounded-lg border-border bg-card py-2 h-auto text-sm">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent className="rounded-lg p-1.5">
            <SelectItem value="all" className="rounded-md py-2.5 pl-3 pr-8">
              <Zap className="size-3.5 text-muted-foreground shrink-0" />
              All actions
            </SelectItem>
            {ALL_ACTIONS.map((action) => {
              const ActionIcon = ACTION_ICONS[action]
              return (
                <SelectItem key={action} value={action} className="rounded-md py-2.5 pl-3 pr-8">
                  <ActionIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  {action}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

      </div>

      {/* Log entries — show more pattern */}
      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No matching logs
          </p>
        ) : (
          <>
            {filtered.slice(0, showCount).map((entry, i) => {
              const Icon = ACTION_ICONS[entry.action] ?? Play
              const iconBg = ACTION_BG_COLORS[entry.action] ?? "bg-primary"
              return (
                <div
                  key={`${entry.timestamp}-${i}`}
                  className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors"
                >
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
                      {entry.guildName && (
                        <>
                          <span>&middot;</span>
                          <Link
                            to={`/guilds/${entry.guildId}`}
                            className="truncate hover:text-foreground transition-colors"
                          >
                            {entry.guildName}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {filtered.length > showCount && (
              <button
                onClick={() => setShowCount((c) => c + 20)}
                className="flex items-center justify-center gap-1.5 w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                Show more ({filtered.length - showCount} remaining)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
