"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  Users,
  MoreVertical,
  Shield,
  ShieldOff,
  Ban,
  ShieldCheck,
  Trash2,
  Search,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ── Types ────────────────────────────────────────────────── */

interface WebUser {
  id: string
  name: string
  email: string
  image: string | null
  role: string | null
  banned: boolean | null
  banReason: string | null
  createdAt: string | number
}

/* ── Helpers ──────────────────────────────────────────────── */

async function fetchRest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json() as Promise<T>
}

function formatDate(ts: string | number): string {
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/* ── Page ─────────────────────────────────────────────────── */

export default function AdminUsersPage() {
  const [users, setUsers] = useState<WebUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogAction, setDialogAction] = useState<{
    type: "promote" | "demote" | "ban" | "unban" | "delete"
    user: WebUser
  } | null>(null)

  const loadUsers = useCallback(async () => {
    try {
      const data = await fetchRest<{ users: WebUser[] }>("/rest/admin/users")
      setUsers(data.users)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  /* ── Mutations ──────────────────────────────────────── */

  async function handleConfirm() {
    if (!dialogAction) return
    const { type, user } = dialogAction
    try {
      switch (type) {
        case "promote":
          await fetchRest(`/rest/admin/users/${user.id}/role`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "admin" }),
          })
          break
        case "demote":
          await fetchRest(`/rest/admin/users/${user.id}/role`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "user" }),
          })
          break
        case "ban":
          await fetchRest(`/rest/admin/users/${user.id}/ban`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "Banned by admin" }),
          })
          break
        case "unban":
          await fetchRest(`/rest/admin/users/${user.id}/unban`, { method: "POST" })
          break
        case "delete":
          await fetchRest(`/rest/admin/users/${user.id}`, { method: "DELETE" })
          break
      }
      await loadUsers()
    } catch {
      /* ignore */
    }
    setDialogAction(null)
  }

  /* ── Filtered users ─────────────────────────────────── */

  const filtered = search
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : users

  /* ── Render ─────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="min-h-12 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {users.length} registered user{users.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-border bg-card pl-9 pr-8 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* User list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" />
            All Users
          </CardTitle>
          <CardDescription>
            Manage web dashboard users, roles, and bans.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? "No users match your search." : "No users registered yet."}
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((u) => (
                <div
                  key={u.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 sm:px-6",
                    u.banned && "opacity-60",
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={u.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {u.name?.slice(0, 2).toUpperCase() ?? "??"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{u.name}</span>
                      {u.role === "admin" && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                          <Shield className="h-2.5 w-2.5 mr-0.5" />
                          Admin
                        </Badge>
                      )}
                      {u.banned && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          <Ban className="h-2.5 w-2.5 mr-0.5" />
                          Banned
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>

                  <span className="text-xs text-muted-foreground hidden sm:block whitespace-nowrap">
                    {formatDate(u.createdAt)}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {u.role === "admin" ? (
                        <DropdownMenuItem onClick={() => setDialogAction({ type: "demote", user: u })}>
                          <ShieldOff className="h-4 w-4 mr-2" />
                          Demote to User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => setDialogAction({ type: "promote", user: u })}>
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Promote to Admin
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {u.banned ? (
                        <DropdownMenuItem onClick={() => setDialogAction({ type: "unban", user: u })}>
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Unban
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDialogAction({ type: "ban", user: u })}
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Ban
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDialogAction({ type: "delete", user: u })}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!dialogAction}
        onOpenChange={(open) => !open && setDialogAction(null)}
        title={
          dialogAction?.type === "promote" ? "Promote to Admin?" :
          dialogAction?.type === "demote" ? "Demote to User?" :
          dialogAction?.type === "ban" ? "Ban User?" :
          dialogAction?.type === "unban" ? "Unban User?" :
          dialogAction?.type === "delete" ? "Delete User?" : ""
        }
        description={
          dialogAction?.type === "promote" ? `${dialogAction.user.name} will gain admin access to the dashboard.` :
          dialogAction?.type === "demote" ? `${dialogAction.user.name} will lose admin access.` :
          dialogAction?.type === "ban" ? `${dialogAction.user.name} will be banned and cannot log in.` :
          dialogAction?.type === "unban" ? `${dialogAction.user.name} will be unbanned and can log in again.` :
          dialogAction?.type === "delete" ? `${dialogAction.user.name} will be permanently deleted. This cannot be undone.` : ""
        }
        destructive={dialogAction?.type === "delete" || dialogAction?.type === "ban"}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
