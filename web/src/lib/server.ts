import { Elysia } from "elysia"
import { auth } from "./auth"
import { db } from "./db"
import { account, user, webSettings } from "./schema"
import { eq } from "drizzle-orm"
import { signJwt, type JwtPayload } from "./jwt"

/**
 * Elysia backend for the web app.
 * Mounted in Next.js via catch-all route at `/rest/[...path]`.
 *
 * Endpoints:
 * - /rest/auth/*  — BetterAuth (Discord OAuth, sessions)
 * - /rest/jwt     — Issue a JWT for the bot API
 * - /rest/me      — Current user info
 * - /rest/my-guilds — User's Discord guilds intersected with bot guilds
 * - /rest/admin/* — Admin-only APIs
 */

/** Helper: Get session from request headers */
async function getSession(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  return session
}

/** Helper: require authenticated session */
async function requireSession(request: Request) {
  const session = await getSession(request)
  if (!session) throw new Response("Unauthorized", { status: 401 })
  return session
}

/** Helper: require admin role */
async function requireAdmin(request: Request) {
  const session = await requireSession(request)
  const userWithRole = session.user as typeof session.user & { role?: string }
  if (userWithRole.role !== "admin") {
    throw new Response("Forbidden", { status: 403 })
  }
  return session
}

/** Get the Discord account ID for a user */
async function getDiscordAccountId(userId: string): Promise<string | null> {
  const acct = await db.query.account.findFirst({
    where: eq(account.userId, userId),
    columns: { accountId: true },
  })
  return acct?.accountId ?? null
}

/** Get the Discord access token for a user */
async function getDiscordAccessToken(userId: string): Promise<string | null> {
  const acct = await db.query.account.findFirst({
    where: eq(account.userId, userId),
    columns: { accessToken: true },
  })
  return acct?.accessToken ?? null
}

const routes = new Elysia()
  // Forward auth requests to BetterAuth (preserve original request URL)
  .all("/auth/*", async ({ request }) => auth.handler(request))

  // Issue JWT for bot API access
  .get("/jwt", async ({ request }) => {
    const session = await requireSession(request)
    const discordId = await getDiscordAccountId(session.user.id)
    const userWithRole = session.user as typeof session.user & { role?: string }

    const payload: JwtPayload = {
      sub: session.user.id,
      discordId: discordId ?? "",
      role: (userWithRole.role as "admin" | "user") ?? "user",
      name: session.user.name,
      avatar: session.user.image ?? "",
    }

    const token = await signJwt(payload)
    return { token }
  })

  // Current user info
  .get("/me", async ({ request }) => {
    const session = await getSession(request)
    if (!session) return { user: null }

    const discordId = await getDiscordAccountId(session.user.id)
    const userWithRole = session.user as typeof session.user & { role?: string }
    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: userWithRole.role ?? "user",
        discordId,
        createdAt: session.user.createdAt,
      },
    }
  })

  // User's mutual guilds (guilds the user is in AND the bot is in)
  .get("/my-guilds", async ({ request }) => {
    const session = await requireSession(request)
    const accessToken = await getDiscordAccessToken(session.user.id)

    if (!accessToken) {
      return { guilds: [] }
    }

    // Fetch user's guilds from Discord API
    const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      return { guilds: [], error: "Failed to fetch Discord guilds" }
    }

    const userGuilds = (await res.json()) as Array<{
      id: string
      name: string
      icon: string | null
      owner: boolean
      permissions: string
    }>

    // Return all user guilds — the frontend will intersect with bot guilds
    return {
      guilds: userGuilds.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon
          ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
          : null,
        owner: g.owner,
        permissions: g.permissions,
      })),
    }
  })

  // ─── Admin endpoints ──────────────────────────────────

  // Admin: list all users
  .get("/admin/users", async ({ request }) => {
    await requireAdmin(request)
    const users = await db.select().from(user)
    return { users }
  })

  // Admin: update user role
  .post("/admin/users/:userId/role", async ({ request, params }) => {
    await requireAdmin(request)
    const body = (await request.json()) as { role: string }

    await db
      .update(user)
      .set({ role: body.role })
      .where(eq(user.id, params.userId))

    return { success: true }
  })

  // Admin: ban user
  .post("/admin/users/:userId/ban", async ({ request, params }) => {
    await requireAdmin(request)
    const body = (await request.json()) as { reason?: string }

    await db
      .update(user)
      .set({ banned: true, banReason: body.reason ?? "No reason" })
      .where(eq(user.id, params.userId))

    return { success: true }
  })

  // Admin: unban user
  .post("/admin/users/:userId/unban", async ({ request, params }) => {
    await requireAdmin(request)

    await db
      .update(user)
      .set({ banned: false, banReason: null })
      .where(eq(user.id, params.userId))

    return { success: true }
  })

  // Admin: delete user
  .delete("/admin/users/:userId", async ({ request, params }) => {
    await requireAdmin(request)

    await db.delete(user).where(eq(user.id, params.userId))
    return { success: true }
  })

  // ─── Web settings ──────────────────────────────────────

  // Public: check if signup is enabled (used by login page)
  .get("/signup-enabled", async () => {
    const row = await db.query.webSettings.findFirst({
      where: eq(webSettings.key, "signupEnabled"),
    })
    return { enabled: row?.value !== "false" } // default: true
  })

  // Admin: get web settings
  .get("/admin/settings", async ({ request }) => {
    await requireAdmin(request)
    const rows = await db.select().from(webSettings)
    const settings: Record<string, string> = {}
    for (const r of rows) settings[r.key] = r.value
    return {
      signupEnabled: settings.signupEnabled !== "false",
    }
  })

  // Admin: update web settings
  .post("/admin/settings", async ({ request }) => {
    await requireAdmin(request)
    const body = (await request.json()) as { signupEnabled?: boolean }

    if (body.signupEnabled !== undefined) {
      await db
        .insert(webSettings)
        .values({ key: "signupEnabled", value: String(body.signupEnabled) })
        .onConflictDoUpdate({
          target: webSettings.key,
          set: { value: String(body.signupEnabled) },
        })
    }

    return { success: true }
  })

const app = new Elysia({ prefix: "/rest" }).use(routes)

export default app
export type App = typeof routes
