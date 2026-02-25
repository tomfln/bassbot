"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatDuration } from "@/lib/format"
import {
  Pause,
  Play,
  SkipForward,
  SkipBack,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  Volume1,
  AlertCircle,
  Search,
} from "lucide-react"

interface PlayBarProps {
  guildId: string
  paused: boolean
  loopMode?: string
  volume?: number
  onAction: (path: string, init?: RequestInit) => Promise<Response>
  onRefresh: () => void
}

/**
 * Floating player control bar with primary-themed styling.
 * Left: search button. Center: transport controls. Right: volume popup.
 */
export function PlayBar({
  guildId,
  paused,
  loopMode,
  volume = 50,
  onAction,
  onRefresh,
}: PlayBarProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [localVolume, setLocalVolume] = useState(volume)
  const [muted, setMuted] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Sync volume from server when it changes
  useEffect(() => {
    setLocalVolume(volume)
    setMuted(volume === 0)
  }, [volume])

  async function sendAction(action: string) {
    setLoading(action)
    setError(null)
    try {
      const res = await onAction(`/api/players/${guildId}/${action}`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(
          (data as { error?: string }).error ?? `Action failed (${res.status})`,
        )
      }
      onRefresh()
    } catch {
      setError("Failed to send command")
    } finally {
      setLoading(null)
    }
  }

  // Debounced volume setter — 500ms delay
  const sendVolume = useCallback(
    (vol: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        try {
          await onAction(`/api/players/${guildId}/volume`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ volume: vol }),
          })
        } catch {
          /* ignore — not critical */
        }
      }, 500)
    },
    [guildId, onAction],
  )

  function handleVolumeChange(values: number[]) {
    const vol = values[0]!
    setLocalVolume(vol)
    setMuted(vol === 0)
    sendVolume(vol)
  }

  function handleMuteToggle() {
    const newVol = muted ? 50 : 0
    setMuted(!muted)
    setLocalVolume(newVol)
    sendVolume(newVol)
  }

  const VolumeIcon =
    muted || localVolume === 0
      ? VolumeX
      : localVolume < 50
        ? Volume1
        : Volume2

  /* ── Search state ───────────────────────────────────────── */
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<
    { title: string; author: string; uri: string; length: number }[]
  >([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await onAction(
        `/api/players/${guildId}/search?q=${encodeURIComponent(query.trim())}`,
        { method: "GET" },
      )
      if (res.ok) {
        const data = (await res.json()) as { results: typeof results }
        setResults(data.results ?? [])
      }
    } catch {
      /* ignore */
    } finally {
      setSearching(false)
    }
  }

  async function addTrack(uri: string, position: "next" | "end" = "end") {
    setAdding(uri)
    try {
      const res = await onAction(`/api/players/${guildId}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri, position }),
      })
      if (res.ok) {
        onRefresh()
        setResults((prev) => prev.filter((r) => r.uri !== uri))
      }
    } catch {
      /* ignore */
    } finally {
      setAdding(null)
    }
  }

  return (
    <div
      className="rounded-xl border-2 border-primary px-4 py-3"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, oklch(0.77 0.20 131 / 0.08), oklch(0.77 0.20 131 / 0.02) 70%, transparent)",
      }}
    >
      {/* Single row: search | controls | volume */}
      <div className="flex items-center gap-1">
        {/* Left: Search */}
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
              title="Search & add tracks"
            >
              <Search className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search & Add
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 min-w-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search for a song…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleSearch}
                  disabled={searching || !query.trim()}
                >
                  {searching ? (
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </div>

              {results.length > 0 && (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {results.map((r) => (
                    <div
                      key={r.uri}
                      className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.author} • {formatDuration(r.length)}
                        </p>
                      </div>
                      <div className="shrink-0 flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs px-2.5"
                          onClick={() => addTrack(r.uri, "next")}
                          disabled={adding === r.uri}
                          title="Play next"
                        >
                          {adding === r.uri ? "…" : "Next"}
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs px-2.5"
                          onClick={() => addTrack(r.uri, "end")}
                          disabled={adding === r.uri}
                          title="Add to end of queue"
                        >
                          {adding === r.uri ? "…" : "Add"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Center: Transport controls */}
        <div className="flex-1 flex items-center justify-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => sendAction("shuffle")}
            disabled={loading !== null}
            title="Shuffle queue"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => sendAction("prev")}
            disabled={loading !== null}
            title="Previous track"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-11 w-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_12px_oklch(0.77_0.20_131/0.3)]"
            onClick={() => sendAction(paused ? "resume" : "pause")}
            disabled={loading !== null}
          >
            {loading === "pause" || loading === "resume" ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : paused ? (
              <Play className="h-5 w-5 ml-0.5" />
            ) : (
              <Pause className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => sendAction("next")}
            disabled={loading !== null}
            title="Next track"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => sendAction("loop")}
            disabled={loading !== null}
            title="Toggle loop"
          >
            {loopMode === "Song" ? (
              <Repeat1 className="h-4 w-4 text-primary" />
            ) : loopMode === "Queue" ? (
              <Repeat className="h-4 w-4 text-primary" />
            ) : (
              <Repeat className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Right: Volume popup */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
              title={`Volume: ${localVolume}%`}
            >
              <VolumeIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-48 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <button
                onClick={handleMuteToggle}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                title={muted ? "Unmute" : "Mute"}
              >
                <VolumeIcon className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {localVolume}%
              </span>
            </div>
            <Slider
              value={[localVolume]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive justify-center mt-2">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}
    </div>
  )
}
