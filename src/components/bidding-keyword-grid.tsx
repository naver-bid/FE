import { useMemo, useState } from "react"
import type {
  CellEditRequestEvent,
  ColDef,
  GetRowIdFunc,
  ValueFormatterParams,
} from "ag-grid-community"
import {
  AgGridReact,
  type CustomCellRendererProps,
  type CustomOverlayProps,
} from "ag-grid-react"
import { Search, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  useAdGroupKeywords,
  useUpdateKeywordSetting,
} from "@/hooks/use-ad-groups"
import { gridTheme } from "@/lib/ag-grid"
import { formatNumber } from "@/lib/format"
import { errorMessage } from "@/lib/toast"
import type { AdGroup, AdGroupKeyword, BidSettingValues } from "@/types/ads"

interface BiddingKeywordGridProps {
  /** 선택된 그룹. 없으면 안내 문구만 보인다 */
  group: AdGroup | null
}

interface OverlayParams {
  query: string
  errorMessage: string | null
}

const defaultColDef: ColDef<AdGroupKeyword> = {
  resizable: true,
  sortable: true,
  suppressHeaderMenuButton: true,
}

const numberCell: Partial<ColDef<AdGroupKeyword>> = {
  type: "numericColumn",
  cellClass: "tabular-nums",
}

/** 사용자가 편집하는 셀. 배경을 살짝 칠해 편집 가능함을 알린다 */
const editableCell: Partial<ColDef<AdGroupKeyword>> = {
  type: "numericColumn",
  cellClass: "tabular-nums bg-primary/8",
  editable: true,
  cellEditor: "agNumberCellEditor",
}

const formatWon = ({
  value,
}: ValueFormatterParams<AdGroupKeyword, number | null>) =>
  value == null ? "" : `${formatNumber(value)}원`

const formatRank = ({
  value,
}: ValueFormatterParams<AdGroupKeyword, number | null>) =>
  value == null ? "" : String(value)

// 현재 API(KeywordRead)로 받을 수 있는 필드만 컬럼으로 둔다.
const columnDefs: ColDef<AdGroupKeyword>[] = [
  {
    field: "keyword",
    headerName: "키워드",
    flex: 1,
    minWidth: 200,
    cellClass: "font-medium",
  },
  {
    field: "status",
    headerName: "상태",
    width: 120,
    cellClass: "flex items-center gap-1.5",
    cellRenderer: StatusCell,
  },
  {
    colId: "avgRank",
    // stats.avgRank — 최근 7일 평균 노출 순위 (네이버 집계, 수 시간 지연). 실시간 순위가 아니다.
    headerName: "평균 순위(7일)",
    width: 115,
    ...numberCell,
    valueGetter: ({ data }) => data?.stats?.avgRank ?? null,
    valueFormatter: ({
      value,
    }: ValueFormatterParams<AdGroupKeyword, number | null>) =>
      value == null ? "-" : value.toFixed(1),
  },
  {
    field: "bidAmt",
    headerName: "입찰가",
    width: 110,
    ...numberCell,
    cellRenderer: BidCell,
  },
  {
    field: "exposable",
    headerName: "노출 가능",
    width: 95,
    cellClass: "flex items-center",
    cellRenderer: ExposableCell,
    comparator: (a: boolean, b: boolean) => Number(b) - Number(a),
  },
  {
    colId: "targetRank",
    headerName: "희망순위",
    width: 100,
    ...editableCell,
    valueGetter: ({ data }) => data?.bidSetting?.targetRank ?? null,
    valueFormatter: formatRank,
    cellEditorParams: { min: 1, max: 15, precision: 0, step: 1 },
  },
  {
    colId: "maxBid",
    headerName: "입찰가 한도",
    width: 120,
    ...editableCell,
    valueGetter: ({ data }) => data?.bidSetting?.maxBid ?? null,
    valueFormatter: formatWon,
    cellEditorParams: { min: 0, precision: 0, step: 10 },
  },
  {
    colId: "bidAdjust",
    headerName: "가감액",
    width: 110,
    ...editableCell,
    valueGetter: ({ data }) => data?.bidSetting?.bidAdjust ?? null,
    valueFormatter: formatWon,
    cellEditorParams: { min: 0, precision: 0, step: 10 },
  },
]

/** 편집 가능한 컬럼 colId → 설정 필드. 편집 요청을 PATCH 바디로 바꿀 때 쓴다 */
const EDITABLE_FIELDS = new Set<keyof BidSettingValues>([
  "targetRank",
  "maxBid",
  "bidAdjust",
])

const getRowId: GetRowIdFunc<AdGroupKeyword> = ({ data }) => data.id

const STATUS_LABEL: Record<string, string> = {
  ELIGIBLE: "노출 가능",
  PAUSED: "일시중지",
  DELETED: "삭제됨",
}

