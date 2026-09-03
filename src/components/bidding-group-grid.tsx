import { useCallback, useEffect, useMemo, useRef } from "react"
import type {
  CellEditRequestEvent,
  ColDef,
  GetRowIdFunc,
  RowSelectionOptions,
  SelectionChangedEvent,
  ValueFormatterParams,
} from "ag-grid-community"
import {
  AgGridReact,
  type CustomHeaderProps,
  type CustomOverlayProps,
} from "ag-grid-react"
import { ChevronDown } from "lucide-react"
import { overlay } from "overlay-kit"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAccount } from "@/hooks/use-account"
import {
  useUpdateAdGroupDevice,
  useUpdateAdGroupDevices,
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

interface DeviceHeaderParams {
  onApplyAll: (device: Device | null) => void
}

/**
 * "기기" 컬럼 헤더 — 라벨 오른쪽의 화살표로 이 세트의 그룹 전체에 일괄 적용하는 드롭다운을 연다.
 * 헤더 안의 클릭이 컬럼 드래그로 새지 않도록 pointerdown 전파를 막는다.
 */
function DeviceHeader({
  displayName,
  onApplyAll,
}: CustomHeaderProps<AdGroup> & DeviceHeaderParams) {
  return (
    <div className="flex w-full items-center gap-0.5">
      <span>{displayName}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="기기 일괄 적용"
            />
          }
        >
          <ChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          {/* GroupLabel 은 반드시 Group 안에 있어야 한다 (Base UI 가 컨텍스트 없으면 throw) */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>이 세트의 모든 그룹에 적용</DropdownMenuLabel>
            {DEVICE_OPTIONS.map((o) => (
              <DropdownMenuItem
                key={o.label}
                onClick={() => onApplyAll(o.value)}
              >
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// 현재 API(AdGroup)로 받을 수 있는 필드만 컬럼으로 둔다.
// 기기 열은 편집 가능(더블클릭/Enter). 셀렉트 에디터는 null 을 못 다루므로 미입력은 "" 로 두고
// 저장 시점(handleCellEditRequest)에 null 로 되돌린다.
// 일괄 적용 콜백을 헤더에 넘겨야 해서 컬럼 정의는 함수로 만든다 (컴포넌트에서 useMemo).
const buildColumnDefs = (
  deviceHeader: DeviceHeaderParams
): ColDef<AdGroup>[] => [
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
    width: 110,
    cellClass: "bg-primary/8",
    editable: true,
    // 커스텀 헤더에는 정렬 UI 가 없다 — 드롭다운 클릭과 겹치지 않게 정렬은 끈다
    sortable: false,
    headerComponent: DeviceHeader,
    headerComponentParams: deviceHeader,
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
 * 기기 열은 셀을 더블클릭해 수정하면 즉시 저장되고, 헤더의 드롭다운으로 세트의 그룹 전체에 일괄 적용할 수도 있다.
 */
export function BiddingGroupGrid({
  groups,
  selectedId,
  onSelect,
}: BiddingGroupGridProps) {
  const gridRef = useRef<AgGridReact<AdGroup>>(null)
  const { account } = useAccount()
  const updateDevice = useUpdateAdGroupDevice(account?.customerId)
  const { mutateAsync: updateDevices } = useUpdateAdGroupDevices(
    account?.customerId
  )

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

  /** 현재 세트에 속한 그룹 전체의 기기를 덮어쓰므로 확인을 받고 실행한다 */
  const handleApplyAll = useCallback(
    (device: Device | null) => {
      const adGroupIds = groups.map((g) => g.id)
      if (adGroupIds.length === 0) return
      overlay.open(({ isOpen, close, unmount }) => (
        <ConfirmDialog
          isOpen={isOpen}
          close={close}
          unmount={unmount}
          title="이 세트의 그룹에 기기를 적용할까요?"
          description={
            <>
              현재 세트에 속한 그룹 <b>{adGroupIds.length}개</b>의 기기가{" "}
              <b>{deviceLabel(device)}</b>(으)로 저장됩니다.
            </>
          }
          confirmLabel="적용"
          pendingLabel="적용 중..."
          onConfirm={async () => {
            const failed = await updateDevices({ adGroupIds, device })
            if (failed > 0) {
              toast.error(`그룹 ${failed}개의 기기를 저장하지 못했습니다.`)
            } else {
              toast.success(
                `그룹 ${adGroupIds.length}개의 기기를 ${deviceLabel(device)}(으)로 저장했습니다.`
              )
            }
          }}
        />
      ))
    },
    [groups, updateDevices]
  )

  const columnDefs = useMemo(
    () => buildColumnDefs({ onApplyAll: handleApplyAll }),
    [handleApplyAll]
  )

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
        readOnlyEdit
        onCellEditRequest={handleCellEditRequest}
        stopEditingWhenCellsLoseFocus
        rowClass="cursor-pointer"
      />
    </div>
  )
}
