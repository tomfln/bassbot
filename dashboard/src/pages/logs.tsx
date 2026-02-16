import { useState, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LogEntry } from "@/components/log-entry"
import { useGlobalLogs, useGuilds } from "@/hooks/use-api"
import { ACTION_ICONS, ALL_ACTIONS } from "@/lib/constants"
import {
  Search,
  Server,
  Zap,
  X,
  ChevronDown,
} from "lucide-react"

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
      <h1 className="text-2xl font-bold tracking-tight min-h-12 flex items-center">
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
            {filtered.slice(0, showCount).map((entry, i) => (
              <LogEntry
                key={`${entry.timestamp}-${i}`}
                entry={entry}
                showGuild
                linkGuild
              />
            ))}
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
