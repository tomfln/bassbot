import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useGuilds } from "@/hooks/use-api"
import { Link } from "react-router-dom"
import { Users, Music } from "lucide-react"

export function GuildsPage() {
  const { data: guilds, isLoading } = useGuilds()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Guilds</h1>
        {guilds && (
          <span className="text-sm text-muted-foreground">
            {guilds.length} guild{guilds.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {guilds
            ?.sort((a, b) => (a.hasPlayer === b.hasPlayer ? 0 : a.hasPlayer ? -1 : 1))
            .map((guild) => {
              const content = (
                <Card
                  className={
                    guild.hasPlayer
                      ? "hover:bg-accent/50 transition-colors cursor-pointer"
                      : "opacity-75"
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage src={guild.icon ?? undefined} />
                        <AvatarFallback className="rounded-lg text-xs">
                          {guild.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {guild.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{guild.memberCount.toLocaleString()}</span>
                        </div>
                      </div>
                      {guild.hasPlayer && (
                        <Badge variant="default" className="shrink-0">
                          <Music className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )

              return guild.hasPlayer ? (
                <Link key={guild.id} to={`/players/${guild.id}`} className="block">
                  {content}
                </Link>
              ) : (
                <div key={guild.id}>{content}</div>
              )
            })}
        </div>
      )}
    </div>
  )
}
