const AppEmojiEnum = {
  pause: "1339745682742837248",
  play: "1339745989363503156",
  next: "1339746022783717468",
  prev: "1339746009479254087",
} as const
export type AppEmoji = keyof typeof AppEmojiEnum

export const AppEmoji = {
  ...AppEmojiEnum,

  string(emoji: AppEmoji) {
    return `<:${emoji}:${this[emoji]}>`
  }
} as const