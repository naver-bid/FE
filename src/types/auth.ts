import type { Account } from "@/types/ads"

export interface User {
  id: number
  email: string
  createdAt: string
}

export interface UserCredentials {
  email: string
  password: string
}

/** POST /api/auth/login */
export interface TokenResponse {
  accessToken: string
  tokenType: string
  /** 초 */
  expiresIn: number
  user: User
}

/** POST /api/auth/refresh */
export interface AccessTokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
}

/** GET /api/auth/me — 네이버 인증이 깨졌으면 naverAccount 는 null */
export interface MeResponse {
  user: User
  naverAccount: Account | null
}
