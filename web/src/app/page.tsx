"use client"

import Link from "next/link"
import { Button } from "@web/components/ui/button"
import { useSession } from "@web/lib/auth-client"
import {
  Headphones,
  Zap,
  Shield,
  ArrowRight,
  Github,
  LogIn,
  Radio,
  Server,
  Terminal,
} from "lucide-react"
import type { ReactNode, CSSProperties } from "react"

/* ── Scattered primary glow blobs ─────────────────────────── */

function ScatteredGlow() {
  const blobs: CSSProperties[] = [
    { top: "5%", left: "10%", width: 220, height: 220, opacity: 0.07 },
    { top: "15%", right: "8%", width: 180, height: 180, opacity: 0.06 },
    { top: "45%", left: "3%", width: 160, height: 160, opacity: 0.05 },
    { top: "60%", right: "15%", width: 200, height: 200, opacity: 0.08 },
    { bottom: "10%", left: "25%", width: 140, height: 140, opacity: 0.06 },
    { bottom: "5%", right: "5%", width: 170, height: 170, opacity: 0.05 },
    { top: "30%", left: "50%", width: 250, height: 250, opacity: 0.04 },
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

/* ── Feature card ─────────────────────────────────────────── */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="scope-hover scope-xl glass-card relative rounded-xl p-6">
      <div className="relative">
        <div className="mb-3 inline-flex rounded-lg p-2 bg-primary/10 text-primary">
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
      {/* Full-page grid background */}
      <div className="grid-bg pointer-events-none fixed inset-0" aria-hidden />
      <ScatteredGlow />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-end gap-1">
          <p
            style={{ fontFamily: "Veter", transform: "translateY(10%)" }}
            className="text-primary text-2xl"
          >
            bass
          </p>
        </Link>
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
              <Link href="/guilds" className="flex items-center gap-2 group">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="h-7 w-7 rounded-full ring-1 ring-white/10 group-hover:ring-primary/40 transition-all"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                    {session.user.name?.charAt(0) ?? "?"}
                  </div>
                )}
              </Link>
            </>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm" className="gap-1.5">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </Link>
          )}
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-6 mt-24 sm:mt-32">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            The only music bot
            <br />
            <span className="text-primary">you&apos;ll ever need</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Open-source, high-quality audio streaming with a full web dashboard
            and over 30 commands. Self-host it and own your music experience.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            {session ? (
              <Link href="/guilds">
                <Button variant="outline" size="lg" className="gap-2 h-12 px-6 text-base">
                  Go to Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="lg" className="gap-2 h-12 px-6 text-base">
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <a
              href="https://github.com/tomfln/bassbot"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="gap-2 h-12 px-6 text-base">
                <Github className="h-5 w-5" />
                Self-Host
              </Button>
            </a>
          </div>
        </div>

        {/* Features grid */}
        <div className="mt-20 mb-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl w-full">
          <FeatureCard
            icon={<Radio className="h-5 w-5" />}
            title="Multi-Source Playback"
            description="Stream from YouTube, Spotify, SoundCloud, Deezer, and more — powered by Lavalink for consistent, high-quality audio."
          />
          <FeatureCard
            icon={<Headphones className="h-5 w-5" />}
            title="Web Dashboard"
            description="Browse, search, and queue songs from any device. Manage playback without ever opening Discord."
          />
          <FeatureCard
            icon={<Zap className="h-5 w-5" />}
            title="Live Sync"
            description="Real-time player and queue state over WebSocket. Every connected client stays in sync instantly."
          />
          <FeatureCard
            icon={<Server className="h-5 w-5" />}
            title="Self-Hosted"
            description="Run it on your own hardware. Full admin panel with user management, logs, and per-server configuration."
          />
        </div>

        {/* Commands section */}
        <section className="mb-16 max-w-3xl w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center rounded-lg p-2.5 bg-primary/10 text-primary">
            <Terminal className="h-6 w-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            A command for everything
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Play, pause, skip, loop, shuffle, seek, view lyrics, save queues,
            manage history — bassbot has over 30 slash commands covering every
            music workflow you can think of.
          </p>
          <Link href="/commands">
            <Button variant="outline" size="lg" className="gap-2 mt-2">
              Browse Commands
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </section>
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
