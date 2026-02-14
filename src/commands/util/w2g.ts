import { buildOptions, createCommand } from "@bot/command"
import logger from "@bot/logger"
import { createRoom } from "@/util/w2g"
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js"

export default createCommand({
  description: "Create a Watch2Gether room.",
  options: buildOptions()
    .string({
      name: "url",
      description: "The video url to play in the new room.",
    })
    .build(),

  run: async ({ i, options }) => {
    const url = await createRoom(options.url)

    if (url == "") {
      logger.error("w2g", `Failed to create room with video url ${options.url}.`)
      return i.reply("Failed to create room.")
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel("Open Room!").setStyle(ButtonStyle.Link).setURL(url)
    )

    logger.info("Created room: " + url)

    await i.reply({
      components: [row],
    })
  },
})
