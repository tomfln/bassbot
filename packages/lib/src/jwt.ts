import { SignJWT, jwtVerify } from "jose"

export interface JwtPayload {
  /** BetterAuth user ID */
  sub: string
  /** Discord user ID */
  discordId: string
  /** User role */
  role: "admin" | "user"
  /** Display name */
  name: string
  /** Avatar URL */
  avatar: string
}

/** Sign a JWT with the given secret. Expires in 1 hour by default. */
export async function signJwt(
  payload: JwtPayload,
  secret: string,
  expiresIn = "1h",
): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret))
}

/** Verify a JWT and return the payload. Throws if invalid. */
export async function verifyJwt(
  token: string,
  secret: string,
): Promise<JwtPayload> {
  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(secret),
  )
  return payload as unknown as JwtPayload
}

/**
 * Extract and verify JWT from an Authorization header.
 * Returns null if missing or invalid (does not throw).
 */
export async function verifyAuthHeader(
  authHeader: string | null | undefined,
  secret: string,
): Promise<JwtPayload | null> {
  if (!authHeader?.startsWith("Bearer ")) return null
  try {
    return await verifyJwt(authHeader.slice(7), secret)
  } catch {
    return null
  }
}
