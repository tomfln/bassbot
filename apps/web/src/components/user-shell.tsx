"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Server, Shield, Music, Terminal, Loader2, UserPlus } from "lucide-react"
import { cn } from "@web/lib/utils"
import { GuildIcon } from "@web/components/guild-icon"
import { DashShell, type NavItemDef } from "@web/components/shell-primitives"
import { useSession } from "@web/lib/auth-client"
import { usePlayers, useStats, useUserGuilds } from "@web/hooks/use-api"

/* ── User nav items ───────────────────────────────────────── */

const NAV_ITEMS: readonly NavItemDef[] = [
  { href: "/guilds", icon: Server, label: "All Guilds", exact: true },
  { href: "/commands", icon: Terminal, label: "Commands", exact: true },
]

/* ── "Admin Panel" link (shown for admin users) ───────────── */

function AdminPanelLink() {
  const { data: session } = useSession()
  if (session?.user.role !== "admin") return null
  return (
    <div className="px-3 pb-3">
      <Link
        href="/admin"
        className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <Shield className="h-3.5 w-3.5" />
        Admin Panel
      </Link>
    </div>
  )
}

/* ── Guild list sidebar section (with loading + empty state) ── */

function GuildList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { data: players } = usePlayers()
  const { data: userGuildsData, isLoading } = useUserGuilds()
  const { data: stats } = useStats()

  // Build player map for active guild lookup
  const playerMap = new Map<string, { current: { title: string } | null; paused: boolean }>()
  if (players) {
    for (const p of players) {
      playerMap.set(p.guildId, { current: p.current, paused: p.paused })
    }
  }

  // All mutual guilds, playing ones first, capped at 6
  const mutualGuilds = (userGuildsData?.guilds ?? [])
    .filter((g) => userGuildsData?.botGuildIds.has(g.id))
    .sort((a, b) => {
      const aPlaying = playerMap.has(a.id) && playerMap.get(a.id)?.current ? 1 : 0
      const bPlaying = playerMap.has(b.id) && playerMap.get(b.id)?.current ? 1 : 0
      return bPlaying - aPlaying
    })
    .slice(0, 6)

  // Find guild icon from players data
  const guildIconMap = new Map<string, string | null>()
  if (players) {
    for (const p of players) {
      guildIconMap.set(p.guildId, p.guildIcon)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <>
        <div className="my-3 mx-2 border-t border-white/6" />
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading servers…
        </div>
      </>
    )
  }

  // Empty state — invite bot
  if (mutualGuilds.length === 0) {
    const inviteUrl = stats?.botId
      ? `https://discord.com/oauth2/authorize?client_id=${stats.botId}&permissions=36703360&scope=bot+applications.commands`
      : null
    return inviteUrl ? (
      <>
        <div className="my-3 mx-2 border-t border-white/6" />
        <div className="pb-2">
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-dashed border-white/10 bg-accent/30 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add to a server
          </a>
        </div>
      </>
    ) : null
  }

  // Guild list
  return (
    <>
      <div className="my-3 mx-2 border-t border-white/6" />
      {mutualGuilds.map((g) => {
        const href = `/guilds/${g.id}`
        const isActive = pathname === href
        const player = playerMap.get(g.id)
        const icon = g.icon ?? guildIconMap.get(g.id) ?? null

        return (
          <Link
            key={g.id}
            href={href}
            onClick={onNavigate}
            className="relative block group/nav"
          >
            {isActive && (
              <span
                className="absolute top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-primary z-10"
                style={{ left: "-0.875rem" }}
              />
            )}
            <span
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 h-10 text-sm transition-colors",
                isActive
                  ? "text-primary outline-2 -outline-offset-2 outline-primary/80"
                  : "bg-accent/40 text-muted-foreground hover:bg-accent/70 hover:text-primary scope-hover",
              )}
              style={
                isActive
                  ? {
                      background:
                        "radial-gradient(circle at 0px 50%, oklch(0.77 0.20 131 / 0.18), oklch(0.77 0.20 131 / 0.04) 70%, transparent), rgba(from var(--color-accent) r g b / 0.4)",
                    }
                  : undefined
              }
            >
              {!isActive && (
                <span
                  className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 pointer-events-none group-hover/nav:opacity-100"
                  style={{
                    background:
                      "radial-gradient(circle at 0% 50%, oklch(0.77 0.20 131 / 0.06), transparent 60%)",
                  }}
                />
              )}
              <GuildIcon
                name={g.name}
                icon={icon}
                className="h-6 w-6 text-[8px]"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate leading-tight">{g.name}</p>
                {player?.current && (
                  <p className="text-[9px] leading-tight text-muted-foreground truncate">
                    {player.current.title}
                  </p>
                )}
              </div>
              {player?.current && !player.paused && (
                <Music className="h-3 w-3 text-primary shrink-0 animate-pulse" />
              )}
            </span>
          </Link>
        )
      })}
    </>
  )
}

/* ── User Shell layout ────────────────────────────────────── */

export function UserShell({ children }: { children: ReactNode }) {
  return (
    <DashShell
      navItems={NAV_ITEMS}
      navExtra={(onNavigate) => <GuildList onNavigate={onNavigate} />}
      belowNav={<AdminPanelLink />}
    >
      {children}
    </DashShell>
  )
}
