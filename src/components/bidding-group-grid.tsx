import { useCallback, useEffect, useRef } from "react"
import type {
  ColDef,
  GetRowIdFunc,
  RowSelectionOptions,
  SelectionChangedEvent,
} from "ag-grid-community"
import { AgGridReact, type CustomOverlayProps } from "ag-grid-react"

import { gridTheme } from "@/lib/ag-grid"
import type { AdGroup } from "@/types/ads"

interface BiddingGroupGridProps {
  /** 현재 세트에 속한 광고 그룹 */
  groups: AdGroup[]
  /** 선택된 그룹 ID. 없으면 null */
  selectedId: string | null
  onSelect: (id: string | null) => void
}

const rowSelection: RowSelectionOptions<AdGroup> = {
  mode: "singleRow",
  checkboxes: false,
  enableClickSelection: true,
}

const defaultColDef: ColDef<AdGroup> = {
  resizable: true,
  sortable: true,
  suppressHeaderMenuButton: true,
}

// 현재 API(AdGroup)로 받을 수 있는 필드만 컬럼으로 둔다.
const columnDefs: ColDef<AdGroup>[] = [
  { field: "campaignName", headerName: "캠페인명", flex: 1, minWidth: 160 },
  { field: "name", headerName: "그룹명", flex: 1, minWidth: 160 },
  {
    field: "siteUrl",
    headerName: "사이트주소",
    flex: 1,
    minWidth: 200,
    cellStyle: { color: "var(--muted-foreground)" },
  },
]

const getRowId: GetRowIdFunc<AdGroup> = ({ data }) => data.id

function GridOverlay({ overlayType }: CustomOverlayProps<AdGroup>) {
  if (overlayType !== "noRows") return null
  return (
    <p className="text-sm text-muted-foreground">
      이 세트에 속한 그룹이 없습니다. 광고 그룹 페이지에서 추가하세요.
    </p>
  )
}

/** 자동 입찰 페이지 상단 — 세트에 속한 그룹 목록. 행을 클릭하면 아래 키워드 그리드가 바뀐다. */
export function BiddingGroupGrid({
  groups,
  selectedId,
  onSelect,
}: BiddingGroupGridProps) {
  const gridRef = useRef<AgGridReact<AdGroup>>(null)

  // 선택 상태의 원본은 부모(URL)가 갖고, 그리드는 그걸 따라간다.
  const syncSelection = useCallback(() => {
    const api = gridRef.current?.api
    if (!api) return
    api.forEachNode((node) => {
      const shouldSelect = node.data?.id === selectedId
      if (node.isSelected() !== shouldSelect) node.setSelected(shouldSelect)
    })
  }, [selectedId])

  useEffect(syncSelection, [syncSelection, groups])

  function handleSelectionChanged(e: SelectionChangedEvent<AdGroup>) {
    // 사용자 클릭으로 인한 변경만 부모에 알린다 (api 호출로 인한 변경은 이미 부모 상태와 같다)
    if (e.source !== "rowClicked" && e.source !== "checkboxSelected") return
    onSelect(e.api.getSelectedNodes()[0]?.data?.id ?? null)
  }

  return (
    <div className="min-h-0 flex-1">
      <AgGridReact<AdGroup>
        ref={gridRef}
        theme={gridTheme}
        rowData={groups}
        getRowId={getRowId}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowSelection={rowSelection}
        onSelectionChanged={handleSelectionChanged}
        onRowDataUpdated={syncSelection}
        overlayComponent={GridOverlay}
        suppressCellFocus
        rowClass="cursor-pointer"
      />
    </div>
  )
}
