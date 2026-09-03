import { useCallback, useEffect, useRef } from "react"
import type {
  CellEditRequestEvent,
  ColDef,
  GetRowIdFunc,
  RowSelectionOptions,
  SelectionChangedEvent,
  ValueFormatterParams,
} from "ag-grid-community"
import { AgGridReact, type CustomOverlayProps } from "ag-grid-react"
import { ChevronDown, MonitorSmartphone } from "lucide-react"
import { overlay } from "overlay-kit"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAccount } from "@/hooks/use-account"
import {
  useApplyDeviceToAll,
  useUpdateAdGroupDevice,
} from "@/hooks/use-ad-groups"
import { gridTheme } from "@/lib/ag-grid"
import { DEVICE_OPTIONS, deviceLabel } from "@/lib/device"
import { errorMessage } from "@/lib/toast"
import type { AdGroup, Device } from "@/types/ads"

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
// 기기 열은 편집 가능(더블클릭/Enter). 셀렉트 에디터는 null 을 못 다루므로 미입력은 "" 로 두고
// 저장 시점(handleCellEditRequest)에 null 로 되돌린다.
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
  {
    colId: "device",
    headerName: "기기",
    width: 100,
    cellClass: "bg-primary/8",
    editable: true,
    valueGetter: ({ data }) => data?.device ?? "",
    valueFormatter: ({ value }: ValueFormatterParams<AdGroup, Device | "">) =>
      deviceLabel(value || null),
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: ["", "PC", "MOBILE"] },
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

/**
 * 자동 입찰 페이지 상단 — 세트에 속한 그룹 목록. 행을 클릭하면 아래 키워드 그리드가 바뀐다.
 * 기기 열은 셀을 더블클릭해 수정하면 즉시 저장되고, 툴바에서 계정의 모든 그룹에 일괄 적용할 수도 있다.
 */
export function BiddingGroupGrid({
  groups,
  selectedId,
  onSelect,
}: BiddingGroupGridProps) {
  const gridRef = useRef<AgGridReact<AdGroup>>(null)
  const { account } = useAccount()
  const updateDevice = useUpdateAdGroupDevice(account?.customerId)
  const applyAll = useApplyDeviceToAll(account?.customerId)

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

  /** readOnlyEdit 이라 그리드는 요청만 보내고, 캐시를 낙관적으로 갱신하면 새 값이 다시 그려진다 */
  function handleCellEditRequest(e: CellEditRequestEvent<AdGroup>) {
    if (!e.data || e.column.getColId() !== "device") return
    const next = (e.newValue || null) as Device | null
    if (next === e.data.device) return
    updateDevice.mutate(
      { adGroupId: e.data.id, device: next },
      {
        onError: (err) =>
          toast.error(errorMessage(err, "기기를 저장하지 못했습니다.")),
      }
    )
  }

  /** 세트와 무관하게 계정의 모든 그룹에 적용되므로 확인을 받고 실행한다 */
  async function handleApplyAll(device: Device | null) {
    await overlay.openAsync<boolean>(({ isOpen, close, unmount }) => (
      <ConfirmDialog
        isOpen={isOpen}
        close={close}
        unmount={unmount}
        title="모든 그룹에 기기를 적용할까요?"
        description={
          <>
            이 세트뿐 아니라 <b>계정의 모든 광고 그룹</b>의 기기가{" "}
            <b>{deviceLabel(device)}</b>(으)로 저장됩니다.
          </>
        }
        confirmLabel="적용"
        pendingLabel="적용 중..."
        onConfirm={async () => {
          const { updated } = await applyAll.mutateAsync(device)
          toast.success(
            `그룹 ${updated}개의 기기를 ${deviceLabel(device)}(으)로 저장했습니다.`
          )
        }}
      />
    ))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          기기는 셀을 더블클릭해 수정합니다
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                disabled={applyAll.isPending}
              />
            }
          >
            <MonitorSmartphone />
            기기 일괄 적용
            <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>계정의 모든 그룹에 적용</DropdownMenuLabel>
            {DEVICE_OPTIONS.map((o) => (
              <DropdownMenuItem
                key={o.label}
                onClick={() => void handleApplyAll(o.value)}
              >
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
          readOnlyEdit
          onCellEditRequest={handleCellEditRequest}
          stopEditingWhenCellsLoseFocus
          rowClass="cursor-pointer"
        />
      </div>
    </div>
  )
}
