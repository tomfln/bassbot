import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/providers"
import config from "@/lib/config"

export const metadata: Metadata = {
  title: "bassbot",
  description: "bassbot — Discord music bot",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // apiUrl is a browser-side URL — only set when the bot API is on a
  // different domain.  Empty string = same-origin (reverse proxy).
  const apiUrl = config.apiUrl

  return (
    <html lang="en" className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__BOT_API_URL__=${JSON.stringify(apiUrl)};`,
          }}
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
