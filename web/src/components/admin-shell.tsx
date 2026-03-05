"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  Server,
  Music,
  ScrollText,
  SlidersHorizontal,
  Users,
  ExternalLink,
} from "lucide-react"
import { DashShell, type NavItemDef } from "@web/components/shell-primitives"

/* ── Admin nav items ──────────────────────────────────────── */

const NAV_ITEMS: readonly NavItemDef[] = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview", exact: true },
  { href: "/admin/guilds", icon: Server, label: "Guilds" },
  { href: "/admin/players", icon: Music, label: "Players" },
  { href: "/admin/logs", icon: ScrollText, label: "Logs" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/control", icon: SlidersHorizontal, label: "Control" },
]

/* ── "User Dashboard" link shown below nav ────────────────── */

function DashLink() {
  return (
    <div className="px-3 pb-3">
      <Link
        href="/guilds"
        className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        User Dashboard
      </Link>
    </div>
  )
}

/* ── Admin Shell layout ───────────────────────────────────── */

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <DashShell
      navItems={NAV_ITEMS}
      belowNav={<DashLink />}
      showAdminBadge
    >
      {children}
    </DashShell>
  )
}
