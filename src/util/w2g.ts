import config from "@/config"
import { z } from "zod"

const createRoomResponseSchema = z.object({
  streamkey: z.string(),
})

export async function createRoom(vid_url: string | null) {
  try {
    const res = await fetch("https://api.w2g.tv/rooms/create.json", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        w2g_api_key: config.w2gKey,
        share: vid_url ?? "",
        bg_color: "#404040",
        bg_opacity: "100",
      }),
    }).then((r) => r.json())

    const { streamkey } = createRoomResponseSchema.parse(res)

    return "https://w2g.tv/rooms/" + streamkey
  } catch (err) {
    console.error(err)
    return ""
  }
}
