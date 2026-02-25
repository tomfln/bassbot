"use client"

import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"
import { AdminShell } from "@/components/admin-shell"

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (isPending) return
    if (!session) {
      router.replace("/login")
      return
    }
    if (session.user.role !== "admin") {
      router.replace("/unauthorized")
      return
    }
  }, [session, isPending, router])

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!session || session.user.role !== "admin") {
    return null
  }

  return <AdminShell>{children}</AdminShell>
}
