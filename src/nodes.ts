import path from "node:path"
import { z } from "zod"
import env from "./env"

const nodeOptionSchema = z.array(
  z.object({
    name: z.string(),
    url: z.string(),
    auth: z.string(),
    secure: z.boolean().optional(),
    group: z.string().optional(),
  }),
)

async function loadNodes() {
  const defPath = path.join(env.DATA_DIR, "nodes.json")
  const file = Bun.file(defPath)

  if (!await file.exists()) return []

  const nodes = await file.json()
  const parsed = nodeOptionSchema.safeParse(nodes)

  if (!parsed.success) {
    console.error("\n❌ Invalid node definition:")
    console.error(z.prettifyError(parsed.error))
    console.error("\n")
    process.exit(1)
  }
  
  if (parsed.data.length === 0) {
    console.warn("\n⚠️  No nodes defined in nodes.json\n")
  }

  return parsed.data
}

export default await loadNodes()
