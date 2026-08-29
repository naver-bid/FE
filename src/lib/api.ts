/**
 * 백엔드(/api/*) 클라이언트. 실제 네이버 호출은 server/naver-api.ts 가 담당한다.
 */
import type { Account, AccountCredentials, AdGroup, SyncResult } from "@/types/ads"

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as { error?: string } | T | null
  if (!res.ok) {
    const message =
      json && typeof json === "object" && "error" in json && json.error
        ? json.error
        : `요청 실패 (${res.status})`
    throw new Error(message)
  }
  return json as T
}

export const login = (credentials: AccountCredentials) =>
  request<Account>("POST", "/api/auth/login", credentials)

export const getMe = () => request<Account | null>("GET", "/api/auth/me")

export const logout = () => request<{ ok: true }>("POST", "/api/auth/logout")

export const syncAccount = () => request<SyncResult>("POST", "/api/sync/account")

export const getAdGroups = () => request<AdGroup[]>("GET", "/api/adgroups")

export const updateAdGroup = (id: string, patch: Pick<AdGroup, "syncEnabled">) =>
  request<AdGroup>("PATCH", `/api/adgroups/${encodeURIComponent(id)}`, patch)
