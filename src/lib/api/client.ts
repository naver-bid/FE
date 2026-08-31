/**
 * 백엔드(/api/*) 공통 HTTP 클라이언트. dev 에서는 vite.config.ts 의 proxy 가 배포된 FastAPI(fly.dev)로 넘긴다.
 *
 * 인증: access 토큰을 Authorization: Bearer 로 보낸다. 401 이면 refresh(쿠키) 후 1회 재시도.
 * 여러 요청이 동시에 401 을 받아도 refresh 는 한 번만 호출된다 (in-flight Promise 공유).
 *
 * 피처별 엔드포인트 함수는 같은 디렉터리의 auth.ts, ad-groups.ts 등에 두고 index.ts 에서 모아 내보낸다.
 */
import { authToken } from "@/lib/auth-token"
import type { AccessTokenResponse } from "@/types/auth"

/** FastAPI 오류 응답에서 사용자에게 보여줄 문장을 뽑는다. */
function errorMessage(status: number, json: unknown): string {
  if (json && typeof json === "object") {
    const { detail, error } = json as { detail?: unknown; error?: unknown }
    if (typeof error === "string") return error
    if (typeof detail === "string") return detail
    // 422 validation: [{ loc, msg, ... }]
    if (Array.isArray(detail)) {
      const msgs = detail
        .map((d) =>
          d && typeof d === "object" && "msg" in d ? String(d.msg) : null
        )
        .filter(Boolean)
      if (msgs.length) return msgs.join(", ")
    }
  }
  return `요청 실패 (${status})`
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/** 토큰 재발급 없이 한 번만 보내는 요청. 인증 API 처럼 401 재시도가 의미 없는 곳에서 쓴다. */
export async function rawRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  const token = authToken.get()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 204) return undefined as T
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(errorMessage(res.status, json), res.status)
  return json as T
}

// ── refresh 배칭 ──────────────────────────────────────────────

let refreshInFlight: Promise<string | null> | null = null

/**
 * 새 access 토큰을 받아온다. 동시에 여러 번 불려도 실제 요청은 하나.
 * 실패하면 토큰을 비우고 null 을 돌려준다 (세션 만료).
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = rawRequest<AccessTokenResponse>(
      "POST",
      "/api/auth/refresh"
    )
      .then((r) => {
        authToken.set(r.accessToken)
        return r.accessToken
      })
      .catch(() => {
        authToken.clear()
        return null
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

/** 401 을 받아도 refresh 를 시도하지 않을 경로 */
const NO_REFRESH_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
]

/** 일반 요청. 401 이면 refresh 후 1회 재시도하고, refresh 도 실패하면 로그아웃 이벤트를 낸다. */
export async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  try {
    return await rawRequest<T>(method, path, body)
  } catch (err) {
    if (
      !(err instanceof ApiError) ||
      err.status !== 401 ||
      NO_REFRESH_PATHS.includes(path)
    ) {
      throw err
    }
    const token = await refreshAccessToken()
    if (!token) {
      authToken.emitUnauthorized()
      throw err
    }
    return rawRequest<T>(method, path, body)
  }
}
