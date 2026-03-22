/** Throw-based HTTP errors caught by the Elysia onError handler in base.ts. */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public body: Record<string, unknown>,
    public responseHeaders?: Record<string, string>,
  ) {
    super(typeof body.error === "string" ? body.error : "HTTP Error")
  }
}
