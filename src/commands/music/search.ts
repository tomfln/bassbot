import { createCommand, buildOptions } from "@/util/command";
import { cleanTrackTitle } from "@/util/helpers";
import { createMessageEmbed } from "@/util/message";
import { ActionRowBuilder, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { LoadType } from "shoukaku";

function abbreviateString(str: string, maxLen: number) {
  return str.length > maxLen ? str.slice(0, maxLen - 3) + "..." : str
}

export default createCommand({
  description: "Search for a song.",
  options: buildOptions()
    .string({
      name: "query",
      description: "The song you want to search for.",
      required: true,
    })
    .build(),

  run: async ({ i, options, reply, bot }) => {
    const connection = bot.lava.connections.get(i.guildId)

    if (connection?.channelId && connection.channelId !== i.member.voice.channelId!) {
      return reply.error(`Already playing music in <#${connection.channelId}>`)
    }

    const node = bot.lava.getIdealNode()
    if (!node) {
      return reply.error("No available nodes.");
    }
    
    const result = await Promise.all([
      node.rest.resolve(`spsearch:${options.query}`),
      node.rest.resolve(`ytmsearch:${options.query}`),
    ])
    
    const songs = result
      .map((r) => (r?.loadType === LoadType.SEARCH ? r.data : []))
      .flat()
      .splice(0, 25)

    if (songs.length === 0) return reply.error("No results found.")
      
    const select = new StringSelectMenuBuilder()
      .setCustomId("song-select")
      .setPlaceholder("Select a song...")
      .addOptions(
        songs.map((track, i) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(abbreviateString(track.info.title, 100))
            .setValue(i.toString())
            .setDescription(track.info.author)
        ),
      )
      
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)
    
    const response = await i.reply({
      embeds: [createMessageEmbed(`${songs.length} results found, select one:`)],
      components: [row],
      withResponse: true,
      flags: "Ephemeral",
    })
    
    try {
      const confirmation = await response.resource?.message?.awaitMessageComponent<ComponentType.StringSelect>({
        time: 120_000,
      })
      
      if (confirmation?.customId === "song-select") {
        const selection = confirmation.values[0]!
        const track = songs[parseInt(selection)]!

        const player = bot.getPlayer(i.guildId) ?? (await bot.joinVC(i))
        
        await Promise.all([
          i.deleteReply(response.resource?.message?.id),
          i.followUp({
            embeds: [createMessageEmbed(`Queued **${cleanTrackTitle(track)}** by **${track.info.author}**`)],
          }),
        ])

        await player.addTrack(track, false)
      }
    } catch(_e) {
      await i.editReply({ embeds: [createMessageEmbed("You took too long to select a song.")], components: [] })
    }
  },
})