import { BrowserRouter, Routes, Route } from "react-router-dom"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Layout } from "@/components/layout"
import { OverviewPage } from "@/pages/overview"
import { GuildsPage } from "@/pages/guilds"
import { PlayersPage } from "@/pages/players"
import { PlayerDetailPage } from "@/pages/player-detail"

export function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<OverviewPage />} />
            <Route path="guilds" element={<GuildsPage />} />
            <Route path="players" element={<PlayersPage />} />
            <Route path="players/:guildId" element={<PlayerDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  )
}

export default App