import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/util/schema.ts",
  out: "./drizzle",
})
