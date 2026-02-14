import type { Track } from "shoukaku"
import { type GuildOptions } from "./db"
import type { z } from "zod"
import { Result } from "@bot/result"

/** Checks if a channel id is an allowed channel based on the guild's options */
export function isAllowedChannel(guildOpts: GuildOptions | null, channelId: string): guildOpts is null {
  // Check if the guild has bound channels, if not, allow the command
  if (!guildOpts || guildOpts.channels.length == 0) return true

  // Check if the channel is a bound channel
  return guildOpts.channels.includes(channelId)
}



/** Removes unnecessary info and duplicated artist names from the title */
export function cleanTrackTitle(track: Track) {
  let title = track.info.title

  // filter out unnecessary info enclosed in brackets
  // eslint-disable-next-line no-useless-escape
  title = title.replace(/([\S\s]{3})[\[\(].*[\]\)][\s\S]*$/, "$1")

  // filter out features (u2013 is a longer dash character)
  title = title.replace(/\s(feat\.|ft\.)[^\u002d\u2013]*/i, " ").trim()

  // revert to original title if the title is too short after cleaning
  if (title.length < 3) title = track.info.title

  // filter out artists
  const split = title.split(/ \u002d|\u2013 /)

  if (split.length === 2) {
    const regex = new RegExp(`${track.info.author}`, "i")
    if (split[0]?.search(regex) != -1) {
      title = split[1]!
    } else if (split[1]?.search(regex) != -1) {
      title = split[0]
    }
  }
  return title.trim()
}

export async function fetchAndParse<T extends z.ZodSchema>(
  url: string,
  schema: T,
  init?: RequestInit
): Promise<Result<z.infer<T>, unknown>> {
  try {
    const json = await fetch(url, init).then((d) => d.json())
    return Result.Ok(schema.parse(json))
  } catch (e) {
    return Result.Err(e)
  }
}
