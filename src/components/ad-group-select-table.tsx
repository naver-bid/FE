import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  SELECTION_COLUMN_ID,
  type CellClickedEvent,
  type ColDef,
  type DoesExternalFilterPass,
  type GetRowIdFunc,
  type RowSelectionOptions,
  type SelectionChangedEvent,
} from "ag-grid-community"
import {
  AgGridReact,
  type CustomCellRendererProps,
  type CustomOverlayProps,
} from "ag-grid-react"
import { ChevronDown, FolderPlus, Plus, Search, X } from "lucide-react"
import { overlay } from "overlay-kit"
import { toast } from "sonner"

import { AdGroupDetailSheet } from "@/components/ad-group-detail-sheet"
import type { SetFilter } from "@/components/set-chip-bar"
import { SetNameDialog } from "@/components/set-name-dialog"
import { Button } from "@/components/ui/button"
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
import { useAccount } from "@/hooks/use-account"
import { useAdGroups } from "@/hooks/use-ad-groups"
import { useBiddingSets } from "@/hooks/use-bidding-sets"
import { gridTheme } from "@/lib/ag-grid"
import { errorMessage } from "@/lib/toast"
import type { AdGroup } from "@/types/ads"
import type { BiddingSet } from "@/types/bidding"

interface AdGroupSelectTableProps {
  /** 세트 칩 바 필터 */
  filter: SetFilter
  /** 계정 동기화 진행 중이면 빈 테이블에 안내 대신 로딩 문구를 보인다 */
  syncing?: boolean
}

/** 그리드 행: 광고 그룹 + 세트 목록에서 유도한 소속 정보 */
interface AdGroupRow extends AdGroup {
  /** 세트 목록(membership) 기준 소속. 미배정이면 null */
  setId: string | null
  /** 소속 세트 이름. 미배정이면 빈 문자열 (검색 대상에서 제외) */
  setName: string
}

/** 오버레이에 넘기는 추가 파라미터 — 행이 0개인 이유에 따라 문구를 바꾼다 */
interface OverlayParams {
  query: string
  filter: SetFilter
}

const rowSelection: RowSelectionOptions<AdGroupRow> = {
  mode: "multiRow",
  checkboxes: true,
  headerCheckbox: true,
  // 전체 선택은 현재 보이는(검색·필터된) 행 기준
  selectAll: "filtered",
  // 행 클릭은 상세 시트 열기에 쓰므로 체크박스로만 선택한다
  enableClickSelection: false,
}

const defaultColDef: ColDef<AdGroupRow> = {
  resizable: true,
  sortable: true,
  suppressHeaderMenuButton: true,
}

const columnDefs: ColDef<AdGroupRow>[] = [
  { field: "campaignName", headerName: "캠페인명", flex: 1, minWidth: 160 },
  { field: "name", headerName: "그룹명", flex: 1, minWidth: 160 },
  {
    field: "siteUrl",
    headerName: "사이트주소",
    flex: 1,
    minWidth: 200,
    cellStyle: { color: "var(--muted-foreground)" },
  },
  {
    field: "setName",
    headerName: "세트",
    width: 160,
    cellRenderer: SetCell,
  },
]

const getRowId: GetRowIdFunc<AdGroupRow> = ({ data }) => data.id

function SetCell({ value }: CustomCellRendererProps<AdGroupRow, string>) {
  return value ? (
    <span className="truncate">{value}</span>
  ) : (
    <span className="text-xs text-muted-foreground">미배정</span>
  )
}

function GridOverlay({
  overlayType,
  query,
  filter,
}: CustomOverlayProps<AdGroupRow> & OverlayParams) {
  let message: string
  switch (overlayType) {
    case "loading":
      message = "불러오는 중..."
      break
    case "noRows":
      message = "[계정 동기화] 버튼을 눌러 캠페인과 광고 그룹을 불러오세요."
      break
    case "noMatchingRows":
      message = query
        ? "검색 결과가 없습니다."
        : filter === "unassigned"
          ? "미배정 그룹이 없습니다."
          : "이 세트에 속한 그룹이 없습니다."
      break
    default:
      return null
  }
  return <p className="text-sm text-muted-foreground">{message}</p>
}

