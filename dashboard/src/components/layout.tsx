import { NavLink, Outlet } from "react-router-dom"
import { LayoutDashboard, Server, Music } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Overview" },
  { to: "/guilds", icon: Server, label: "Guilds" },
  { to: "/players", icon: Music, label: "Players" },
] as const

export function Layout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border">
          <Music className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg tracking-tight">bassbot</span>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
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
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
