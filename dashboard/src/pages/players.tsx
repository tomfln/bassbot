import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { usePlayers } from "@/hooks/use-api"
import { Radio } from "lucide-react"
import { PlayerCard } from "@/components/player-card"

export function PlayersPage() {
  const { data: players, isLoading } = usePlayers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between min-h-12">
        <h1 className="text-2xl font-bold tracking-tight">Players</h1>
        {players && (
          <span className="text-sm text-muted-foreground">
            {players.length} player{players.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <Skeleton className="h-28 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !players?.length ? (
        <Card className="py-0 gap-0">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Radio className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No active players</p>
            <p className="text-sm mt-1">Players will appear here when music is playing</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {players.map((player) => (
            <PlayerCard key={player.guildId} player={player} />
          ))}
        </div>
      )}
    </div>
  )
}
