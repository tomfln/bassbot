/**
 * Runtime API base URL.
 *
 * Set once by the root Providers component (which receives it from the
 * Server Component layout via the config helper).
 *
 * - Non-empty string → separate-hosts mode (e.g. "https://api.example.com")
 * - Empty string      → same-origin mode (API calls go to the same domain,
 *                        typically handled by a reverse proxy)
 */
let _apiUrl = ""

/** Called once at app startup by the Providers component. */
export function setApiUrl(url: string) {
  _apiUrl = url
}

/** Full API base URL. Falls back to current origin in proxy mode. */
export function getApiUrl(): string {
  if (_apiUrl) return _apiUrl
  if (typeof window !== "undefined") return window.location.origin
  return ""
}
