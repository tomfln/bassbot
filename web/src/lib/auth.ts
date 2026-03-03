import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"
import { webSettings } from "./schema"
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
        before: async () => {
          // Check if signup is enabled
          const row = await db.query.webSettings.findFirst({
            where: eq(webSettings.key, "signupEnabled"),
          })
          if (row?.value === "false") {
            return false // block user creation
          }
        },
      },
    },
  },
  plugins: [admin()],
})

export type Session = typeof auth.$Infer.Session.session
export type User = typeof auth.$Infer.Session.user
