import commandsData from "../../../data/commands.json"
import { CommandList } from "./command-list"

export const metadata = {
  title: "Commands | bassbot",
  description: "All available bot commands",
}

export default function CommandsPage() {
  return <CommandList commands={commandsData} />
}