/** 광고 그룹을 체크해서 자동입찰 세트에 배정하는 테이블 */
export function AdGroupSelectTable({
  filter,
  syncing = false,
}: AdGroupSelectTableProps) {
  const { account } = useAccount()
  const { data: groups = [], isLoading } = useAdGroups(account?.customerId)
  const loading = isLoading || (syncing && groups.length === 0)
  const { sets, membership, createSet, assignGroups, unassignGroups } =
    useBiddingSets()

  const gridRef = useRef<AgGridReact<AdGroupRow>>(null)
  const [search, setSearch] = useState("")
  // 선택 상태의 원본은 그리드가 갖고, 여기서는 표시/액션용으로 복사본을 유지한다
  const [selected, setSelected] = useState<string[]>([])

  const setById = useMemo(() => new Map(sets.map((s) => [s.id, s])), [sets])

  // getRowId 로 행을 식별하므로 rows 가 바뀌어도 그리드는 변경분만 갱신하고 선택은 유지된다
  const rows = useMemo<AdGroupRow[]>(
    () =>
      groups.map((g) => {
        const setId = membership[g.id] ?? null
        return {
          ...g,
          setId,
          setName: setId ? (setById.get(setId)?.name ?? "") : "",
        }
      }),
    [groups, membership, setById]
  )

  const query = search.trim()
  const overlayParams = useMemo<OverlayParams>(
    () => ({ query, filter }),
    [query, filter]
  )

  // 세트 칩 바 필터는 그리드 외부 필터로 적용한다. 필터를 바꿔도 선택은 유지된다.
  const isExternalFilterPresent = useCallback(() => filter !== "all", [filter])
  const doesExternalFilterPass = useCallback<
    DoesExternalFilterPass<AdGroupRow>
  >(
    (node) => {
      const setId = node.data?.setId ?? null
      return filter === "unassigned" ? setId === null : setId === filter
    },
    [filter]
  )
  useEffect(() => {
    gridRef.current?.api?.onFilterChanged()
  }, [filter, rows])

  const selectedAssignedCount = selected.filter((id) => membership[id]).length

  function handleSelectionChanged(e: SelectionChangedEvent<AdGroupRow>) {
    setSelected(e.api.getSelectedNodes().flatMap((n) => n.data?.id ?? []))
  }

  function clearSelection() {
    gridRef.current?.api?.deselectAll()
  }

  function handleAssign(setId: string) {
    const adGroupIds = selected
    assignGroups.mutate(
      { setId, adGroupIds },
      {
        // 성공 시에는 토스트 없이 세트 칩/세트 컬럼 변화로만 알린다
        onError: (err) =>
          toast.error(errorMessage(err, "세트에 추가하지 못했습니다.")),
      }
    )
    clearSelection()
  }

  function handleUnassign() {
    const adGroupIds = selected
    unassignGroups.mutate(adGroupIds, {
      onSuccess: () =>
        toast.success(`그룹 ${adGroupIds.length}개를 세트에서 제거했습니다.`),
      onError: (err) =>
        toast.error(errorMessage(err, "세트에서 제거하지 못했습니다.")),
    })
    clearSelection()
  }

  /** 세트를 만들면서 선택한 그룹을 함께 배정. 요청이 끝날 때까지 다이얼로그가 열려 있다 */
  async function handleCreate() {
    const adGroupIds = selected
    const created = await overlay.openAsync<boolean>(
      ({ isOpen, close, unmount }) => (
        <SetNameDialog
          isOpen={isOpen}
          close={close}
          unmount={unmount}
          title="새 자동입찰 세트"
          description={`선택한 그룹 ${adGroupIds.length}개가 이 세트에 추가됩니다.`}
          submitLabel="만들기"
          pendingLabel="만드는 중..."
          onSubmit={async (name) => {
            await createSet.mutateAsync({ name, adGroupIds })
          }}
        />
      )
    )
    if (created) clearSelection()
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

  /** 체크박스 칸을 제외한 행 클릭은 상세 시트를 연다 */
  function handleCellClicked(e: CellClickedEvent<AdGroupRow>) {
    if (!e.data || e.column.getColId() === SELECTION_COLUMN_ID) return
    openDetail(e.data, e.data.setId ? setById.get(e.data.setId) : undefined)
  }

  /** 선택된 그룹 중 해당 세트가 아닌 다른 세트에서 이동하게 되는 개수 */
  function movingCount(setId: string) {
    return selected.filter((id) => membership[id] && membership[id] !== setId)
      .length
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
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
              render={<Button size="sm" disabled={selected.length === 0} />}
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

      {/* 남은 높이를 모두 차지하고 그리드 안에서 세로 스크롤한다 (행 가상화) */}
      <div className="min-h-80 flex-1">
        <AgGridReact<AdGroupRow>
          ref={gridRef}
          theme={gridTheme}
          rowData={rows}
          getRowId={getRowId}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowSelection={rowSelection}
          onSelectionChanged={handleSelectionChanged}
          onCellClicked={handleCellClicked}
          quickFilterText={query}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          loading={loading}
          overlayComponent={GridOverlay}
          overlayComponentParams={overlayParams}
          suppressCellFocus
          rowClass="cursor-pointer"
        />
      </div>
    </div>
  )
}
