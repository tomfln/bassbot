import type { BassBot } from "@/bot"
import logger from "@bot/logger"

export const setupLavalinkEvents = ({ lava }: BassBot) => {
  lava.on("ready", (name) => {
    logger.info(`[lavalink @ ${name}]: ready`)
  })
  lava.on("error", (name, error) => {
    logger.warn(`[lavalink @ ${name}]: error: ${JSON.stringify(error, null, 2)}`)
  })
  lava.on("close", (name, code, reason) => {
    logger.info(`[lavalink @ ${name}]: closed, code: ${code}, reason: ${reason}`)
  })
  lava.on("disconnect", (name, reason) => {
    logger.warn(`[lavalink @ ${name}]: disconnected, reason: ${reason}`)
  })
  lava.on("reconnecting", (name, tries) => {
    logger.info(`[lavalink @ ${name}]: reconnecting, ${tries} tries left`)
  })
}
