/** 앱 계정 인증 — /api/auth/* */
import { authToken } from "@/lib/auth-token"
import type { MeResponse, TokenResponse, UserCredentials } from "@/types/auth"

import { rawRequest, request } from "./client"

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
