"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/auth-client"
import {
  Music,
  Headphones,
  Zap,
  Shield,
  ArrowRight,
  Github,
  LogIn,
} from "lucide-react"
import type { ReactNode, CSSProperties } from "react"

/* ── Animated background ──────────────────────────────────── */

function HeroGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-150 h-150 rounded-full blur-[120px] opacity-20"
        style={{ background: "oklch(0.77 0.20 131)" }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-100 h-100 rounded-full blur-[100px] opacity-10"
        style={{ background: "oklch(0.72 0.19 155)" }}
      />
    </div>
  )
}

/* ── Feature card ─────────────────────────────────────────── */

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: ReactNode
  title: string
  description: string
  color: string
}) {
  const style: CSSProperties = {
    background: "oklch(21% 0.005 67 / 0.5)",
    backdropFilter: "blur(12px)",
  }

  return (
    <div
      className="relative rounded-xl border border-white/8 p-6 transition-colors hover:border-white/15"
      style={style}
    >
      <div
        className="absolute -top-4 -right-4 h-20 w-20 rounded-full opacity-10 blur-2xl"
        style={{ background: color }}
      />
      <div className="relative">
        <div className="mb-3 inline-flex rounded-lg p-2 bg-white/5" style={{ color }}>
          {icon}
        </div>
        <h3 className="text-base font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

/* ── Landing page ─────────────────────────────────────────── */

export default function LandingPage() {
  const { data: session } = useSession()

  return (
    <div className="relative min-h-dvh bg-background flex flex-col">
      <HeroGlow />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-end gap-1">
          <p
            style={{ fontFamily: "Veter", transform: "translateY(10%)" }}
            className="text-primary text-2xl"
          >
            bass
          </p>
          <div className="absolute inset-2 bg-primary blur-lg opacity-40" />
        </div>
        <nav className="flex items-center gap-3">
          {session ? (
            <>
              {session.user.role === "admin" && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <Shield className="h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              )}
              <Link href="/guilds">
                <Button size="sm" className="gap-1.5">
                  <Music className="h-4 w-4" />
                  My Servers
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" className="gap-1.5">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </Link>
          )}
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center -mt-16">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <Zap className="h-3.5 w-3.5" />
            High quality music streaming
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Your server&apos;s
            <br />
            <span className="text-primary">music backbone</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
            A powerful Discord music bot with a web dashboard.
            Search, queue, and control your music right from the browser.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {session ? (
              <Link href="/guilds">
                <Button size="lg" className="gap-2">
                  <Music className="h-4 w-4" />
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="lg" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <a
              href="https://github.com/tomfln/bassbot"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="lg" className="gap-2">
                <Github className="h-4 w-4" />
                GitHub
              </Button>
            </a>
          </div>
        </div>

        {/* Features grid */}
        <div className="mt-20 mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl w-full">
          <FeatureCard
            icon={<Music className="h-5 w-5" />}
            title="Rich Playback"
            description="Play from YouTube, Spotify, SoundCloud, and more with Lavalink-powered streaming."
            color="oklch(0.77 0.20 131)"
          />
          <FeatureCard
            icon={<Headphones className="h-5 w-5" />}
            title="Web Controls"
            description="Control playback, manage queues, and search for songs directly from your browser."
            color="oklch(0.72 0.19 155)"
          />
          <FeatureCard
            icon={<Zap className="h-5 w-5" />}
            title="Real-time Updates"
            description="Live player status and queue updates via WebSocket — always in sync."
            color="oklch(0.80 0.18 85)"
          />
          <FeatureCard
            icon={<Shield className="h-5 w-5" />}
            title="Admin Dashboard"
            description="Full admin panel with user management, bot settings, and server monitoring."
            color="oklch(0.70 0.15 250)"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 pb-6 pt-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4">
          <span>
            made by{" "}
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
    </div>
  )
}
