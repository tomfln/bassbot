import { prettifyError, type z } from "zod"

/**
 * Parse an env-like record against a Zod schema.
 * On success returns the parsed data; on failure pretty-prints the
 * validation errors and exits the process.
 */
export function parseEnv<T extends z.ZodType>(
  env: Record<string, string | undefined>,
  schema: T,
): z.infer<T> {
  const result = schema.safeParse(env)

  if (!result.success) {
    console.error("\n❌ Invalid environment variables:\n")
    console.error(prettifyError(result.error))
    console.error()
    process.exit(1)
  }

  return result.data
}
