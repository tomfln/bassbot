"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Headphones } from "lucide-react"

interface VoiceChannelCardProps {
  voiceChannel: {
    name: string
    members: { id: string; displayName: string; avatar: string }[]
  } | null
  /** Compact mode uses smaller avatars (user dash). Default is normal (admin dash). */
  compact?: boolean
}

export function VoiceChannelCard({
  voiceChannel,
  compact,
}: VoiceChannelCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Headphones className="h-4 w-4" />
          Voice Channel
        </CardTitle>
      </CardHeader>
      <CardContent>
        {voiceChannel ? (
          <div>
            <p className="text-sm font-medium">{voiceChannel.name}</p>
            {voiceChannel.members.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                No listeners
              </p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {voiceChannel.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <Avatar className={compact ? "h-5 w-5" : "h-7 w-7"}>
                      <AvatarImage src={m.avatar} />
                      <AvatarFallback className="text-[9px]">
                        {m.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`truncate ${compact ? "text-xs text-muted-foreground" : "text-sm"}`}
                    >
                      {m.displayName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not connected</p>
        )}
      </CardContent>
    </Card>
  )
}
