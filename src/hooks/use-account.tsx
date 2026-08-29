import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import * as api from "@/lib/api"
import type { Account, AccountCredentials } from "@/types/ads"

interface AccountContextValue {
  account: Account | null
  /** 서버 세션 확인이 끝났는지 */
  ready: boolean
  login: (credentials: AccountCredentials) => Promise<void>
  logout: () => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [ready, setReady] = useState(false)

  // 인증 정보는 서버 메모리에만 있으므로, 새로고침 시 서버에 세션을 물어본다.
  useEffect(() => {
    let active = true
    api
      .getMe()
      .then((me) => {
        if (active) setAccount(me)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (credentials: AccountCredentials) => {
    setAccount(await api.login(credentials))
  }, [])

  const logout = useCallback(async () => {
    await api.logout()
    setAccount(null)
  }, [])

  const value = useMemo(
    () => ({ account, ready, login, logout }),
    [account, ready, login, logout]
  )
  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error("useAccount must be used within AccountProvider")
  return ctx
}
