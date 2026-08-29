/**
 * 백엔드(/api/*) 클라이언트. dev 에서는 vite.config.ts 의 proxy 가 FastAPI(:8000)로 넘긴다.
 */
import type { Account, AccountCredentials, AdGroup, SyncResult } from "@/types/ads"

/** FastAPI 오류 응답에서 사용자에게 보여줄 문장을 뽑는다. */
function errorMessage(status: number, json: unknown): string {
  if (json && typeof json === "object") {
    const { detail, error } = json as { detail?: unknown; error?: unknown }
    if (typeof error === "string") return error
    if (typeof detail === "string") return detail
    // 422 validation: [{ loc, msg, ... }]
    if (Array.isArray(detail)) {
      const msgs = detail
        .map((d) => (d && typeof d === "object" && "msg" in d ? String(d.msg) : null))
        .filter(Boolean)
      if (msgs.length) return msgs.join(", ")
    }
  }
  return `요청 실패 (${status})`
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 204) return undefined as T
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new Error(errorMessage(res.status, json))
  return json as T
}

export const login = (credentials: AccountCredentials) =>
  request<Account>("POST", "/api/auth/login", credentials)

export const getMe = () => request<Account | null>("GET", "/api/auth/me")

export const logout = () => request<unknown>("POST", "/api/auth/logout")

export const syncAccount = () => request<SyncResult>("POST", "/api/sync/account")

export const getAdGroups = () => request<AdGroup[]>("GET", "/api/adgroups")

export const updateAdGroup = (id: string, patch: Pick<AdGroup, "syncEnabled">) =>
  request<AdGroup>("PATCH", `/api/adgroups/${encodeURIComponent(id)}`, patch)
