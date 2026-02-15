import { createCommand, buildOptions } from "@bot/command"

export default createCommand({
  description: "",
  options: buildOptions().build(),

  run: async ({ i, options, reply }) => {
  
  }
})
