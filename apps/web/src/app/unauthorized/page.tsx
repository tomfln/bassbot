"use client"

import Link from "next/link"
import { Button } from "@web/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card"
import { ShieldX, ArrowLeft, Home } from "lucide-react"

export default function UnauthorizedPage() {
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="border-white/8 text-center">
          <CardHeader className="pb-2">
            <div className="mx-auto mb-2 rounded-full bg-destructive/10 p-3 w-fit">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You don&apos;t have permission to access the admin dashboard.
              Contact an administrator if you believe this is an error.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href="/guilds">
                <Button variant="default" className="w-full sm:w-auto gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  Go to My Servers
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full sm:w-auto gap-1.5">
                  <Home className="h-4 w-4" />
                  Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
