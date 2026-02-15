/**
 * Dev script that runs both the bot (with --watch) and the dashboard dev server concurrently.
 * Works cross-platform (Windows/Linux/Mac).
 */
import { join } from "node:path"

const root = join(import.meta.dir, "..", "..")

const bot = Bun.spawn(["bun", "--watch", "src/index.ts"], {
  cwd: root,
  stdio: ["inherit", "inherit", "inherit"],
})

const dash = Bun.spawn(["bun", "run", "dev"], {
  cwd: join(root, "dashboard"),
  stdio: ["inherit", "inherit", "inherit"],
})

// Forward termination to both processes
function cleanup() {
  bot.kill()
  dash.kill()
}

process.on("SIGINT", cleanup)
process.on("SIGTERM", cleanup)

// Exit when either process exits
await Promise.race([bot.exited, dash.exited])
cleanup()
