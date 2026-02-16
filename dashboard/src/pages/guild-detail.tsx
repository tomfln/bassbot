import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useGuild, useGuildLogs, useGuildMembers } from "@/hooks/use-api"
import { formatDate } from "@/lib/format"
import { ActivityLog } from "@/components/activity-log"
import {
  ArrowLeft,
  Crown,
  Users,
  Calendar,
  Music,
  Bot,
  Activity,
  Search,
  X,
  ChevronDown,
} from "lucide-react"

export function GuildDetailPage() {
  const { guildId } = useParams<{ guildId: string }>()
  const [memberLimit, setMemberLimit] = useState(20)
  const [memberSearch, setMemberSearch] = useState("")
  const { data: guild, isLoading, error } = useGuild(guildId, { memberLimit })
  const { data: guildLogs } = useGuildLogs(guildId, 10)
  // Server-side search: only active when user types a search query
  const { data: searchResults } = useGuildMembers(guildId, 0, 200, memberSearch)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !guild) {
    return (
      <div className="space-y-4">
        <Link
          to="/guilds"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to guilds
        </Link>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p className="text-lg font-medium">Guild not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // When searching, use server-side filtered results; otherwise use guild detail members
  const displayMembers = memberSearch
    ? (searchResults?.items ?? [])
    : guild.members
  const displayTotal = memberSearch
    ? (searchResults?.total ?? 0)
    : guild.memberTotal

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 min-h-12">
        <Link
          to="/guilds"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Avatar className="h-12 w-12 rounded-lg">
          <AvatarImage src={guild.icon ?? undefined} />
          <AvatarFallback className="rounded-lg">
            {guild.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">
            {guild.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            {guild.memberCount.toLocaleString()} members
          </p>
        </div>
        {guild.hasPlayer && (
          <Link to={`/players/${guild.id}`}>
            <Badge variant="default" className="gap-1">
              <Music className="h-3 w-3" />
              Active Player
            </Badge>
          </Link>
        )}
      </div>

      {/* Info cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">{formatDate(guild.createdAt)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Owner
            </CardTitle>
          </CardHeader>
          <CardContent>
            {guild.owner ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={guild.owner.avatar} />
                  <AvatarFallback className="text-xs">
                    {guild.owner.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold truncate">
                  {guild.owner.displayName}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unknown</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">{guild.humanCount.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Bots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">{guild.botCount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Member list */}
        <MemberList
          members={displayMembers}
          total={displayTotal}
          search={memberSearch}
          onSearchChange={setMemberSearch}
          onShowMore={() => {
            if (memberSearch) {
              // Search already fetches up to 200, no more to load
            } else {
              setMemberLimit((l) => l + 20)
            }
          }}
        />

        {/* Activity Log */}
        <div className="space-y-3 order-last">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </h3>
          <ActivityLog
            entries={guildLogs ?? []}
            maxHeight="440px"
            limit={10}
            seeAllHref={`/logs?guild=${guildId}`}
          />
        </div>
      </div>
    </div>
  )
}

/* ── Member list with search + show-more ──────────────────── */

interface MemberInfo {
  id: string
  displayName: string
  username: string
  avatar: string
  isBot: boolean
  isOwner: boolean
  joinedAt?: number | null
}

function MemberList({
  members,
  total,
  search,
  onSearchChange,
  onShowMore,
}: {
  members: MemberInfo[]
  total: number
  search: string
  onSearchChange: (v: string) => void
  onShowMore: () => void
}) {
  const remaining = total - members.length

  return (
    <Card className="py-0 gap-0">
      <CardHeader className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 shrink-0">
            <Users className="h-4 w-4" />
            Members ({total})
          </CardTitle>
          <div className="relative w-full max-w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 pl-8 text-xs outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
            />
            {search && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No members found
          </p>
        ) : (
          <div className="space-y-0.5">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className="text-xs">
                    {member.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {member.displayName}
                    </span>
                    {member.isOwner && (
                      <Crown className="h-3 w-3 text-amber-400 shrink-0" />
                    )}
                    {member.isBot && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 h-4 shrink-0"
                      >
                        BOT
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.username}
                  </p>
                </div>
                {member.joinedAt && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDate(member.joinedAt)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {remaining > 0 && (
          <button
            onClick={onShowMore}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Show more ({remaining} remaining)
          </button>
        )}
      </CardContent>
    </Card>
  )
}
