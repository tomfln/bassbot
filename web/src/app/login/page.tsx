"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@web/components/ui/button"
import { signIn, useSession } from "@web/lib/auth-client"
import { ArrowLeft, ShieldAlert } from "lucide-react"
import Link from "next/link"
import type { CSSProperties } from "react"

/* ── Discord icon ─────────────────────────────────────────── */

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

/* ── Scattered primary glow blobs ─────────────────────────── */

function ScatteredGlow() {
  const blobs: CSSProperties[] = [
    { top: "10%", left: "15%", width: 200, height: 200, opacity: 0.07 },
    { top: "20%", right: "10%", width: 160, height: 160, opacity: 0.06 },
    { bottom: "15%", left: "8%", width: 180, height: 180, opacity: 0.05 },
    { bottom: "10%", right: "12%", width: 150, height: 150, opacity: 0.06 },
    { top: "50%", left: "45%", width: 220, height: 220, opacity: 0.04 },
  ]

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {blobs.map((style, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-[100px]"
          style={{ background: "var(--primary)", ...style }}
        />
      ))}
    </div>
  )
}

/* ── Login page ───────────────────────────────────────────── */

export default function LoginPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [signupEnabled, setSignupEnabled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/rest/signup-enabled")
      .then((r) => r.json())
      .then((data: { enabled: boolean }) => setSignupEnabled(data.enabled))
      .catch(() => setSignupEnabled(true))
  }, [])

  useEffect(() => {
    if (isPending) return
    if (session) {
      if (session.user.role === "admin") {
        router.replace("/admin")
      } else {
        router.replace("/guilds")
      }
    }
  }, [session, isPending, router])

  async function handleLogin() {
    setLoading(true)
    setError(null)
    try {
      await signIn.social({ provider: "discord", callbackURL: "/guilds" })
    } catch {
      setError("Failed to initiate login. Please try again.")
      setLoading(false)
    }
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session) return null

  return (
    <div className="relative min-h-dvh bg-background flex flex-col items-center justify-center px-4">
      <div className="grid-bg pointer-events-none fixed inset-0" aria-hidden />
      <ScatteredGlow />

      <div className="relative z-10 w-full max-w-sm space-y-8 text-center">
        {/* Logo */}
        <div className="flex items-end justify-center gap-1">
          <p
            style={{ fontFamily: "Veter", transform: "translateY(10%)" }}
            className="text-primary text-4xl"
          >
            bass
          </p>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your Discord account to continue
          </p>
        </div>

        {/* Errors / warnings */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive text-left">
            {error}
          </div>
        )}

        {signupEnabled === false && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200 flex items-start gap-2 text-left">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              New registrations are currently closed. Existing users can still sign in.
            </span>
          </div>
        )}

        {/* CTA */}
        <Button
          className="w-full gap-2 h-12 text-base"
          size="lg"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <DiscordIcon className="h-5 w-5" />
          )}
          {loading ? "Redirecting…" : "Continue with Discord"}
        </Button>

        <p className="text-xs text-muted-foreground">
          By signing in, you agree to give bassbot access to your Discord
          profile and server list.
        </p>

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </div>
  )
}
