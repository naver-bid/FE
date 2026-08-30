import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface ConfirmDialogOptions {
  title: string
  description?: ReactNode
  confirmLabel?: string
  /** 진행 중 버튼 문구 (onConfirm 이 있을 때) */
  pendingLabel?: string
  cancelLabel?: string
  /** 삭제 등 되돌리기 어려운 동작이면 true */
  destructive?: boolean
}

interface ConfirmDialogProps extends ConfirmDialogOptions {
  isOpen: boolean
  /** onConfirm 이 성공(또는 없을 때 확인 클릭)하면 true, 취소면 false */
  close: (confirmed: boolean) => void
  unmount: () => void
  /**
   * 확인 시 실행할 요청. resolve 되면 닫히고, reject 되면 에러를 보여주며
   * 열린 채로 남는다. 없으면 확인 즉시 닫힌다.
   */
  onConfirm?: () => Promise<unknown>
}

/** overlay-kit 의 openAsync 로 연다 */
export function ConfirmDialog({
  isOpen,
  close,
  unmount,
  onConfirm,
  title,
  description,
  confirmLabel = "확인",
  pendingLabel = "처리 중...",
  cancelLabel = "취소",
  destructive = false,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    if (!onConfirm) {
      close(true)
      return
    }
    setError(null)
    setPending(true)
    try {
      await onConfirm()
      close(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리하지 못했습니다.")
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
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => close(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={() => void handleConfirm()}
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
