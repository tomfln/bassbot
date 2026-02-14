import type { Awaitable } from "discord.js"
import type { CommandContext } from "./command"
import { randomBytes } from "crypto"

type Predicate<Args extends any[] = []> = Args extends [...infer _]
  ? (ctx: CommandContext<any, any, any>, ...args: Args) => Awaitable<boolean>
  : (ctx: CommandContext<any, any, any>) => Awaitable<boolean>

export interface Validator {
  readonly _id: string
  validate: (ctx: CommandContext<any, any, any>) => Awaitable<boolean>
  deps?: Validator[]
}

function stableHashArray(arr: any[]): string {
  const json = JSON.stringify(arr, (key, value) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    typeof value === "function" || typeof value === "bigint" ? value.toString() : value,
  )

  let hash = 2166136261 >>> 0 // FNV-1a hash
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash.toString(16)
}

function _createValidator<Args extends any[] = []>(
  predicate: Predicate<Args>,
  deps?: Validator[],
) {
  const id = randomBytes(8).toString("hex")

  return (...args: Args) =>
    ({
      validate: (ctx: CommandContext<any, any, any>) => predicate(ctx, ...args),
      _id: id + "-" + stableHashArray(args),
      deps,
    }) as Validator
}

export function createValidator<Options extends any[] = []>(
  validator: Predicate<Options> | { deps: Validator[]; validator: Predicate<Options> },
) {
  if (typeof validator === "function") {
    return _createValidator(validator)
  }
  return _createValidator(validator.validator, validator.deps)
}

export async function runValidators(validators: Validator[], ctx: CommandContext<any, any, any>) {
  const validatorCache = new Map<string, boolean>()

  async function runValidator(validator: Validator): Promise<boolean> {
    const cached = validatorCache.get(validator._id)
    if (cached !== undefined) {
      return cached
    }

    for (const dep of validator.deps ?? []) {
      if (!(await runValidator(dep))) {
        validatorCache.set(validator._id, false)
        return false
      }
    }

    const valid = await validator.validate(ctx)
    validatorCache.set(validator._id, valid)
    return valid
  }

  for (const validator of validators ?? []) {
    const valid = await runValidator(validator)
    if (!valid) return false
  }
  return true
}
