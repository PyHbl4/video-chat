import { ApiError, type ApiErrorBody } from "./errors"

export type FetchLike = typeof fetch

export interface ApiClientConfig {
  baseUrl: string
  fetch?: FetchLike
  defaultHeaders?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
  getAccessToken?: () => string | null | Promise<string | null>
  getCsrfToken?: () => string | null | Promise<string | null>
  refresh?: () => Promise<boolean>
  onUnauthorized?: (error: ApiError<ApiErrorBody | null>) => void | Promise<void>
  credentials?: RequestCredentials
}

export interface RequestOptions<TBody = unknown> {
  method: string
  path: string
  query?: Record<string, string | number | boolean | null | undefined>
  body?: TBody
  headers?: HeadersInit
  expectJson?: boolean
  retryOnAuthFailure?: boolean
  signal?: AbortSignal
}

export interface ApiResponse<TData> {
  data: TData
  response: Response
}

const SHOULD_REFRESH_STATUSES = new Set([401, 419, 440])

export class ApiClient {
  private readonly baseUrl: string
  private readonly fetchImpl: FetchLike
  private readonly defaultHeaders?: ApiClientConfig["defaultHeaders"]
  private readonly getAccessToken?: ApiClientConfig["getAccessToken"]
  private readonly getCsrfToken?: ApiClientConfig["getCsrfToken"]
  private readonly refresh?: ApiClientConfig["refresh"]
  private readonly onUnauthorized?: ApiClientConfig["onUnauthorized"]
  private readonly credentials: RequestCredentials

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "")
    this.fetchImpl = config.fetch ?? fetch
    this.defaultHeaders = config.defaultHeaders
    this.getAccessToken = config.getAccessToken
    this.getCsrfToken = config.getCsrfToken
    this.refresh = config.refresh
    this.onUnauthorized = config.onUnauthorized
    this.credentials = config.credentials ?? "include"
  }

  async request<TResponse, TBody = unknown>(options: RequestOptions<TBody>): Promise<ApiResponse<TResponse>> {
    const expectJson = options.expectJson !== false
    const retryOnAuthFailure = options.retryOnAuthFailure ?? true
    let attempt = 0

    while (true) {
      const { url, init } = await this.buildRequest(options)
      const response = await this.fetchImpl(url, init)

      if (response.ok) {
        if (!expectJson || response.status === 204) {
          return { data: undefined as TResponse, response }
        }

        const data = (await response.json()) as TResponse
        return { data, response }
      }

      if (retryOnAuthFailure && this.refresh && SHOULD_REFRESH_STATUSES.has(response.status) && attempt === 0) {
        const refreshed = await this.refresh().catch(() => false)
        if (refreshed) {
          attempt += 1
          continue
        }
      }

      const error = await this.createError(response)
      if (error.status === 401 || error.status === 403) {
        await this.onUnauthorized?.(error)
      }
      throw error
    }
  }

  private async buildRequest(options: RequestOptions): Promise<{ url: string; init: RequestInit }> {
    const url = this.resolveUrl(options.path, options.query)
    const headers = new Headers()

    if (this.defaultHeaders) {
      const resolved = await this.resolveMaybeFn(this.defaultHeaders)
      this.mergeHeaders(headers, resolved)
    }

    if (options.headers) {
      this.mergeHeaders(headers, options.headers)
    }

    const method = options.method.toUpperCase()

    if (this.getAccessToken) {
      const token = await this.getAccessToken()
      if (token) {
        headers.set("authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`)
      }
    }

    if (method !== "GET" && method !== "HEAD" && this.getCsrfToken) {
      const csrf = await this.getCsrfToken()
      if (csrf) {
        headers.set("x-csrf-token", csrf)
      }
    }

    let body: BodyInit | undefined

    if (options.body !== undefined && options.body !== null) {
      if (options.body instanceof FormData || options.body instanceof URLSearchParams || options.body instanceof Blob) {
        body = options.body
      } else if (typeof options.body === "string" || options.body instanceof ArrayBuffer || ArrayBuffer.isView(options.body)) {
        body = options.body as BodyInit
      } else {
        headers.set("content-type", "application/json")
        body = JSON.stringify(options.body)
      }
    }

    const init: RequestInit = {
      method,
      headers,
      body,
      credentials: this.credentials,
      signal: options.signal
    }

    return { url, init }
  }

  private resolveUrl(path: string, query?: RequestOptions["query"]): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`
    const url = new URL(`${this.baseUrl}${normalizedPath}`)

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue
        url.searchParams.append(key, String(value))
      }
    }

    return url.toString()
  }

  private async createError(response: Response): Promise<ApiError<ApiErrorBody | null>> {
    let body: ApiErrorBody | null = null
    let message = response.statusText

    let raw: string | null = null
    try {
      raw = await response.text()
    } catch {
      raw = null
    }

    if (raw) {
      try {
        body = JSON.parse(raw) as ApiErrorBody
        if (typeof body.message === "string" && body.message.length > 0) {
          message = body.message
        }
      } catch {
        message = raw
      }
    }

    return new ApiError<ApiErrorBody | null>(response.status, message, body, response.headers)
  }

  private async resolveMaybeFn<T>(value: T | (() => T | Promise<T>)): Promise<T> {
    if (typeof value === "function") {
      return await (value as () => T | Promise<T>)()
    }

    return value
  }

  private mergeHeaders(target: Headers, source: HeadersInit) {
    if (Array.isArray(source)) {
      for (const [key, value] of source) {
        target.set(key, value)
      }
      return
    }

    if (source instanceof Headers) {
      source.forEach((value, key) => {
        target.set(key, value)
      })
      return
    }

    Object.entries(source).forEach(([key, value]) => {
      if (value === undefined) {
        return
      }
      target.set(key, value)
    })
  }
}
