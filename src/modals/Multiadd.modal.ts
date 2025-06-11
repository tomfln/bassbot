import { createModal } from "@/util/modal";
import { TextInputStyle } from "discord.js";

export const MultiaddModal = createModal({
  title: "Add Multiple Songs",
  fields: {
    songList: {
      label: "Enter songs (one per line):",
      type: TextInputStyle.Paragraph,
      required: true,
      placeholder: "My Song 1\nMy Song 2\nhttps://example.com/song3",
    }
  }
})