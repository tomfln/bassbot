import { useState, type CSSProperties } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { LayoutDashboard, Server, Music, Menu, X, ScrollText, Github } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useStats } from "@/hooks/use-api"

/* ── Constants ────────────────────────────────────────────── */

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Overview" },
  { to: "/guilds", icon: Server, label: "Guilds" },
  { to: "/players", icon: Music, label: "Players" },
  { to: "/logs", icon: ScrollText, label: "Logs" },
] as const

const GLASS_STYLE: CSSProperties = {
  background: "oklch(21% 0.005 67 / 0.35)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
}

/* ── Shared primitives ────────────────────────────────────── */

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <Music className="h-5 w-5 text-primary" />
      <span className="font-semibold text-lg tracking-tight">bassbot</span>
    </div>
  )
}

function NavItem({
  to,
  icon: Icon,
  label,
  onNavigate,
}: {
  to: string
  icon: typeof LayoutDashboard
  label: string
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onNavigate}
      className="relative block"
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className="absolute top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-primary z-10"
              style={{ left: "-0.875rem" }}
            />
          )}
          <span
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "text-primary outline-2 -outline-offset-2 outline-primary/80"
                : "bg-accent/40 text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground scope-hover",
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
            <Icon className="h-4 w-4" />
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

function BotInfo({
  name,
  avatar,
  guildCount,
}: {
  name?: string
  avatar?: string | null
  guildCount?: number
}) {
  return (
    <div className="px-3 pb-3 mt-4 border-t border-white/[0.06] pt-3">
      <div className="flex items-center gap-2.5 px-2">
        <Avatar className="h-8 w-8 rounded-full">
          <AvatarImage src={avatar ?? undefined} />
          <AvatarFallback className="text-xs rounded-full">BB</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{name ?? "bassbot"}</p>
          {guildCount !== undefined && (
            <p className="text-[11px] text-muted-foreground">
              {guildCount} server{guildCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 px-3 pb-3 space-y-1.5">
      {NAV_ITEMS.map(({ to, icon, label }) => (
        <NavItem key={to} to={to} icon={icon} label={label} onNavigate={onNavigate} />
      ))}
    </nav>
  )
}

/* ── Desktop sidebar ──────────────────────────────────────── */

function DesktopSidebar({
  botName,
  botAvatar,
  guildCount,
}: {
  botName?: string
  botAvatar?: string | null
  guildCount?: number
}) {
  return (
    <div className="hidden md:flex shrink-0 pt-[6rem] pb-3 pl-3 sticky top-0 self-start">
      <aside
        className="flex w-56 xl:w-64 flex-col rounded-xl border border-white/8 shadow-sm overflow-visible min-h-[60dvh]"
        style={GLASS_STYLE}
      >
        <div className="px-4 h-14 flex items-center">
          <Brand />
        </div>
        <SidebarNav />
        <BotInfo name={botName} avatar={botAvatar} guildCount={guildCount} />
      </aside>
    </div>
  )
}

/* ── Mobile sidebar + overlay ─────────────────────────────── */

function MobileSidebar({
  open,
  onClose,
  botName,
  botAvatar,
  guildCount,
}: {
  open: boolean
  onClose: () => void
  botName?: string
  botAvatar?: string | null
  guildCount?: number
}) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed top-2 right-2 bottom-2 z-50 w-[70vw] rounded-xl border border-white/8 shadow-lg flex flex-col transition-transform duration-200 ease-in-out md:hidden overflow-visible",
          open ? "translate-x-0" : "translate-x-[calc(100%+1rem)]",
        )}
        style={GLASS_STYLE}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <Brand />
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarNav onNavigate={onClose} />
        <BotInfo name={botName} avatar={botAvatar} guildCount={guildCount} />
      </aside>
    </>
  )
}

/* ── Mobile header ────────────────────────────────────────── */

function MobileHeader({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-white/[0.08] md:hidden"
      style={GLASS_STYLE}
    >
      <Brand />
      <button
        onClick={onOpenSidebar}
        className="p-1 rounded-md hover:bg-accent transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>
    </header>
  )
}

/* ── Footer ───────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="px-6 md:px-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10">
      <div className="mx-auto max-w-6xl flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4 px-2">
        <span>
          bassbot &middot; made by{" "}
          <a
            href="https://github.com/tomfln"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            tomfln
          </a>
        </span>
        <a
          href="https://github.com/tomfln/bassbot"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Github className="h-3.5 w-3.5" />
          GitHub
        </a>
      </div>
    </footer>
  )
}

/* ── Root layout ──────────────────────────────────────────── */

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: stats } = useStats()

  return (
    <div className="min-h-dvh bg-background flex justify-center">
      <div className="flex w-full max-w-350">
        <DesktopSidebar
          botName={stats?.botName}
          botAvatar={stats?.botAvatar}
          guildCount={stats?.guildCount}
        />
        <MobileSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          botName={stats?.botName}
          botAvatar={stats?.botAvatar}
          guildCount={stats?.guildCount}
        />

        <div className="flex-1 min-w-0 flex flex-col min-h-dvh bg-black/10 md:mx-6">
          <MobileHeader onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
