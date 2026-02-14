import { createCommand, buildOptions } from "@bot/command"
import { cleanTrackTitle } from "@/util/helpers"
import isBoundChannel from "@/validators/isBoundChannel"
import isInBoundVC from "@/validators/isInBoundVC"
import { resolveSong, type ResolvedPlaylist, type ResolvedTrack } from "@/util/song-search"
import { MultiaddModal } from "@/modals/Multiadd.modal"
import isInGuild from "@/validators/isInGuild"
import { createMessageEmbed } from "@bot/message"
import { createReplyHelper } from "@bot/reply"

export default createCommand({
  description: "Add multiple songs to the queue from a list",
  options: buildOptions().build(),

  validators: [isInGuild(), isBoundChannel(), isInBoundVC()],

  run: async ({ i, reply, bot }) => {
    await MultiaddModal.show(i, {
      onSubmit: async (data, submitInteraction) => {
        const reply = createReplyHelper(submitInteraction)
        const songs = data.songList
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)

        if (songs.length === 0) {
          return await reply.warn("No songs provided! Please enter at least one song per line.")
        } else if (songs.length > 50) {
          return await reply.warn("Too many songs! Maximum 50 songs per batch.")
        }

        const connection = bot.lava.connections.get(i.guildId)
        if (connection?.channelId && connection.channelId !== i.member.voice.channelId!) {
          return reply.error(`Already playing music in <#${connection.channelId}>`)
        }

        const player = await bot.getOrCreatePlayer(i)

        const songPlural = songs.length === 1 ? "song" : "songs"
        await reply(`Loading ${songs.length} ${songPlural}...`, { flags: "Ephemeral" })

        const results = {
          added: { tracks: [] as ResolvedTrack[], playlists: [] as ResolvedPlaylist[] },
          failed: [] as string[],
        }

        for (const [index, song] of songs.entries()) {
          try {
            // Show progress for longer lists
            if (songs.length > 10 && index % 3 === 0) {
              await reply(`Loading ${songPlural}... (${index + 1}/${songs.length})`)
            }

            const { success, value: music } = await resolveSong(song, player.node)

            if (!success) {
              results.failed.push(song)
              continue
            }

            if (music.type === "track") {
              await player.addTrack(music.track, false)
              results.added.tracks.push(music)
            } else {
              await player.addTracks(music.tracks, false)
              results.added.playlists.push(music)
            }
          } catch (_) {
            results.failed.push(song)
          }
        }
        
        const tracksAdded = results.added.tracks.length
        const playlistsAdded = results.added.playlists.length
        const totalAdded = tracksAdded + results.added.playlists.reduce((sum, p) => sum + p.tracks.length, 0)

        // Create summary message
        let summary = `Done! **${totalAdded}** song${totalAdded > 1 ? "s" : ""} added`
        if (results.failed.length > 0) {
          summary += `\n**${results.failed.length}** song${results.failed.length === 1 ? "" : "s"} failed to load:`
          summary += `\n${results.failed.map((song) => `• ${song}`).join("\n")}`
        }

        let songList = ""

        if (tracksAdded > 0) {
          songList += `### Added **${tracksAdded}** song${tracksAdded > 1 ? "s" : ""}:`
          const displayLimit = 10
          const toShow = results.added.tracks.slice(0, displayLimit)
          songList += `\n${toShow.map(track => `• **${cleanTrackTitle(track.track)}** by **${track.track.info.author}**`).join("\n")}`

          if (tracksAdded > displayLimit) {
            songList += `\n + ${tracksAdded - displayLimit} more`
          }
        }

        if (playlistsAdded > 0) {
          const displayLimit = 10
          const toShow = results.added.playlists.slice(0, displayLimit)

          songList += `\n\n### Added **${playlistsAdded}** playlist${playlistsAdded > 1 ? "s" : ""}:`
          songList += `\n${toShow.map(p => `• **${p.info.name}** (${p.tracks.length} tracks)`).join("\n")}`
          
          if (playlistsAdded > displayLimit) {
            songList += `\n + ${playlistsAdded - displayLimit} more`
          }
        }

        await reply(summary)
        await i.followUp({ embeds: [createMessageEmbed(songList)] })
      },
      
      onTimeout: async () => {
        await reply.warn("Multiadd modal timed out. Please try again.")
      }

    })
  },
})
