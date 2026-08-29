import { useState } from "react"
import { ChevronDown, FolderPlus, Plus, Search, X } from "lucide-react"

import { overlay } from "overlay-kit"

import { AdGroupDetailSheet } from "@/components/ad-group-detail-sheet"
import type { SetFilter } from "@/components/set-chip-bar"
import { SetNameDialog } from "@/components/set-name-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { AdGroup } from "@/types/ads"
import type { BiddingMembership, BiddingSet } from "@/types/bidding"

interface AdGroupSelectTableProps {
  groups: AdGroup[]
  loading: boolean
  sets: BiddingSet[]
  membership: BiddingMembership
  /** 세트 칩 바 필터 */
  filter: SetFilter
  onAssign: (adGroupIds: string[], setId: string) => void
  onUnassign: (adGroupIds: string[]) => void
  /** 세트를 만들면서 선택한 그룹을 함께 배정 */
  onCreateSet: (name: string, adGroupIds: string[]) => void
  /** 서버 요청 진행 중 (버튼 비활성화용) */
  pending?: boolean
}

/** 광고 그룹을 체크해서 자동입찰 세트에 배정하는 테이블 */
export function AdGroupSelectTable({
  groups,
  loading,
  sets,
  membership,
  filter,
  onAssign,
  onUnassign,
  onCreateSet,
  pending = false,
}: AdGroupSelectTableProps) {
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const setById = new Map(sets.map((s) => [s.id, s]))

  const query = search.trim().toLowerCase()
  const filteredGroups = groups.filter((g) => {
    if (filter === "unassigned" && membership[g.id]) return false
    if (
      filter !== "all" &&
      filter !== "unassigned" &&
      membership[g.id] !== filter
    )
      return false
    if (!query) return true
    return [g.campaignName, g.name, g.siteUrl].some((v) =>
      v.toLowerCase().includes(query)
    )
  })

  // 전체 선택은 현재 보이는(검색된) 행 기준
  const visibleIds = filteredGroups.map((g) => g.id)
  const visibleSelectedCount = visibleIds.filter((id) =>
    selectedIds.has(id)
  ).length
  const allVisibleSelected =
    visibleIds.length > 0 && visibleSelectedCount === visibleIds.length
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected

  const selected = [...selectedIds]
  const selectedAssignedCount = selected.filter((id) => membership[id]).length

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of visibleIds) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function handleAssign(setId: string) {
    onAssign(selected, setId)
    clearSelection()
  }

  function handleUnassign() {
    onUnassign(selected)
    clearSelection()
  }

  async function handleCreate() {
    const name = await overlay.openAsync<string | null>(
      ({ isOpen, close, unmount }) => (
        <SetNameDialog
          isOpen={isOpen}
          close={close}
          unmount={unmount}
          title="새 자동입찰 세트"
          description={`선택한 그룹 ${selected.length}개가 이 세트에 추가됩니다.`}
          submitLabel="만들기"
        />
      )
    )
    if (!name) return
    onCreateSet(name, selected)
    clearSelection()
  }

  function openDetail(group: AdGroup, set: BiddingSet | undefined) {
    overlay.open(({ isOpen, close, unmount }) => (
      <AdGroupDetailSheet
        isOpen={isOpen}
        close={close}
        unmount={unmount}
        group={group}
        set={set}
      />
    ))
  }

  /** 선택된 그룹 중 해당 세트가 아닌 다른 세트에서 이동하게 되는 개수 */
  function movingCount(setId: string) {
    return selected.filter((id) => membership[id] && membership[id] !== setId)
      .length
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <InputGroup className="max-w-sm">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색"
            aria-label="광고 그룹 검색"
          />
          {search && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                onClick={() => setSearch("")}
                aria-label="검색어 지우기"
              >
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>

        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selected.length}개 선택
              </span>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                선택 해제
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="sm" disabled={selected.length === 0 || pending} />
              }
            >
              <FolderPlus />
              세트에 추가
              <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {sets.length > 0 && (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>세트 선택</DropdownMenuLabel>
                    {sets.map((set) => {
                      const moving = movingCount(set.id)
                      return (
                        <DropdownMenuItem
                          key={set.id}
                          onClick={() => handleAssign(set.id)}
                        >
                          <span
                            className={cn("size-2 rounded-full", set.color)}
                          />
                          <span className="truncate">{set.name}</span>
                          {moving > 0 && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {moving}개 이동
                            </span>
                          )}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => void handleCreate()}>
                <Plus />새 세트 만들기…
              </DropdownMenuItem>
              {selectedAssignedCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleUnassign}
                  >
                    <X />
                    세트에서 제거 ({selectedAssignedCount})
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  disabled={visibleIds.length === 0}
                  onCheckedChange={(checked) => toggleVisible(checked === true)}
                  aria-label="전체 선택"
                />
              </TableHead>
              <TableHead>캠페인명</TableHead>
              <TableHead>그룹명</TableHead>
              <TableHead>사이트주소</TableHead>
              <TableHead className="w-40">세트</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  {loading
                    ? "불러오는 중..."
                    : groups.length === 0
                      ? "[계정 동기화] 버튼을 눌러 캠페인과 광고 그룹을 불러오세요."
                      : query
                        ? "검색 결과가 없습니다."
                        : filter === "unassigned"
                          ? "미배정 그룹이 없습니다."
                          : "이 세트에 속한 그룹이 없습니다."}
                </TableCell>
              </TableRow>
            ) : (
              filteredGroups.map((g) => {
                const isSelected = selectedIds.has(g.id)
                const set = membership[g.id]
                  ? setById.get(membership[g.id])
                  : undefined
                return (
                  <TableRow
                    key={g.id}
                    data-state={isSelected ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={() => openDetail(g, set)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          toggleRow(g.id, checked === true)
                        }
                        aria-label={`${g.name} 선택`}
                      />
                    </TableCell>
                    <TableCell>{g.campaignName}</TableCell>
                    <TableCell>{g.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {g.siteUrl}
                    </TableCell>
                    <TableCell>
                      {set ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              set.color
                            )}
                          />
                          <span className="truncate">{set.name}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          미배정
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
