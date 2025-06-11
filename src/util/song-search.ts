import { Result } from "@/util/result"
import { LoadType, type Track, type Node } from "shoukaku"
import logger from "@/util/logger"

export interface ResolvedTrack {
  type: "track"
  track: Track
}

export interface ResolvedPlaylist {
  type: "playlist"
  tracks: Track[]
  info: {
    name: string
  }
}

export type ResolvedMusic = ResolvedTrack | ResolvedPlaylist

/**
 * Resolves a song query (URL or search term) using the same logic as the play command
 * @param query - The song query (URL or search term)
 * @param node - The Lavalink node to use for resolution
 * @returns Maybe with resolved music data or error message
 */
export async function resolveSong(
  query: string,
  node: Node
): Promise<Result<ResolvedMusic, string>> {
  try {
    const result = query.startsWith("http")
      ? await node.rest.resolve(query)
      : ((await node.rest.resolve(`spsearch:${query}`)) ??
        (await node.rest.resolve(`ytmsearch:${query}`)) ??
        (await node.rest.resolve(`ytsearch:${query}`)))
    
    if (!result) {
      return Result.Err("No results found.")
    }

    switch (result.loadType) {
      case LoadType.EMPTY:
        return Result.Err("No results found.")

      case LoadType.ERROR:
        logger.warn(`Song search error: ${JSON.stringify(result.data, null, 2)}`)
        return Result.Err("Could not load song.")

      case LoadType.TRACK:
        return Result.Ok({
          type: "track",
          track: result.data
        })

      case LoadType.PLAYLIST:
        return Result.Ok({
          type: "playlist",
          tracks: result.data.tracks,
          info: {
            name: result.data.info.name
          }
        })

      case LoadType.SEARCH:
        if (result.data.length > 0) {
          return Result.Ok({
            type: "track",
            track: result.data[0]!
          })
        }
        return Result.Err("No results found.")

      default:
        return Result.Err("Unknown result type.")
    }  } catch (error) {
    logger.error("song resolution", String(error))
    return Result.Err("An error occurred while searching for the song.")
  }
}
