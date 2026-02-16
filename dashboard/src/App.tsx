import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Layout } from "@/components/layout"
import { OverviewPage } from "@/pages/overview"
import { GuildsPage } from "@/pages/guilds"
import { PlayersPage } from "@/pages/players"
import { PlayerDetailPage } from "@/pages/player-detail"
import { GuildDetailPage } from "@/pages/guild-detail"
import { LogsPage } from "@/pages/logs"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 2000,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<OverviewPage />} />
              <Route path="guilds" element={<GuildsPage />} />
              <Route path="players" element={<PlayersPage />} />
              <Route path="players/:guildId" element={<PlayerDetailPage />} />
              <Route path="guilds/:guildId" element={<GuildDetailPage />} />
              <Route path="logs" element={<LogsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App