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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export interface SetNameDialogOptions {
  title: string
  description?: string
  /** 이름 변경 시 기존 이름 */
  initialName?: string
  submitLabel?: string
}

interface SetNameDialogProps extends SetNameDialogOptions {
  isOpen: boolean
  /** 입력한 이름, 취소 시 null */
  close: (name: string | null) => void
  unmount: () => void
}

/** overlay-kit으로 연다: `openSetNameDialog()` (src/lib/overlays.tsx) */
export function SetNameDialog({
  isOpen,
  close,
  unmount,
  title,
  description,
  initialName = "",
  submitLabel = "저장",
}: SetNameDialogProps) {
  const [name, setName] = useState(initialName)
  const trimmed = name.trim()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed) return
    close(trimmed)
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close(null)
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
            <Field>
              <FieldLabel htmlFor="set-name">세트 이름</FieldLabel>
              <Input
                id="set-name"
                placeholder="예: 브랜드 1위 유지"
                autoComplete="off"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(null)}>
              취소
            </Button>
            <Button
              type="submit"
              disabled={!trimmed || trimmed === initialName}
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
