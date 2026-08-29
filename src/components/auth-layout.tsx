import type { ReactNode } from "react"

interface AuthLayoutProps {
  title: string
  description: string
  children: ReactNode
  /** 카드 하단 안내 (예: 회원가입/로그인 링크) */
  footer?: ReactNode
}

/** 로그인/회원가입 공통 카드 레이아웃 */
export function AuthLayout({
  title,
  description,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-6 py-16">
      <div className="w-full max-w-sm rounded-xl border bg-background px-8 py-10 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {children}

        {footer && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </p>
        )}
      </div>
    </div>
  )
}
