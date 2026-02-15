import config from "@/config"
import { BassBot } from "@/bot"
import { setupLavalinkEvents } from "./events/lavalink-events"
import { startApiServer } from "./api"
import logger from "@bot/logger"
import { Events } from "discord.js"

const bot = new BassBot()

bot.on(Events.ClientReady, ({ user }) => {
  bot.printBanner(user.displayName)
  setupLavalinkEvents(bot)
  if (config.dashboardEnabled) {
    startApiServer(bot, config.apiPort)
  }
})

void bot.login(config.token)

process.on("unhandledRejection", (error) => {
  logger.error("UNHANDLED", JSON.stringify(error, null, 2))
})
