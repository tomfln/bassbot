import { useState, useEffect } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { LayoutDashboard, Server, Music, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Overview" },
  { to: "/guilds", icon: Server, label: "Guilds" },
  { to: "/players", icon: Music, label: "Players" },
] as const

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 p-2 space-y-1">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-border bg-card flex-col">
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border">
          <Music className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg tracking-tight">bassbot</span>
        </div>
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar (slides from right) */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-64 bg-card border-l border-border flex flex-col transition-transform duration-200 ease-in-out md:hidden",
          sidebarOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-border">
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
        <NavContent onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center justify-between px-4 h-14 border-b border-border bg-card md:hidden">
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

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
