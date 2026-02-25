import { SignJWT, jwtVerify } from "jose"

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.warn("[jwt] JWT_SECRET not set — JWT signing/verification will fail at runtime")
}

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET environment variable is required")
  return new TextEncoder().encode(secret)
}

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

/** Sign a JWT with the shared secret. Expires in 7 days by default. */
export async function signJwt(
  payload: JwtPayload,
  expiresIn = "7d",
): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret())
}

/** Verify a JWT and return the payload. Throws if invalid. */
export async function verifyJwt(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as unknown as JwtPayload
}

/**
 * Extract and verify JWT from an Authorization header.
 * Returns null if missing or invalid (does not throw).
 */
export async function verifyAuthHeader(
  authHeader: string | null | undefined,
): Promise<JwtPayload | null> {
  if (!authHeader?.startsWith("Bearer ")) return null
  try {
    return await verifyJwt(authHeader.slice(7))
  } catch {
    return null
  }
}
