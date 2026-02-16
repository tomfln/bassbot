import { createCommand, buildOptions } from "@bot/command"
import { cleanTrackTitle } from "@/util/helpers"
import isBoundChannel from "@/validators/isBoundChannel"
import isInBoundVC from "@/validators/isInBoundVC"
import { resolveSong } from "@/util/song-search"
import { log } from "@/util/activity-log"

export default createCommand({
  description: "Play a song.",
  options: buildOptions()
    .string({
      name: "song",
      description: "The name/url of the song to play.",
      required: true,
    })
    .boolean({
      name: "next",
      description: "Play as next song",
    })
    .build(),

  validators: [isBoundChannel(), isInBoundVC()],

  run: async ({ i, bot, reply, options }) => {
    await i.deferReply()

    // Check for existing player
    const connection = bot.lava.connections.get(i.guildId)
    if (connection?.channelId && connection.channelId !== i.member.voice.channelId!) {
      return reply.error(`Already playing music in <#${connection.channelId}>`)
    }
    
    const player = bot.getPlayer(i.guildId) ?? (await bot.joinVC(i))
    const { success, value: music, error } = await resolveSong(options.song, player.node)
    
    if (!success) return reply.error(error)

    switch (music.type) {
      case "track":
        await player.addTrack(music.track, options.next ?? false)
        log(i, "play", `added ${cleanTrackTitle(music.track)} by ${music.track.info.author}`)
        return reply(`Queued **${cleanTrackTitle(music.track)}** by **${music.track.info.author}**`)

      case "playlist":
        await player.addTracks(music.tracks, options.next ?? false)
        log(i, "play", `added ${music.tracks.length} songs from ${music.info.name}`)
        return reply(
          `Added **${music.tracks.length}** songs from **[${music.info.name}](${options.song})** to the queue`,
        )
    }
  },
})
