"use client"

import { useState, useMemo } from "react"
import { Search, X, Terminal, ChevronRight, Music, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"

/* ── Types ────────────────────────────────────────────────── */

interface CommandOption {
  name: string
  description: string
  type: string
  required?: boolean
  choices?: { name: string; value: string | number }[]
  minValue?: number
  maxValue?: number
}

interface CommandInfo {
  name: string
  category: string
  description: string
  options: CommandOption[]
}

/* ── Category metadata ────────────────────────────────────── */

const CATEGORY_META: Record<string, { label: string; icon: typeof Music }> = {
  music: { label: "Music", icon: Music },
  util: { label: "Utility", icon: Wrench },
}

/* ── Option type badge colors ─────────────────────────────── */

const TYPE_COLORS: Record<string, string> = {
  string: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  integer: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  number: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  boolean: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  user: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  channel: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  role: "bg-pink-500/15 text-pink-400 border-pink-500/20",
}

/* ── Command card ─────────────────────────────────────────── */

function CommandCard({
  command,
  isExpanded,
  onToggle,
}: {
  command: CommandInfo
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={cn(
        "group relative rounded-xl border border-white/8 bg-card/50 backdrop-blur-sm transition-all duration-200 scope-hover",
        "hover:border-white/15 hover:bg-accent/30",
      )}
    >
      {/* Glow effect on hover/expand */}
      <div
        className={cn(
          "absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 pointer-events-none",
          isExpanded ? "opacity-100" : "group-hover:opacity-50",
        )}
        style={{
          background:
            "radial-gradient(circle at 0% 0%, oklch(0.77 0.20 131 / 0.08), transparent 50%)",
        }}
      />

      {/* Header — always visible */}
      <button
        onClick={command.options.length > 0 ? onToggle : undefined}
        className={cn(
          "relative w-full text-left px-4 py-3 flex items-center gap-3",
          command.options.length === 0 && "cursor-default",
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-sm font-semibold text-primary">
              /{command.name}
            </span>
            {command.options.length > 0 && (
              <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
                {command.options.map((o) => (o.required ? `<${o.name}>` : `[${o.name}]`)).join(" ")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {command.description}
          </p>
        </div>
        {command.options.length > 0 && (
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground/50 shrink-0 transition-transform duration-200",
              isExpanded && "rotate-90",
            )}
          />
        )}
      </button>

      {/* Expanded detail */}
      {isExpanded && command.options.length > 0 && (
        <div className="relative px-4 pb-4 pt-1 border-t border-white/6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2">
            Parameters
          </p>
          <div className="space-y-2">
            {command.options.map((opt) => (
              <div
                key={opt.name}
                className="flex items-start gap-2.5 rounded-lg bg-background/80 /80 px-3 py-2"
              >
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 mt-0.5",
                    TYPE_COLORS[opt.type] ?? "bg-muted text-muted-foreground border-border",
                  )}
                >
                  {opt.type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-mono font-medium">{opt.name}</span>
                    <div className="flex-1" />
                    {opt.required && (
                      <span className="text-[9px] font-semibold uppercase text-primary/70">
                        required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {opt.description}
                  </p>
                  {opt.choices && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {opt.choices.map((c) => (
                        <span
                          key={String(c.value)}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary/80 border border-primary/15"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {(opt.minValue != null || opt.maxValue != null) && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                      {opt.minValue != null && `min: ${opt.minValue}`}
                      {opt.minValue != null && opt.maxValue != null && " · "}
                      {opt.maxValue != null && `max: ${opt.maxValue}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main list ────────────────────────────────────────────── */

export function CommandList({ commands }: { commands: CommandInfo[] }) {
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const categories = useMemo(
    () => [...new Set(commands.map((c) => c.category))],
    [commands],
  )

  const filtered = useMemo(() => {
    let result = commands
    if (activeCategory) {
      result = result.filter((c) => c.category === activeCategory)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.options.some((o) => o.name.includes(q)),
      )
    }
    return result
  }, [commands, search, activeCategory])

  const grouped = useMemo(() => {
    const map = new Map<string, CommandInfo[]>()
    for (const cmd of filtered) {
      const arr = map.get(cmd.category) ?? []
      arr.push(cmd)
      map.set(cmd.category, arr)
    }
    return map
  }, [filtered])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="min-h-12 flex items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commands</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {commands.length} commands available
          </p>
        </div>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search commands…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-card pl-9 pr-8 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              activeCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-accent/50 text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            All
          </button>
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat]
            const Icon = meta?.icon ?? Terminal
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent/50 text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                <Icon className="h-3 w-3" />
                {meta?.label ?? cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Command list by category */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Terminal className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No commands found</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([category, cmds]) => {
            const meta = CATEGORY_META[category]
            const Icon = meta?.icon ?? Terminal
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {meta?.label ?? category}
                  </h2>
                  <span className="text-xs text-muted-foreground/50">
                    ({cmds.length})
                  </span>
                </div>
                <div className="grid gap-2">
                  {cmds.map((cmd) => (
                    <CommandCard
                      key={cmd.name}
                      command={cmd}
                      isExpanded={expanded === cmd.name}
                      onToggle={() =>
                        setExpanded(expanded === cmd.name ? null : cmd.name)
                      }
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
