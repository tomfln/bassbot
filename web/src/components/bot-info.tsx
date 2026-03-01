"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function BotInfo({
  name,
  avatar,
}: {
  name?: string
  avatar?: string | null
}) {
  return (
    <div className="px-3 pt-3 pb-1">
      <div className="flex items-center gap-4 px-2.5 py-2 rounded-lg">
        <Avatar className="h-8 w-8 rounded-full">
          <AvatarImage src={avatar ?? undefined} />
          <AvatarFallback className="text-xs rounded-full">BB</AvatarFallback>
        </Avatar>
        <p className="text-sm font-medium truncate">{name ?? "bassbot"}</p>
      </div>
    </div>
  )
}
