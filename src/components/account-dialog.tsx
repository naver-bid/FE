import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAccount } from "@/hooks/use-account"

interface AccountDialogProps {
  isOpen: boolean
  /** 로그인 성공 여부를 담아 닫는다 */
  close: (loggedIn: boolean) => void
  /** 닫힘 애니메이션이 끝난 뒤 트리에서 제거 */
  unmount: () => void
}

/** overlay-kit으로 연다: `openAccountDialog()` (src/lib/overlays.tsx) */
export function AccountDialog({ isOpen, close, unmount }: AccountDialogProps) {
  const { connectNaver } = useAccount()
  const [apiKey, setApiKey] = useState("")
  const [secretKey, setSecretKey] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await connectNaver({
        apiKey: apiKey.trim(),
        secretKey: secretKey.trim(),
        customerId: customerId.trim(),
      })
      close(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "계정 연결에 실패했습니다.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close(false)
      }}
      onOpenChangeComplete={(open) => {
        if (!open) unmount()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>네이버 광고 계정 연결</DialogTitle>
            <DialogDescription>
              네이버 검색광고 → 도구 → API 사용 관리에서 발급한 정보를
              입력하세요.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="customerId">Customer ID</FieldLabel>
              <Input
                id="customerId"
                inputMode="numeric"
                autoComplete="off"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              />
              <FieldDescription>
                광고 관리 시스템 우측 상단 계정명 옆 숫자
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="apiKey">API Key (Access License)</FieldLabel>
              <Input
                id="apiKey"
                autoComplete="off"
                spellCheck={false}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </Field>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="secretKey">Secret Key</FieldLabel>
              <Input
                id="secretKey"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={error ? true : undefined}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => close(false)}
              disabled={pending}
            >
              취소
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "연결 중..." : "연결"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
