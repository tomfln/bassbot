import { Link } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ACTION_ICONS, ACTION_BG_COLORS } from "@/lib/constants"
import { formatRelativeTime } from "@/lib/format"
import { Play } from "lucide-react"
import type { ActivityEntry } from "@/lib/api"

export function LogEntry({
  entry,
  showGuild = false,
  linkGuild = false,
}: {
  entry: ActivityEntry
  showGuild?: boolean
  linkGuild?: boolean
}) {
  const Icon = ACTION_ICONS[entry.action] ?? Play
  const iconBg = ACTION_BG_COLORS[entry.action] ?? "bg-primary"

  return (
    <div className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors">
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarImage src={entry.userAvatar} />
          <AvatarFallback className="text-xs">
            {entry.userName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div
          className={`absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full ${iconBg} border-2 border-card flex items-center justify-center`}
        >
          <Icon className="h-2.5 w-2.5 text-black" strokeWidth={1.5} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-tight">
          <span className="font-medium">{entry.userName}</span>{" "}
          <span className="text-muted-foreground">{entry.detail}</span>
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{formatRelativeTime(entry.timestamp)}</span>
          {showGuild && entry.guildName && (
            <>
              <span>&middot;</span>
              {linkGuild ? (
                <Link
                  to={`/guilds/${entry.guildId}`}
                  className="truncate hover:text-foreground transition-colors"
                >
                  {entry.guildName}
                </Link>
              ) : (
                <span className="truncate">{entry.guildName}</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
