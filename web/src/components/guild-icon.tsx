import { cn } from "@/lib/utils"

interface GuildIconProps {
  name: string
  icon?: string | null
  /** Tailwind size classes, e.g. "h-10 w-10" (default) */
  className?: string
}

/**
 * Discord server icon — always `rounded-lg`, never fully round.
 * Uses a plain img/fallback instead of Avatar to avoid rounded-full conflicts.
 */
export function GuildIcon({ name, icon, className }: GuildIconProps) {
  const initials = name.slice(0, 2).toUpperCase()

  return icon ? (
    <img
      src={icon}
      alt={name}
      className={cn("h-10 w-10 rounded-[30%] object-cover shrink-0", className)}
    />
  ) : (
    <div
      className={cn(
        "h-10 w-10 rounded-[30%] bg-muted flex items-center justify-center shrink-0 text-xs text-muted-foreground",
        className,
      )}
    >
      {initials}
    </div>
  )
}
