import { useParams, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useGuild, useGuildLogs } from "@/hooks/use-api"
import { ActivityLog } from "@/components/activity-log"
import {
  ArrowLeft,
  Crown,
  Users,
  Calendar,
  Music,
  Bot,
  Activity,
} from "lucide-react"

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function GuildDetailPage() {
  const { guildId } = useParams<{ guildId: string }>()
  const { data: guild, isLoading, error } = useGuild(guildId)
  const { data: guildLogs } = useGuildLogs(guildId)

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

  const humans = guild.members.filter((m) => !m.isBot)
  const bots = guild.members.filter((m) => m.isBot)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
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
            <p className="text-sm font-semibold">{humans.length.toLocaleString()}</p>
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
            <p className="text-sm font-semibold">{bots.length.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Member list */}
        <Card className="py-0 gap-0">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members ({guild.members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="max-h-[500px] overflow-hidden">
              <div className="space-y-0.5">
                {guild.members
                  .sort((a, b) => {
                    if (a.isOwner) return -1
                    if (b.isOwner) return 1
                    if (a.isBot !== b.isBot) return a.isBot ? 1 : -1
                    return a.displayName.localeCompare(b.displayName)
                  })
                  .map((member) => (
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
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0">
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
            </ScrollArea>
          </CardContent>
        </Card>

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
