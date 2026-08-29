/**
 * 백엔드(/api/*) 클라이언트. dev 에서는 vite.config.ts 의 proxy 가 FastAPI(:8000)로 넘긴다.
 *
 * 인증: access 토큰을 Authorization: Bearer 로 보낸다. 401 이면 refresh(쿠키) 후 1회 재시도.
 * 여러 요청이 동시에 401 을 받아도 refresh 는 한 번만 호출된다 (in-flight Promise 공유).
 */
import { authToken } from "@/lib/auth-token"
import type {
  Account,
  AccountCredentials,
  AdGroup,
  AdGroupKeyword,
  SyncResult,
} from "@/types/ads"
import type {
  AccessTokenResponse,
  MeResponse,
  TokenResponse,
  UserCredentials,
} from "@/types/auth"
import type { BiddingSet, BiddingSetAssignResult } from "@/types/bidding"

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

async function rawRequest<T>(
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

async function request<T>(
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

// ── 인증 (앱 계정) ────────────────────────────────────────────

export const register = (credentials: UserCredentials) =>
  rawRequest<unknown>("POST", "/api/auth/register", credentials)

export const login = async (credentials: UserCredentials) => {
  const res = await rawRequest<TokenResponse>(
    "POST",
    "/api/auth/login",
    credentials
  )
  authToken.set(res.accessToken)
  return res
}

export const logout = async () => {
  try {
    await rawRequest<unknown>("POST", "/api/auth/logout")
  } finally {
    authToken.clear()
  }
}

export const getMe = () => request<MeResponse>("GET", "/api/auth/me")

// ── 네이버 광고 계정 연결 ─────────────────────────────────────

export const connectNaver = (credentials: AccountCredentials) =>
  request<Account>("POST", "/api/naver/connect", credentials)

export const disconnectNaver = () =>
  request<void>("DELETE", "/api/naver/connect")

// ── 광고 데이터 ───────────────────────────────────────────────

export const syncAccount = () =>
  request<SyncResult>("POST", "/api/sync/account")

export const getAdGroups = () => request<AdGroup[]>("GET", "/api/adgroups")

export const updateAdGroup = (
  id: string,
  patch: Pick<AdGroup, "syncEnabled">
) => request<AdGroup>("PATCH", `/api/adgroups/${encodeURIComponent(id)}`, patch)

export const getAdGroupKeywords = (id: string) =>
  request<AdGroupKeyword[]>(
    "GET",
    `/api/adgroups/${encodeURIComponent(id)}/keywords`
  )

// ── 자동입찰 세트 ──────────────────────────────────────────────

export const getBiddingSets = () =>
  request<BiddingSet[]>("GET", "/api/bidding-sets")

export const createBiddingSet = (body: {
  name: string
  adGroupIds?: string[]
}) => request<BiddingSet>("POST", "/api/bidding-sets", body)

export const updateBiddingSet = (
  id: string,
  patch: { name?: string; enabled?: boolean }
) =>
  request<BiddingSet>(
    "PATCH",
    `/api/bidding-sets/${encodeURIComponent(id)}`,
    patch
  )

/** 세트 표시 순서를 ids 순으로 저장 */
export const reorderBiddingSets = (ids: string[]) =>
  request<void>("PUT", "/api/bidding-sets/order", { ids })

export const deleteBiddingSet = (id: string) =>
  request<void>("DELETE", `/api/bidding-sets/${encodeURIComponent(id)}`)

/** 그룹들을 세트에 배정. 다른 세트에 있던 그룹은 이동된다. */
export const assignBiddingSetItems = (id: string, adGroupIds: string[]) =>
  request<BiddingSetAssignResult>(
    "PUT",
    `/api/bidding-sets/${encodeURIComponent(id)}/items`,
    {
      adGroupIds,
    }
  )

/** 특정 세트에서 그룹 제거 */
export const removeBiddingSetItems = (id: string, adGroupIds: string[]) =>
  request<void>("DELETE", `/api/bidding-sets/${encodeURIComponent(id)}/items`, {
    adGroupIds,
  })

/** 어느 세트에 있든 그룹 제거 */
export const unassignBiddingSetItems = (adGroupIds: string[]) =>
  request<void>("DELETE", "/api/bidding-set-items", { adGroupIds })
