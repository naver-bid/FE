import { useMemo, useState } from "react"
import type {
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

import { Badge } from "@/components/ui/badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { useAdGroupKeywords } from "@/hooks/use-ad-groups"
import { gridTheme } from "@/lib/ag-grid"
import { formatDateTime, formatNumber } from "@/lib/format"
import type { AdGroup, AdGroupKeyword } from "@/types/ads"

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

const formatOptionalDateTime = ({
  value,
}: ValueFormatterParams<AdGroupKeyword, string | null>) =>
  value ? formatDateTime(value) : "-"

// 현재 API(AdGroupKeyword)로 받을 수 있는 필드만 컬럼으로 둔다.
const columnDefs: ColDef<AdGroupKeyword>[] = [
  {
    field: "keyword",
    headerName: "키워드",
    flex: 1,
    minWidth: 200,
    cellClass: "font-medium",
  },
  {
    field: "userLock",
    headerName: "입찰",
    width: 80,
    cellClass: "flex items-center",
    cellRenderer: OnOffCell,
    // OFF(userLock=true) 가 뒤로 가도록
    comparator: (a: boolean, b: boolean) => Number(a) - Number(b),
  },
  {
    field: "bidAmt",
    headerName: "입찰가",
    width: 120,
    ...numberCell,
    cellRenderer: BidCell,
  },
  {
    field: "status",
    headerName: "상태",
    width: 110,
    cellRenderer: StatusCell,
  },
  {
    field: "inspectStatus",
    headerName: "검수",
    width: 130,
    valueFormatter: ({ value }) => value ?? "-",
    cellStyle: { color: "var(--muted-foreground)" },
  },
  {
    field: "qualityIndex",
    headerName: "품질지수",
    width: 100,
    ...numberCell,
    valueFormatter: ({ value }) => (value == null ? "-" : String(value)),
  },
  {
    field: "regTm",
    headerName: "등록",
    width: 140,
    valueFormatter: formatOptionalDateTime,
    cellStyle: { color: "var(--muted-foreground)" },
  },
  {
    field: "editTm",
    headerName: "수정",
    width: 140,
    valueFormatter: formatOptionalDateTime,
    cellStyle: { color: "var(--muted-foreground)" },
  },
]

const getRowId: GetRowIdFunc<AdGroupKeyword> = ({ data }) => data.id

function OnOffCell({
  value,
}: CustomCellRendererProps<AdGroupKeyword, boolean>) {
  return (
    <Badge variant={value ? "outline" : "secondary"} className="h-4 px-1.5">
      {value ? "OFF" : "ON"}
    </Badge>
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

const STATUS_LABEL: Record<string, string> = {
  ELIGIBLE: "노출 가능",
  PAUSED: "일시중지",
  DELETED: "삭제됨",
}

function StatusCell({
  value,
}: CustomCellRendererProps<AdGroupKeyword, string>) {
  if (!value) return <span className="text-muted-foreground">-</span>
  const label = STATUS_LABEL[value] ?? value
  return (
    <span
      className={value === "ELIGIBLE" ? undefined : "text-muted-foreground"}
    >
      {label}
    </span>
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

/** 자동 입찰 페이지 하단 — 선택한 그룹의 키워드 목록 */
export function BiddingKeywordGrid({ group }: BiddingKeywordGridProps) {
  const {
    data: keywords = [],
    isLoading,
    error,
  } = useAdGroupKeywords(group?.id ?? null)
  const [search, setSearch] = useState("")
  const query = search.trim()
  const overlayParams = useMemo<OverlayParams>(
    () => ({ query, errorMessage: error?.message ?? null }),
    [query, error]
  )

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
          suppressCellFocus
        />
      </div>
    </div>
  )
}
