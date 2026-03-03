import { createCommand, buildOptions } from "@lib/command"

export default createCommand({
  description: "",
  options: buildOptions().build(),

  run: async ({ i, options, reply }) => {
  
  }
})
