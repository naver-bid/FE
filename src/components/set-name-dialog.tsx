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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export interface SetNameDialogOptions {
  title: string
  description?: string
  /** 이름 변경 시 기존 이름 */
  initialName?: string
  submitLabel?: string
  /** 진행 중 버튼 문구 */
  pendingLabel?: string
}

interface SetNameDialogProps extends SetNameDialogOptions {
  isOpen: boolean
  /**
   * 저장 요청. resolve 되면 다이얼로그가 닫히고, reject 되면
   * 에러 메시지를 다이얼로그 안에 보여주고 열린 채로 남는다.
   */
  onSubmit: (name: string) => Promise<unknown>
  /** 성공 시 true, 취소 시 false */
  close: (submitted: boolean) => void
  unmount: () => void
}

/**
 * 세트 이름 입력 다이얼로그. API 요청이 끝날 때까지 열린 채로 남아
 * 진행 상태/에러를 보여준다. overlay-kit 의 openAsync 로 연다.
 */
export function SetNameDialog({
  isOpen,
  close,
  unmount,
  onSubmit,
  title,
  description,
  initialName = "",
  submitLabel = "저장",
  pendingLabel = "저장 중...",
}: SetNameDialogProps) {
  const [name, setName] = useState(initialName)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = name.trim()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || pending) return
    setError(null)
    setPending(true)
    try {
      await onSubmit(trimmed)
      close(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했습니다.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // 요청 중에는 바깥 클릭/ESC 로 닫히지 않게
        if (!open && !pending) close(false)
      }}
      onOpenChangeComplete={(open) => {
        if (!open) unmount()
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="set-name">세트 이름</FieldLabel>
              <Input
                id="set-name"
                placeholder="예: 브랜드 1위 유지"
                autoComplete="off"
                autoFocus
                disabled={pending}
                aria-invalid={error ? true : undefined}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => close(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={pending || !trimmed || trimmed === initialName}
            >
              {pending ? pendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
