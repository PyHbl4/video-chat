export interface ApiErrorBody {
  error: string
  message: string
  fields?: Record<string, string | undefined>
}

export class ApiError<T = unknown> extends Error {
  public readonly status: number
  public readonly body: T | null
  public readonly headers: Headers

  constructor(status: number, message: string, body: T | null, headers: Headers) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
    this.headers = headers
  }
}
