import { z } from "zod"

export function initEnv<T extends z.ZodSchema>(envModel: T): z.infer<T> {
  const result = envModel.safeParse(process.env)

  if (!result.success) {
    console.error("\n❌ Invalid environment variables:")
    for (const entry of Object.entries(result.error.flatten().fieldErrors)) {
      console.error(` - ${entry[0]}: ${entry[1]}`)
    }
    console.error("\n")
    process.exit(1)
  }

  return result.data
}
