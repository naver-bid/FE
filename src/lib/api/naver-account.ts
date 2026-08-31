/** 네이버 광고 계정 연결/동기화 — /api/naver/*, /api/sync/* */
import type { Account, AccountCredentials, SyncResult } from "@/types/ads"

import { request } from "./client"

export const connectNaver = (credentials: AccountCredentials) =>
  request<Account>("POST", "/api/naver/connect", credentials)

export const disconnectNaver = () =>
  request<void>("DELETE", "/api/naver/connect")

/** 캠페인·광고 그룹을 네이버에서 다시 불러와 저장 */
export const syncAccount = () =>
  request<SyncResult>("POST", "/api/sync/account")
