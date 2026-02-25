import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/providers"

export const metadata: Metadata = {
  title: "bassbot",
  description: "bassbot — Discord music bot",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const apiUrl = process.env.API_URL ?? ""

  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Providers apiUrl={apiUrl}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
