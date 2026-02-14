import { createCommand, buildOptions } from "@bot/command"
import { fetchAndParse } from "@/util/helpers"
import { z } from "zod"

const suggestSchema = z.object({
  data: z.array(
    z.object({
      artist: z.object({ name: z.string().min(1) }),
      title: z.string().min(1),
    })
  ),
})

const lyricsSchema = z.object({
  lyrics: z.string().min(2),
})

export default createCommand({
  description: "Search for the lyrics of a specific song",
  options: buildOptions()
    .string({
      name: "search_term",
      description: "The search query, preferably the artist name and song name",
      required: true,
    })
    .build(),

  run: async ({ i, options, reply }) => {
    await i.deferReply()

    const res = await fetchAndParse(
      "https://api.lyrics.ovh/suggest/" + options.search_term.normalize("NFD"),
      suggestSchema
    )
    if (!res.success) return reply.error("Couldn't reach lyrics API")
    const track = res.value.data.at(0)
    if (!track) return reply.warn("Can't find lyrics for this song")

    const lyrics = await fetchAndParse(
      "https://api.lyrics.ovh/v1/" + track.artist.name + "/" + track.title,
      lyricsSchema
    )
    if (!lyrics.success) return reply.warn("Can't find lyrics for this song")

    return reply(cleanLyrics(lyrics.value.lyrics), { title: "Lyrics for " + track.title + " by " + track.artist.name })
  },
})

/** Remove unnecessary newlines, unsupported symbols and text */
export function cleanLyrics(lyrics: string) {
  return lyrics
    .replaceAll("\r", "")
    .replace(/Paroles de la.*\n/gm, "")
    .replaceAll("\n\n\n", "\n\n")
    .replaceAll("´", "'")
    .replaceAll("`", "'")
}
