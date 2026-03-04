import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"
import { user as userTable, webSettings } from "./schema"
import { eq } from "drizzle-orm"
import * as schema from "./schema"
import config from "./config"

export const auth = betterAuth({
  basePath: "/rest/auth",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  socialProviders: {
    discord: {
      clientId: config.appId,
      clientSecret: config.discordOauthSecret,
      scope: ["identify", "email", "guilds"],
      mapProfileToUser: (profile) => ({
        name: profile.username ?? profile.global_name ?? "Unknown",
        image: profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : undefined,
      }),
    },
  },
  user: {
    additionalFields: {
      // discordId is stored via the `account` table (accountId field)
      // role is added by admin plugin
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Check if signup is enabled
          const row = await db.query.webSettings.findFirst({
            where: eq(webSettings.key, "signupEnabled"),
          })
          if (row?.value === "false") {
            return false // block user creation
          }
          // Auto-promote admin users on signup
          if (
            config.adminUsers.length > 0 &&
            typeof user.name === "string" &&
            config.adminUsers.includes(user.name.toLowerCase())
          ) {
            return { data: { ...user, role: "admin" } }
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          // Auto-promote admin users on login
          if (config.adminUsers.length === 0) return
          const existing = await db.query.user.findFirst({
            where: eq(userTable.id, session.userId),
            columns: { id: true, name: true, role: true },
          })
          if (
            existing &&
            existing.role !== "admin" &&
            config.adminUsers.includes(existing.name.toLowerCase())
          ) {
            await db
              .update(userTable)
              .set({ role: "admin" })
              .where(eq(userTable.id, existing.id))
          }
        },
      },
    },
  },
  plugins: [admin()],
})

export type Session = typeof auth.$Infer.Session.session
export type User = typeof auth.$Infer.Session.user
