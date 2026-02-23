"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useBotSettings, useUpdateBotSettings } from "@/hooks/use-api"
import { cn } from "@/lib/utils"
import {
  Settings,
  MessageSquareOff,
  Sparkles,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react"

/* ── Inline toggle switch ─────────────────────────────────── */

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  )
}

/* ── Default slogans ──────────────────────────────────────── */

const DEFAULT_SLOGANS = [
  "vibe alert",
  "type /play to start",
  "music 24/7",
  "spotify who?",
  "the best music bot",
  "spürst du die frequenzen?",
]

/* ── Control Panel Page ───────────────────────────────────── */

export default function ControlPage() {
  const { data: settings, isLoading } = useBotSettings()
  const updateSettings = useUpdateBotSettings()

  /*
   * Local optimistic override for the toggle — null means "use server value".
   * Avoids a useEffect-based sync which triggers cascading renders.
   */
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null)
  const commandsEnabled = pendingEnabled ?? settings?.commandsEnabled ?? true

  /*
   * Slogan draft — null means "no local edits yet, show server data".
   * Becomes a real array once the user makes any change.
   */
  const [sloganDraft, setSloganDraft] = useState<string[] | null>(null)
  const slogans = sloganDraft ?? settings?.slogans ?? DEFAULT_SLOGANS
  const slogansDirty = sloganDraft !== null

  const [newSlogan, setNewSlogan] = useState("")

  function handleCommandToggle(value: boolean) {
    setPendingEnabled(value)
    updateSettings.mutate(
      { commandsEnabled: value },
      { onSettled: () => setPendingEnabled(null) },
    )
  }

  function addSlogan() {
    const trimmed = newSlogan.trim()
    if (!trimmed || slogans.includes(trimmed)) return
    setSloganDraft([...slogans, trimmed])
    setNewSlogan("")
  }

  function removeSlogan(idx: number) {
    setSloganDraft(slogans.filter((_, i) => i !== idx))
  }

  function resetSlogans() {
    setSloganDraft([...DEFAULT_SLOGANS])
  }

  function saveSlogans() {
    updateSettings.mutate({ slogans }, { onSuccess: () => setSloganDraft(null) })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="min-h-12 flex items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Control Panel</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage bot behavior and settings
          </p>
        </div>
      </div>

      {/* Bot Settings card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Bot Settings
          </CardTitle>
          <CardDescription>
            Core behavior settings that take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Commands toggle */}
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-start gap-3">
              <MessageSquareOff className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Accept Commands</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When disabled, all slash commands return a maintenance reply. Useful for bot restarts or downtime.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant={commandsEnabled ? "default" : "outline"}
                className="text-xs"
              >
                {commandsEnabled ? "Enabled" : "Disabled"}
              </Badge>
              <Toggle
                checked={commandsEnabled}
                onChange={handleCommandToggle}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slogans card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Activity Slogans
          </CardTitle>
          <CardDescription>
            The bot randomly cycles through these as its Discord activity status every 15 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Slogan list */}
          <div className="space-y-1.5">
            {slogans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No slogans — add one below or reset to defaults.
              </p>
            ) : (
              slogans.map((slogan, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
                >
                  <span className="flex-1 text-sm">{slogan}</span>
                  <button
                    onClick={() => removeSlogan(idx)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove slogan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add slogan */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a slogan…"
              value={newSlogan}
              onChange={(e) => setNewSlogan(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSlogan()}
              className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
            />
            <Button size="sm" variant="secondary" onClick={addSlogan} disabled={!newSlogan.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground gap-1.5"
              onClick={resetSlogans}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to defaults
            </Button>
            <Button
              size="sm"
              onClick={saveSlogans}
              disabled={!slogansDirty || updateSettings.isPending}
            >
              {updateSettings.isPending ? "Saving…" : "Save Slogans"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
