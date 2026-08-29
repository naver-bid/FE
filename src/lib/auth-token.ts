/**
 * access 토큰은 메모리에만 둔다 (XSS 로부터 localStorage 보다 안전).
 * refresh 토큰은 서버가 httpOnly 쿠키로 관리하므로 프론트는 건드리지 않는다.
 * 새로고침하면 access 는 사라지고, AccountProvider 가 refresh 로 복구한다.
 */

let accessToken: string | null = null

type Listener = () => void
const unauthorizedListeners = new Set<Listener>()

export const authToken = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token
  },
  clear: () => {
    accessToken = null
  },
  /** refresh 까지 실패해 세션이 끝났을 때 호출된다 (→ 로그인 페이지로) */
  onUnauthorized: (listener: Listener) => {
    unauthorizedListeners.add(listener)
    return () => unauthorizedListeners.delete(listener)
  },
  emitUnauthorized: () => {
    for (const l of unauthorizedListeners) l()
  },
}
