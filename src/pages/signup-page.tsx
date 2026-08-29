import { useState, type FormEvent } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router"

import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAccount } from "@/hooks/use-account"
import { routes } from "@/lib/pages"

const MIN_PASSWORD_LENGTH = 8

export function SignupPage() {
  const { user, ready, register } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const from =
    (location.state as { from?: string } | null)?.from ?? routes.adGroups

  if (ready && user) return <Navigate to={from} replace />

  const mismatch =
    passwordConfirm.length > 0 && password !== passwordConfirm

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`)
      return
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }
    setPending(true)
    try {
      await register({ email: email.trim(), password })
      void navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다.")
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout
      title="회원가입"
      description="새 계정을 만들어 시작하세요."
      footer={
        <>
          이미 계정이 있으신가요?{" "}
          <Link
            to={routes.login}
            state={location.state}
            className="font-medium text-foreground underline underline-offset-4"
          >
            로그인
          </Link>
        </>
      }
    >
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
          <Field>
            <FieldLabel htmlFor="password">비밀번호</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FieldDescription>
              {MIN_PASSWORD_LENGTH}자 이상 입력하세요.
            </FieldDescription>
          </Field>
          <Field data-invalid={mismatch || error ? true : undefined}>
            <FieldLabel htmlFor="password-confirm">비밀번호 확인</FieldLabel>
            <Input
              id="password-confirm"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={mismatch || error ? true : undefined}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
            {mismatch && !error && (
              <FieldError>비밀번호가 일치하지 않습니다.</FieldError>
            )}
            {error && <FieldError>{error}</FieldError>}
          </Field>
        </FieldGroup>

        <Button
          type="submit"
          disabled={pending || mismatch}
          className="w-full"
        >
          {pending ? "가입 중..." : "회원가입"}
        </Button>
      </form>
    </AuthLayout>
  )
}
