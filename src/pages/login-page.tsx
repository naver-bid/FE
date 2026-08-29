import { useState, type FormEvent } from "react"
import { Navigate, useLocation, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAccount } from "@/hooks/use-account"
import { routes } from "@/lib/pages"

export function LoginPage() {
  const { user, ready, login } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // 로그인 전에 가려던 곳 (ProtectedRoute 가 넣어준다)
  const from =
    (location.state as { from?: string } | null)?.from ?? routes.adGroups

  if (ready && user) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login({ email: email.trim(), password })
      void navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-lg font-semibold">네이버 자동입찰</h1>
          <p className="text-sm text-muted-foreground">
            계정으로 로그인하세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">이메일</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="password">비밀번호</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                aria-invalid={error ? true : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
          </FieldGroup>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </div>
    </div>
  )
}
