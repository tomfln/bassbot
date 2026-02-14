import { Result } from "@bot/result"

const timeRegex1 = new RegExp(/\s*(?<mins>\d{0,2}):(?<secs>\d{2})\s*/)
const timeRegex2 = new RegExp(/\s*((?<mins>\d{1,2})m(in)?)?\s*((?<secs>\d{1,2})s)?\s*/)

export class Timestamp {
  constructor(
    public mins: number,
    public secs: number,
  ) {}

  asMillis() {
    return this.mins * 60 * 1000 + this.secs * 1000
  }
  
  toString() {
    return this.mins > 0 ? `${this.mins}m ${this.secs}s` : `${this.secs}s`
  }

  /** Takes a timestamp in format MM:SS or MM and returns the milliseconds */
  static from(time: string): Result<Timestamp, string> {
    const match = timeRegex1.exec(time) ?? timeRegex2.exec(time)
    if (!match) return Result.Err("Invalid timestamp format, use MM:SS or MMm SSs")

    const mins = parseInt(match.groups!.mins ?? "0")
    const secs = parseInt(match.groups!.secs ?? "0")

    if (secs >= 60) return Result.Err("Seconds must be less than 60")

    return Result.Ok(new Timestamp(mins, secs))
  }
  
  static fromMillis(millis: number) {
    const mins = Math.floor(millis / 60000)
    const secs = Math.floor((millis % 60000) / 1000)
    return new Timestamp(mins, secs)
  }
}

/** takes a number of seconds and returns a duration string */
export function duration(s: number) {
  s = Math.round(s)
  const h = Math.floor(s / 3600)
  s -= h * 3600
  const m = Math.floor(s / 60)
  s -= m * 60
  return (h > 0 ? `${h}h ` : "") + (m > 0 ? `${m}m ` : "") + `${s}s`
}
