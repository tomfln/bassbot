"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { formatDuration } from "@/lib/format"
import { Music, ChevronDown, GripVertical, MoreVertical, Trash2, ListStart } from "lucide-react"
import type { Track } from "@/hooks/use-api"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Generate a stable-ish ID for a track using its content + index */
function trackId(track: Track, index: number) {
  return `${index}-${track.title}-${track.author}`
}

/* ── Single track row (non-sortable) ─────────────────────── */

export function TrackRow({
  track,
  index,
  active,
  onRemove,
  onPlayNext,
  showDragHandle,
}: {
  track: Track
  index: number
  active?: boolean
  onRemove?: () => void
  onPlayNext?: () => void
  showDragHandle?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      onContextMenu={(onRemove || onPlayNext) ? (e) => { e.preventDefault(); setMenuOpen(true) } : undefined}
      className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg border ${
        active
          ? "bg-primary/10 border-primary/20"
          : "bg-card border-border hover:bg-accent/50"
      }`}
    >
      {showDragHandle && (
        <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 cursor-grab" />
      )}
      <span className="text-xs text-muted-foreground w-4 text-center shrink-0">
        {index + 1}
      </span>
      {track.artworkUrl ? (
        <img
          src={track.artworkUrl}
          alt=""
          className="h-8 w-8 rounded object-cover shrink-0"
        />
      ) : (
        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
          <Music className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-tight truncate ${active ? "text-primary font-medium" : ""}`}
        >
          {track.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">{track.author}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {formatDuration(track.length)}
      </span>
      {(onRemove || onPlayNext) && (
        <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-35">
            {onPlayNext && (
              <DropdownMenuItem onClick={onPlayNext}>
                <ListStart className="h-4 w-4 mr-2" />
                Play Next
              </DropdownMenuItem>
            )}
            {onRemove && (
              <DropdownMenuItem variant="destructive" onClick={onRemove}>
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

/* ── Sortable wrapper ─────────────────────────────────────── */

/** Never animate layout changes — prevents ghost animations on data refresh */
const noLayoutAnimation = () => false

function SortableTrack({
  id,
  track,
  index,
  active,
  onRemove,
  onPlayNext,
}: {
  id: string
  track: Track
  index: number
  active?: boolean
  onRemove?: () => void
  onPlayNext?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({ id, animateLayoutChanges: noLayoutAnimation })

  const style = {
    transform: CSS.Transform.toString(transform),
    // Only apply transition when actively sorting (drag in progress)
    // — prevents animation when server data refreshes after reorder
    transition: isSorting ? transition : undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        onContextMenu={(onRemove || onPlayNext) ? (e) => { e.preventDefault(); setMenuOpen(true) } : undefined}
        className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg border scope-hover ${
          active
            ? "bg-primary/10 border-primary/20"
            : "bg-card border-border hover:bg-accent/50"
        }`}
      >
        <div {...listeners} onContextMenu={(e: React.MouseEvent) => e.preventDefault()} className="shrink-0 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        </div>
        <span className="text-xs text-muted-foreground w-4 text-center shrink-0">
          {index + 1}
        </span>
        {track.artworkUrl ? (
          <img
            src={track.artworkUrl}
            alt=""
            loading="lazy"
            className="h-8 w-8 rounded object-cover shrink-0"
          />
        ) : (
          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
            <Music className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm leading-tight truncate ${active ? "text-primary font-medium" : ""}`}
          >
            {track.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {track.author}
          </p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {formatDuration(track.length)}
        </span>
        {(onRemove || onPlayNext) && (
          <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-35">
              {onPlayNext && (
                <DropdownMenuItem onClick={onPlayNext}>
                  <ListStart className="h-4 w-4 mr-2" />
                  Play Next
                </DropdownMenuItem>
              )}
              {onRemove && (
                <DropdownMenuItem variant="destructive" onClick={onRemove}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

/* ── TrackList with optional DnD ──────────────────────────── */

/**
 * Displays tracks with optional drag-and-drop reordering.
 *
 * - `onReorder(from, to)` — enables DnD; called with old/new indices
 * - `onRemove(index)` — shows an × button per track
 * - `onLoadMore` — shows a "show more" button when `total > tracks.length`
 */
export function TrackList({
  tracks,
  total,
  onLoadMore,
  activeIndex,
  onReorder,
  onRemove,
  onPlayNext,
}: {
  tracks: Track[]
  total?: number
  onLoadMore?: () => void
  activeIndex?: number
  onReorder?: (from: number, to: number) => void
  onRemove?: (index: number) => void
  onPlayNext?: (index: number) => void
}) {
  const remaining = (total ?? tracks.length) - tracks.length
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  // Optimistic local state — immediately reflects reorder without waiting for server
  const [localTracks, setLocalTracks] = useState(tracks)
  useEffect(() => { setLocalTracks(tracks) }, [tracks])

  // Derive IDs from current local track content — always in sync
  const sortableIds = useMemo(
    () => localTracks.map((t, i) => trackId(t, i)),
    [localTracks],
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !onReorder) return
    const from = sortableIds.indexOf(active.id as string)
    const to = sortableIds.indexOf(over.id as string)
    if (from === -1 || to === -1) return

    // Optimistically reorder local state immediately
    setLocalTracks((prev) => arrayMove(prev, from, to))
    onReorder(from, to)
  }, [sortableIds, onReorder])

  if (onReorder) {
    return (
      <div className="space-y-1.5">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            {localTracks.map((track, i) => (
              <SortableTrack
                key={sortableIds[i]}
                id={sortableIds[i]!}
                track={track}
                index={i}
                active={i === activeIndex}
                onRemove={onRemove ? () => onRemove(i) : undefined}
                onPlayNext={onPlayNext ? () => onPlayNext(i) : undefined}
              />
            ))}
          </SortableContext>
        </DndContext>
        {remaining > 0 && onLoadMore && (
          <button
            onClick={onLoadMore}
            className="flex items-center justify-center gap-1.5 w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Show more ({remaining} remaining)
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {tracks.map((track, i) => (
        <TrackRow
          key={i}
          track={track}
          index={i}
          active={i === activeIndex}
          onRemove={onRemove ? () => onRemove(i) : undefined}
          onPlayNext={onPlayNext ? () => onPlayNext(i) : undefined}
        />
      ))}
      {remaining > 0 && onLoadMore && (
        <button
          onClick={onLoadMore}
          className="flex items-center justify-center gap-1.5 w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Show more ({remaining} remaining)
        </button>
      )}
    </div>
  )
}
