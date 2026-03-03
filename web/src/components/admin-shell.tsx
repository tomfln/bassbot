"use client"

import { useState, type CSSProperties, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Server,
  Music,
  Menu,
  X,
  ScrollText,
  Github,
  SlidersHorizontal,
  Users,
  LogOut,
  Shield,
  ExternalLink,
} from "lucide-react"
import { cn } from "@web/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@web/components/ui/avatar"
import { ConfirmDialog } from "@web/components/confirm-dialog"
import { BotInfo } from "@web/components/bot-info"
import { useStats } from "@web/hooks/use-api"
import { useSession, signOut } from "@web/lib/auth-client"
import pkg from "../../package.json"

/* ── Constants ────────────────────────────────────────────── */

const NAV_ITEMS = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview", exact: true },
  { href: "/admin/guilds", icon: Server, label: "Guilds" },
  { href: "/admin/players", icon: Music, label: "Players" },
  { href: "/admin/logs", icon: ScrollText, label: "Logs" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/control", icon: SlidersHorizontal, label: "Control" },
] as const

const GLASS_STYLE: CSSProperties = {
  background: "oklch(21% 0.005 67 / 0.35)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
}

/* ── Shared primitives ────────────────────────────────────── */

function Brand({ size = "large" }: { size?: "small" | "large" }) {
  return (
    <div className="relative flex items-end gap-1">
      <p
        style={{ fontFamily: "Veter", transform: "translateY(10%)" }}
        className={`text-primary ${size === "small" ? "text-xl" : "text-3xl"}`}
      >
        bass
      </p>
      <div className="absolute inset-2 bg-primary blur-lg opacity-50" />
    </div>
  )
}

function NavItem({
  href,
  icon: Icon,
  label,
  exact,
  onNavigate,
}: {
  href: string
  icon: typeof LayoutDashboard
  label: string
  exact?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link href={href} onClick={onNavigate} className="relative block group/nav">
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
        <Icon className="h-4 w-4" />
        {label}
      </span>
    </Link>
  )
}

function UserInfo() {
  const { data: session } = useSession()
  const [confirmLogout, setConfirmLogout] = useState(false)
  if (!session) return null

  return (
    <div className="px-3 pb-3 border-t border-white/6 pt-3">
      <div className="flex items-center gap-2.5 px-2">
        <Avatar className="h-8 w-8 rounded-full">
          <AvatarImage src={session.user.image ?? undefined} />
          <AvatarFallback className="text-xs rounded-full">
            {session.user.name?.slice(0, 2).toUpperCase() ?? "??"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">{session.user.name}</p>
            <Shield className="h-3 w-3 text-primary shrink-0" />
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {session.user.email}
          </p>
        </div>
        <button
          onClick={() => setConfirmLogout(true)}
          className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="Sign out?"
        description="You will be signed out of the dashboard."
        confirmLabel="Sign out"
        onConfirm={() => signOut({ fetchOptions: { onSuccess: () => window.location.replace("/login") } })}
      />
    </div>
  )
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 px-3 pb-3 space-y-1.5">
      {NAV_ITEMS.map(({ href, icon, label, ...rest }) => (
        <NavItem
          key={href}
          href={href}
          icon={icon}
          label={label}
          exact={"exact" in rest ? rest.exact : undefined}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}

function DashLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="px-3 pb-3">
      <Link
        href="/guilds"
        onClick={onNavigate}
        className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        User Dashboard
      </Link>
    </div>
  )
}

/* ── Desktop sidebar ──────────────────────────────────────── */

function DesktopSidebar({
  botName,
  botAvatar,
}: {
  botName?: string
  botAvatar?: string | null
}) {
  return (
    <div className="hidden md:flex flex-col">
      <div className="shrink-0 pb-3 pl-3 sticky top-0 self-start pt-24">
        <div className="flex items-center justify-center pb-4">
          <Brand />
        </div>
        <aside
          className="flex gap-2 w-56 xl:w-64 flex-col rounded-xl border border-white/8 shadow-sm overflow-visible min-h-[60dvh]"
          style={GLASS_STYLE}
        >
          <BotInfo name={botName} avatar={botAvatar} />
          <SidebarNav />
          <DashLink />
          <UserInfo />
        </aside>
      </div>
    </div>
  )
}

/* ── Mobile sidebar + overlay ─────────────────────────────── */

function MobileSidebar({
  open,
  onClose,
  botName,
  botAvatar,
}: {
  open: boolean
  onClose: () => void
  botName?: string
  botAvatar?: string | null
}) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed top-2 right-2 bottom-2 z-50 w-[70vw] rounded-xl border border-white/8 shadow-lg flex flex-col transition-transform duration-200 ease-in-out md:hidden overflow-visible",
          open ? "translate-x-0" : "translate-x-[calc(100%+1rem)]",
        )}
        style={GLASS_STYLE}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <Brand size="small" />
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <BotInfo name={botName} avatar={botAvatar} />
        <SidebarNav onNavigate={onClose} />
        <DashLink onNavigate={onClose} />
        <UserInfo />
      </aside>
    </>
  )
}

/* ── Mobile header ────────────────────────────────────────── */

function MobileHeader({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <header
      className="overflow-hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-white/8 md:hidden"
      style={GLASS_STYLE}
    >
      <Brand size="small" />
      <button onClick={onOpenSidebar} className="p-1 rounded-md hover:bg-accent transition-colors">
        <Menu className="h-5 w-5" />
      </button>
    </header>
  )
}

/* ── Footer ───────────────────────────────────────────────── */

function Footer() {
  const { data: stats } = useStats()
  return (
    <footer className="px-6 md:px-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10">
      <div className="mx-auto max-w-6xl flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4 px-2">
        <span>
          made by&nbsp;
          <a
            href="https://github.com/tomfln"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            tomfln
          </a>
        </span>
        <span className="flex gap-2">
          <span>web {pkg.version}</span>
          {stats?.version && (
            <>
              <span>•</span>
              <span>bot {stats.version}</span>
            </>
          )}
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

/* ── Admin Shell layout ───────────────────────────────────── */

export function AdminShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: stats } = useStats()

  return (
    <div className="min-h-dvh bg-background flex justify-center">
      <div className="flex w-full max-w-350">
        <DesktopSidebar
          botName={stats?.botName}
          botAvatar={stats?.botAvatar}
        />
        <MobileSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          botName={stats?.botName}
          botAvatar={stats?.botAvatar}
        />

        <div className="flex-1 min-w-0 flex flex-col min-h-dvh bg-black/10 md:mx-6">
          <MobileHeader onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
