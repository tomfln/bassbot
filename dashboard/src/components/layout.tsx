import { useState, useEffect } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { LayoutDashboard, Server, Music, Menu, X, ScrollText } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Overview" },
  { to: "/guilds", icon: Server, label: "Guilds" },
  { to: "/players", icon: Music, label: "Players" },
  { to: "/logs", icon: ScrollText, label: "Logs" },
] as const

function NavItem({
  to,
  icon: Icon,
  label,
  onNavigate,
  pillSide = "left",
}: {
  to: string
  icon: typeof LayoutDashboard
  label: string
  onNavigate?: () => void
  pillSide?: "left" | "right"
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
          {/* Pill indicator — centered straddling the sidebar container edge */}
          {isActive && (
            <span
              className="absolute top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary z-10"
              style={pillSide === "left" ? { left: "-0.875rem" } : { right: "-0.875rem" }}
            />
          )}
          <span
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "text-primary"
                : "bg-accent/40 text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground",
            )}
            style={
              isActive
                ? {
                    background:
                      pillSide === "left"
                        ? "radial-gradient(circle at 28px 50%, oklch(0.77 0.20 131 / 0.18), oklch(0.77 0.20 131 / 0.04) 70%, transparent), var(--color-accent)"
                        : "radial-gradient(circle at calc(100% - 28px) 50%, oklch(0.77 0.20 131 / 0.18), oklch(0.77 0.20 131 / 0.04) 70%, transparent), var(--color-accent)",
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

function NavContent({
  onNavigate,
  pillSide = "left",
}: {
  onNavigate?: () => void
  pillSide?: "left" | "right"
}) {
  return (
    <nav className="flex-1 px-3 pb-3 space-y-1.5">
      {NAV_ITEMS.map(({ to, icon, label }) => (
        <NavItem
          key={to}
          to={to}
          icon={icon}
          label={label}
          onNavigate={onNavigate}
          pillSide={pillSide}
        />
      ))}
    </nav>
  )
}

const GLASS_STYLE = {
  background: "oklch(21% 0.005 67 / 0.55)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
} as const

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="fixed inset-0 bg-background flex justify-center">
      <div className="flex h-full w-full max-w-[1400px]">
        {/* Desktop sidebar */}
        <div className="hidden md:flex shrink-0 py-3 pl-3">
          <aside
            className="flex w-56 xl:w-64 flex-col rounded-xl border border-white/[0.08] shadow-sm overflow-visible"
            style={GLASS_STYLE}
          >
            <div className="flex items-center gap-2 px-4 h-14">
              <Music className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg tracking-tight">bassbot</span>
            </div>
            <NavContent pillSide="left" />
          </aside>
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <aside
          className={cn(
            "fixed top-2 right-2 bottom-2 z-50 w-[70vw] rounded-xl border border-white/[0.08] shadow-lg flex flex-col transition-transform duration-200 ease-in-out md:hidden overflow-visible",
            sidebarOpen ? "translate-x-0" : "translate-x-[calc(100%+0.5rem)]",
          )}
          style={GLASS_STYLE}
        >
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg tracking-tight">bassbot</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-md hover:bg-accent transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <NavContent onNavigate={() => setSidebarOpen(false)} pillSide="right" />
        </aside>

        {/* Main content — mobile scrolls entire column so sticky header gets frosted glass */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto">
          {/* Mobile header — sticky so content scrolls behind it */}
          <header
            className="sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-white/[0.08] md:hidden"
            style={GLASS_STYLE}
          >
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg tracking-tight">bassbot</span>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 rounded-md hover:bg-accent transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          </header>

          <main className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
