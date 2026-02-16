import {
  Play,
  SkipForward,
  SkipBack,
  Pause,
  Square,
  Trash2,
  Shuffle,
  Volume2,
  Repeat,
  Timer,
  ArrowUpDown,
  ListPlus,
  PlayCircle,
} from "lucide-react"

export const ACTION_ICONS: Record<string, typeof Play> = {
  play: Play,
  skip: SkipForward,
  prev: SkipBack,
  pause: Pause,
  resume: PlayCircle,
  stop: Square,
  clear: Trash2,
  remove: Trash2,
  shuffle: Shuffle,
  volume: Volume2,
  loop: Repeat,
  seek: Timer,
  move: ArrowUpDown,
  loadqueue: ListPlus,
}

export const ACTION_BG_COLORS: Record<string, string> = {
  play: "bg-green-500",
  skip: "bg-blue-500",
  prev: "bg-blue-500",
  pause: "bg-yellow-500",
  resume: "bg-green-500",
  stop: "bg-red-500",
  clear: "bg-red-500",
  remove: "bg-red-500",
  shuffle: "bg-purple-500",
  volume: "bg-orange-500",
  loop: "bg-cyan-500",
  seek: "bg-amber-500",
  move: "bg-indigo-500",
  loadqueue: "bg-teal-500",
}

export const ALL_ACTIONS = Object.keys(ACTION_ICONS)
