import type { Track } from "shoukaku"
import db from "./util/db"
import logger from "./util/logger"

const QUEUE_MAX_AGE_MS = 4 * 60 * 60 * 1000 // 4 hours

export interface SerializedQueue {
  tracks: Track[]
  position: number
  savedAt: number
}

/**
 * A queue that stores all tracks (played, current, upcoming) in a single list
 * with a cursor/position pointer. This allows easy navigation forwards and backwards.
 */
export class Queue {
  private tracks: Track[] = []
  /** Position of the currently playing track. -1 means nothing is playing. */
  private position = -1

  /** Get all tracks in the queue (played + current + upcoming) */
  public get all(): readonly Track[] {
    return this.tracks
  }

  /** Get the currently playing track, or undefined if nothing is playing */
  public get current(): Track | undefined {
    if (this.position < 0 || this.position >= this.tracks.length) return undefined
    return this.tracks[this.position]
  }

  /** Get the tracks that have already been played (before the cursor) */
  public get history(): readonly Track[] {
    if (this.position <= 0) return []
    return this.tracks.slice(0, this.position)
  }

  /** Get the upcoming tracks (after the cursor) */
  public get upcoming(): readonly Track[] {
    if (this.position < 0) return this.tracks
    return this.tracks.slice(this.position + 1)
  }

  /** Number of upcoming tracks */
  public get length(): number {
    return this.upcoming.length
  }

  /** Total number of tracks including history and current */
  public get totalLength(): number {
    return this.tracks.length
  }

  /** Add tracks to the end of the queue or at the next position */
  public add(tracks: Track[], next = false): void {
    if (next) {
      const insertAt = this.position < 0 ? 0 : this.position + 1
      this.tracks.splice(insertAt, 0, ...tracks)
    } else {
      this.tracks.push(...tracks)
    }
  }

  /**
   * Move to the next track.
   * @param skip Number of tracks to skip ahead (default 1)
   * @returns The new current track, or undefined if end of queue
   */
  public next(skip = 1): Track | undefined {
    const newPos = this.position + skip
    if (newPos >= this.tracks.length) {
      return undefined
    }
    this.position = newPos
    return this.current
  }

  /**
   * Move to the previous track.
   * @returns The new current track, or undefined if at the start
   */
  public prev(): Track | undefined {
    if (this.position <= 0) return undefined 
    this.position--
    return this.current
  }

  /** Shuffle only the upcoming tracks (after the cursor) */
  public shuffle(): void {
    const start = this.position < 0 ? 0 : this.position + 1
    const upcomingSlice = this.tracks.slice(start)

    for (let i = upcomingSlice.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = upcomingSlice[j]!
      upcomingSlice[j] = upcomingSlice[i]!
      upcomingSlice[i] = tmp
    }

    this.tracks = [...this.tracks.slice(0, start), ...upcomingSlice]
  }

  /** Clear all upcoming tracks (keeps history and current) */
  public clear(): void {
    const keepUntil = this.position < 0 ? 0 : this.position + 1
    this.tracks = this.tracks.slice(0, keepUntil)
  }

  /** 
   * Move a track from one position to another within the upcoming tracks.
   * Positions are 0-indexed relative to the upcoming portion.
   * @returns The moved track, or null if invalid positions
   */
  public move(from: number, to: number): Track | null {
    const base = this.position < 0 ? 0 : this.position + 1
    const absFrom = base + from
    const absTo = base + to

    if (!this.isValidUpcomingPos(from, true) || !this.isValidUpcomingPos(to, true)) return null

    const track = this.tracks.splice(absFrom, 1)[0]!
    this.tracks.splice(absTo, 0, track)
    return track
  }

  /**
   * Remove tracks from the upcoming portion of the queue.
   * Positions are 0-indexed relative to the upcoming portion.
   * @returns Number of removed tracks, or null if invalid positions
   */
  public remove(from: number, to: number): number | null {
    const base = this.position < 0 ? 0 : this.position + 1
    const upcomingLen = this.upcoming.length

    if (from > to || from < 0 || from >= upcomingLen || to < 0 || to >= upcomingLen) return null

    const absFrom = base + from
    const absTo = base + to
    const deleted = this.tracks.splice(absFrom, absTo - absFrom + 1)
    return deleted.length
  }

  /** Get the total duration of upcoming tracks in milliseconds */
  public getUpcomingDuration(): number {
    return this.upcoming.reduce((acc, track) => acc + track.info.length, 0)
  }

  /** 
   * Reset the queue for loop mode: move position back to the start.
   * Used when looping the whole queue.
   */
  public restart(): void {
    this.position = -1
  }

  /** Check if a position is valid in the upcoming portion */
  private isValidUpcomingPos(pos: number, allowEnd: boolean): boolean {
    const len = this.upcoming.length
    return allowEnd ? pos >= 0 && pos <= len : pos >= 0 && pos < len
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  /** Serialize the queue for storage */
  public serialize(): SerializedQueue {
    return {
      tracks: [...this.tracks],
      position: this.position,
      savedAt: Date.now(),
    }
  }

  /** Restore a queue from serialized data */
  public static deserialize(data: SerializedQueue): Queue {
    const q = new Queue()
    q.tracks = [...data.tracks]
    q.position = data.position
    return q
  }

  /** Check if saved queue data is still valid (not expired) */
  public static isValid(data: SerializedQueue): boolean {
    return Date.now() - data.savedAt < QUEUE_MAX_AGE_MS
  }

  /** Save the queue to the database for a guild */
  public async save(guildId: string): Promise<void> {
    try {
      const existing = await db.savedQueues.find({ guildId })
      const data = this.serialize()
      if (existing) {
        await db.savedQueues.updateById(existing._id, { 
          queue: data,
        })
      } else {
        await db.savedQueues.create({ guildId, queue: data })
      }
    } catch (e) {
      logger.warn(`Failed to save queue for guild ${guildId}: ${String(e)}`)
    }
  }

  /** Load a saved queue for a guild, returns null if expired or not found */
  public static async load(guildId: string): Promise<Queue | null> {
    try {
      const saved = await db.savedQueues.find({ guildId })
      if (!saved) return null

      if (!Queue.isValid(saved.queue)) {
        await db.savedQueues.deleteById(saved._id)
        return null
      }

      return Queue.deserialize(saved.queue)
    } catch (e) {
      logger.warn(`Failed to load queue for guild ${guildId}: ${String(e)}`)
      return null
    }
  }

  /** Delete saved queue for a guild */
  public static async deleteSaved(guildId: string): Promise<void> {
    try {
      const saved = await db.savedQueues.find({ guildId })
      if (saved) await db.savedQueues.deleteById(saved._id)
    } catch (e) {
      logger.warn(`Failed to delete saved queue for guild ${guildId}: ${String(e)}`)
    }
  }
}
