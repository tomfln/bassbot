"use client"

import { Card, CardContent } from "@web/components/ui/card"
import { Skeleton } from "@web/components/ui/skeleton"
import { GuildCard } from "@web/components/guild-card"
import { useGuilds } from "@web/hooks/use-api"
import { useRouter } from "next/navigation"

export default function AdminGuildsPage() {
  const { data: guilds, isLoading } = useGuilds()
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between min-h-12">
        <h1 className="text-2xl font-bold tracking-tight">Guilds</h1>
        {guilds && (
          <span className="text-sm text-muted-foreground">
            {guilds.length} guild{guilds.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {guilds
            ?.sort((a, b) => (a.hasPlayer === b.hasPlayer ? 0 : a.hasPlayer ? -1 : 1))
            .map((guild) => (
              <GuildCard
                key={guild.id}
                id={guild.id}
                name={guild.name}
                icon={guild.icon}
                href={`/admin/guilds/${guild.id}`}
                memberCount={guild.memberCount}
                currentSong={guild.currentSong}
                playerHref={guild.hasPlayer ? `/admin/players/${guild.id}` : undefined}
                onClick={() => router.push(`/admin/guilds/${guild.id}`)}
              />
            ))}
        </div>
      )}
    </div>
  )
}