/** 네이버 상태 + 사용자 OFF 여부. 사유는 title 로 */
function StatusCell({
  value,
  data,
}: CustomCellRendererProps<AdGroupKeyword, string>) {
  const label = value ? (STATUS_LABEL[value] ?? value) : "-"
  return (
    <>
      <span
        title={data?.statusReason ?? undefined}
        className={value === "ELIGIBLE" ? undefined : "text-muted-foreground"}
      >
        {label}
      </span>
      {data?.userLock && (
        <Badge variant="outline" className="h-4 px-1.5">
          OFF
        </Badge>
      )}
    </>
  )
}

function BidCell({
  value,
  data,
}: CustomCellRendererProps<AdGroupKeyword, number>) {
  if (data?.useGroupBidAmt)
    return <span className="text-xs text-muted-foreground">그룹 입찰가</span>
  return <>{value == null ? "-" : `${formatNumber(value)}원`}</>
}

function ExposableCell({
  value,
}: CustomCellRendererProps<AdGroupKeyword, boolean>) {
  return value ? (
    <span>가능</span>
  ) : (
    <span className="text-muted-foreground">불가</span>
  )
}

function GridOverlay({
  overlayType,
  query,
  errorMessage,
}: CustomOverlayProps<AdGroupKeyword> & OverlayParams) {
  let message: React.ReactNode
  switch (overlayType) {
    case "loading":
      message = "키워드를 불러오는 중..."
      break
    case "noRows":
      message = errorMessage ? (
        <>
          키워드를 불러오지 못했습니다.
          <br />
          <span className="opacity-70">{errorMessage}</span>
        </>
      ) : (
        "등록된 키워드가 없습니다."
      )
      break
    case "noMatchingRows":
      message = query ? "검색 결과가 없습니다." : null
      break
    default:
      return null
  }
  return <p className="text-center text-sm text-muted-foreground">{message}</p>
}

/** 편집기가 돌려주는 값을 설정값으로. 빈 값은 null(미입력) */
function toSettingValue(raw: unknown): number | null {
  if (raw === "" || raw == null) return null
  const n = typeof raw === "number" ? raw : Number(raw)
  return Number.isFinite(n) ? Math.round(n) : null
}

/**
 * 자동 입찰 페이지 하단 — 선택한 그룹의 키워드 목록.
 * 희망순위·입찰가 한도·가감액은 셀을 더블클릭(또는 Enter)해 편집하면 즉시 저장된다.
 */
export function BiddingKeywordGrid({ group }: BiddingKeywordGridProps) {
  const adGroupId = group?.id ?? null
  const {
    data: keywords = [],
    isLoading,
    error,
  } = useAdGroupKeywords(adGroupId)
  const updateSetting = useUpdateKeywordSetting(adGroupId)

  const [search, setSearch] = useState("")
  const query = search.trim()
  const overlayParams = useMemo<OverlayParams>(
    () => ({ query, errorMessage: error?.message ?? null }),
    [query, error]
  )

  /**
   * readOnlyEdit 이라 그리드는 데이터를 직접 바꾸지 않고 요청만 보낸다.
   * 여기서 캐시를 낙관적으로 갱신하면 그리드가 새 값을 다시 그린다.
   */
  function handleCellEditRequest(e: CellEditRequestEvent<AdGroupKeyword>) {
    const field = e.column.getColId() as keyof BidSettingValues
    if (!e.data || !EDITABLE_FIELDS.has(field)) return
    const next = toSettingValue(e.newValue)
    const prev = e.data.bidSetting?.[field] ?? null
    if (next === prev) return
    updateSetting.mutate(
      { keywordId: e.data.id, patch: { [field]: next } },
      {
        onError: (err) =>
          toast.error(errorMessage(err, "설정을 저장하지 못했습니다.")),
      }
    )
  }

  if (!group) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        위에서 그룹을 선택하면 키워드가 여기에 표시됩니다.
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="truncate text-muted-foreground">
            {group.campaignName}
          </span>
          <span className="text-muted-foreground">›</span>
          <span className="truncate font-medium">{group.name}</span>
          {!isLoading && (
            <Badge variant="secondary" className="shrink-0">
              키워드 {keywords.length}개
            </Badge>
          )}
        </div>
        <InputGroup className="w-64">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="키워드 검색"
            aria-label="키워드 검색"
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
      </div>

      <div className="min-h-0 flex-1">
        <AgGridReact<AdGroupKeyword>
          theme={gridTheme}
          rowData={keywords}
          getRowId={getRowId}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={query}
          loading={isLoading}
          overlayComponent={GridOverlay}
          overlayComponentParams={overlayParams}
          readOnlyEdit
          onCellEditRequest={handleCellEditRequest}
          stopEditingWhenCellsLoseFocus
        />
      </div>
    </div>
  )
}
