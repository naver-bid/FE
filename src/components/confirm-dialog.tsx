import type { ReactNode } from "react"

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
  cancelLabel?: string
  /** 삭제 등 되돌리기 어려운 동작이면 true */
  destructive?: boolean
}

interface ConfirmDialogProps extends ConfirmDialogOptions {
  isOpen: boolean
  close: (confirmed: boolean) => void
  unmount: () => void
}

/** overlay-kit으로 연다: `openConfirmDialog()` (src/lib/overlays.tsx) */
export function ConfirmDialog({
  isOpen,
  close,
  unmount,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  destructive = false,
}: ConfirmDialogProps) {
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={() => close(true)}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
