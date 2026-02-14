import type { ChatInputCommandInteraction, GuildTextBasedChannel } from "discord.js"
import { Constants, Player, type Track } from "shoukaku"
import { createMessageEmbed, EmbedColor } from "@bot/message"
import { nowPlayingButtons, nowPlayingMessage } from "./util/message"
import type { BassBot } from "./bot"
import logger from "@bot/logger"
import { Queue } from "./queue"

export const LoopMode = {
  None: "None",
  Song: "Song",
  Queue: "Queue",
  Autoplay: "Autoplay",
} as const
export type LoopMode = keyof typeof LoopMode

export class PlayerWithQueue extends Player {
  public q = new Queue()

  public textChannel: GuildTextBasedChannel | null = null
  public bot!: BassBot
  
  private playerMsgId: string | null = null
  private _disconnect: ReturnType<typeof setTimeout> | null = null
  private loopMode: LoopMode = LoopMode.None
  private _playing = false

  async init(bot: BassBot, i: ChatInputCommandInteraction<"cached">) {
    this.bot = bot
    this.textChannel = i.channel

    // Try to restore a saved queue
    const savedQueue = await Queue.load(i.guildId)
    if (savedQueue) {
      this.q = savedQueue
      logger.info(`Restored saved queue for guild ${i.guild.name} (${this.q.totalLength} tracks)`)
    }

    this.on("end", async ({ reason }) => {
      if (this.playerMsgId && this.textChannel) {
        this.textChannel.messages.delete(this.playerMsgId).catch(() => {
          logger.warn(`Failed to delete player message with id: ${this.playerMsgId}`)
        })
      }

      if (reason != "finished" && reason != "loadFailed") return

      if (this.loopMode == LoopMode.Song)
        return this.play(this.q.current)
      
      // Restart queue when looping and reached the end
      if (this.loopMode == LoopMode.Queue && this.q.length == 0) {
        this.q.restart()
        return this.next()
      }
      else if (this.loopMode == LoopMode.Autoplay) {
        // TODO: Implement autoplay
        await this.next()
      }
      await this.next()
    })

    this.on("start", async (data) => {
      if (!this.textChannel) return
      const msg = await this.textChannel.send(nowPlayingMessage(data.track))
      this.playerMsgId = msg.id

      logger.info(`[${i.guild} > ${i.member.voice.channel?.name} @ ${this.node.name}] ${data.track.info.title} - ${data.track.info.author}`)
    })

    this.on("exception", async ({ exception }) => {
      if (!this.textChannel) return

      await this.textChannel.send({
        embeds: [
          createMessageEmbed(`An error occurred while playing the track: ${exception.message}`, {
            color: EmbedColor.Error,
          }),
        ],
      })
    })

    this.on("closed", async () => {
      if (this.node.state !== Constants.State.CONNECTED) return
      await this.disconnect()
    })

    this.bot.on("voiceStateUpdate", (prev, next) => {
      const currentVC = this.bot.guilds.cache.get(this.guildId)?.members.me?.voice.channel
      if (!currentVC) return

      if (prev.channelId !== currentVC.id && next.channelId !== currentVC.id) return
      const members = currentVC.members.filter((m) => !m.user.bot)

      if (members.size == 0) this.scheduleDisconnect()
      else this.cancelDisconnect()
    })
  }

  public get current() {
    return this._playing ? this.q.current : undefined
  }

  /** Convenience getters for backward compatibility with commands */
  public get queue(): readonly Track[] {
    return this.q.upcoming
  }

  public get history(): readonly Track[] {
    return this.q.history
  }

  public async play(track: Track | undefined) {
    if (!track) {
      this._playing = false
      await this.stopTrack()
      this.scheduleDisconnect()
      return
    }

    this._playing = true
    this.cancelDisconnect()
    await this.playTrack({
      track: { encoded: track.encoded },
      paused: false,
      volume: 50,
    }, false)
  }

  public async next(pos: number | null = null) {
    const track = this.q.next(pos && pos > 1 ? pos : 1)
    await this.play(track)
    void this.q.save(this.guildId)
  }

  public async prev() {
    const track = this.q.prev()
    await this.play(track)
    void this.q.save(this.guildId)
  }

  public async addTracks(tracks: Track[], next = false) {
    // When not actively playing, always insert as "next" so the new track
    // plays before any remaining items from a restored queue
    this.q.add(tracks, next || !this._playing)
    if (!this.current) await this.next()
    else void this.q.save(this.guildId)
  }
  public addTrack(track: Track, next = false) {
    return this.addTracks([track], next)
  }

  public shuffle() {
    this.q.shuffle()
    void this.q.save(this.guildId)
  }

  public clear() {
    this.q.clear()
    void this.q.save(this.guildId)
  }

  public moveTrack(from: number, to: number) {
    const track = this.q.move(from, to)
    if (track) void this.q.save(this.guildId)
    return track
  }

  public remove(from: number, to: number) {
    const count = this.q.remove(from, to)
    if (count) void this.q.save(this.guildId)
    return count
  }

  public async setPaused(paused: boolean) {
    if (this.paused != paused && this.textChannel && this.playerMsgId) {
      const msg = this.textChannel.messages.cache.get(this.playerMsgId)
      if (msg) await msg.edit({ components: [nowPlayingButtons(paused)] })
    }
    return super.setPaused(paused)
  }

  public setLoopMode(mode: LoopMode) {
    this.loopMode = mode
  }

  public getQueueDuration() {
    return this.q.getUpcomingDuration()
  }

  public async disconnect() {
    // Save the queue before disconnecting
    void this.q.save(this.guildId)
    await this.destroy()
    await this.bot.leaveVC(this.guildId)
  }

  public scheduleDisconnect(seconds = 60) {
    this.cancelDisconnect()
    
    this._disconnect = setTimeout(async () => {
      await this.disconnect()
    }, seconds * 1000)
  }
  
  public cancelDisconnect() {
    if (this._disconnect) clearTimeout(this._disconnect)
  }
}