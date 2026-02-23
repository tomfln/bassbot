import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Shell } from "@/components/shell"

export const metadata: Metadata = {
  title: "bassbot",
  description: "bassbot dashboard",
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
          <Shell>
            {children}
          </Shell>
        </Providers>
      </body>
    </html>
  );
}
