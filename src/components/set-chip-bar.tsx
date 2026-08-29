import {
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { overlay } from "overlay-kit"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { SetNameDialog } from "@/components/set-name-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { BiddingSet } from "@/types/bidding"

/** "all" 전체 · "unassigned" 미배정 · 그 외 setId */
export type SetFilter = "all" | "unassigned" | string

interface SetChipBarProps {
  sets: BiddingSet[]
  totalCount: number
  unassignedCount: number
  value: SetFilter
  onChange: (value: SetFilter) => void
  onCreate: (name: string) => void
  onRename: (setId: string, name: string) => void
  onDelete: (setId: string) => void
  /** 새 순서의 세트 ID 배열 */
  onReorder: (ids: string[]) => void
}

function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  )
}

/** 세트 칩 바 — 필터 역할 + 세트 이름 변경/삭제/생성 */
export function SetChipBar({
  sets,
  totalCount,
  unassignedCount,
  value,
  onChange,
  onCreate,
  onRename,
  onDelete,
  onReorder,
}: SetChipBarProps) {
  function move(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= sets.length) return
    const ids = sets.map((s) => s.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    onReorder(ids)
  }

  async function handleCreate() {
    const name = await overlay.openAsync<string | null>(
      ({ isOpen, close, unmount }) => (
        <SetNameDialog
          isOpen={isOpen}
          close={close}
          unmount={unmount}
          title="새 자동입찰 세트"
          description="같은 입찰 전략을 적용할 그룹 묶음을 만듭니다."
          submitLabel="만들기"
        />
      )
    )
    if (name) onCreate(name)
  }

  async function handleRename(set: BiddingSet) {
    const name = await overlay.openAsync<string | null>(
      ({ isOpen, close, unmount }) => (
        <SetNameDialog
          isOpen={isOpen}
          close={close}
          unmount={unmount}
          title="세트 이름 변경"
          initialName={set.name}
        />
      )
    )
    if (name) onRename(set.id, name)
  }

  async function handleDelete(set: BiddingSet) {
    const ok = await overlay.openAsync<boolean>(
      ({ isOpen, close, unmount }) => (
        <ConfirmDialog
          isOpen={isOpen}
          close={close}
          unmount={unmount}
          title="세트를 삭제할까요?"
          description={
            <>
              <b>{set.name}</b> 세트가 삭제되고, 속해 있던 그룹{" "}
              {set.adGroupIds.length}개는 미배정 상태가 됩니다. 광고 그룹 자체는
              삭제되지 않습니다.
            </>
          }
          confirmLabel="삭제"
          destructive
        />
      )
    )
    if (ok) onDelete(set.id)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip active={value === "all"} onClick={() => onChange("all")}>
        전체
        <span className="tabular-nums opacity-70">{totalCount}</span>
      </Chip>
      <Chip
        active={value === "unassigned"}
        onClick={() => onChange("unassigned")}
      >
        미배정
        <span className="tabular-nums opacity-70">{unassignedCount}</span>
      </Chip>

      {sets.length > 0 && <span className="mx-1 h-4 w-px bg-border" />}

      {sets.map((set, index) => {
        const active = value === set.id
        return (
          <div key={set.id} className="inline-flex items-center">
            <Chip
              active={active}
              onClick={() => onChange(set.id)}
              className="rounded-r-none pr-2"
            >
              <span className={cn("size-2 rounded-full", set.color)} />
              {set.name}
              <span className="tabular-nums opacity-70">
                {set.adGroupIds.length}
              </span>
            </Chip>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    aria-label={`${set.name} 관리`}
                    className={cn(
                      "inline-flex h-7 items-center rounded-r-full border border-l-0 px-1.5 transition-colors",
                      active
                        ? "border-foreground bg-foreground text-background hover:bg-foreground/90"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  />
                }
              >
                <MoreHorizontal className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={() => void handleRename(set)}>
                  <Pencil />
                  이름 변경
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowLeft />
                  앞으로 이동
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={index === sets.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowRight />
                  뒤로 이동
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => void handleDelete(set)}
                >
                  <Trash2 />
                  세트 삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      })}

      <Button
        variant="ghost"
        size="sm"
        className="h-7 rounded-full px-2.5 text-xs"
        onClick={() => void handleCreate()}
      >
        <Plus />새 세트
      </Button>
    </div>
  )
}
