import { ScrollArea } from "@/components/ui/scroll-area"
import { Link } from "react-router-dom"
import { LogEntry } from "@/components/log-entry"
import { ArrowRight } from "lucide-react"
import type { ActivityEntry } from "@/lib/api"

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
      {displayed.map((entry) => (
        <LogEntry
          key={`${entry.guildId}-${entry.userId}-${entry.timestamp}`}
          entry={entry}
          showGuild={showGuild}
        />
      ))}
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
