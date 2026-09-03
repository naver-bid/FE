import { useEffect, useMemo } from "react"
import { ArrowRight, Gavel } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router"
import { useDefaultLayout } from "react-resizable-panels"
import { toast } from "sonner"

import { BiddingGroupGrid } from "@/components/bidding-group-grid"
import { BiddingKeywordGrid } from "@/components/bidding-keyword-grid"
import { Chip } from "@/components/set-chip-bar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Switch } from "@/components/ui/switch"
import { useAccount } from "@/hooks/use-account"
import { useAdGroups } from "@/hooks/use-ad-groups"
import { useBiddingSets } from "@/hooks/use-bidding-sets"
import { routes } from "@/lib/pages"
import { errorMessage } from "@/lib/toast"
import { cn } from "@/lib/utils"
import type { BiddingSet } from "@/types/bidding"

/** 세트 칩 앞의 상태 점 — 초록: 자동입찰 진행 중, 회색: 정지 */
function StatusDot({ enabled }: { enabled: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 rounded-full",
        enabled ? "bg-emerald-500" : "bg-muted-foreground/40"
      )}
    />
  )
}

/**
 * 자동 입찰 — 상단 칩으로 세트를 고르면 위 그리드에 그룹, 그룹을 클릭하면 아래 그리드에 키워드.
 * 선택 상태(세트/그룹)는 URL 쿼리(?set=&group=)에 두어 새로고침해도 유지된다. 세트 구성은 광고 그룹 페이지에서.
 */
export function BiddingPage() {
  const navigate = useNavigate()
  const goAdGroups = () => void navigate(routes.adGroups)
  const { account } = useAccount()
  const { data: groups = [] } = useAdGroups(account?.customerId)
  const { sets, isLoading, updateSet } = useBiddingSets()

  // 위/아래 그리드 비율은 브라우저(localStorage)에 저장해 다음 방문에도 유지
  const splitLayout = useDefaultLayout({
    id: "bidding-page-split",
    storage: localStorage,
  })

  const [params, setParams] = useSearchParams()
  const setParam = params.get("set")
  const groupParam = params.get("group")

  // URL 의 세트가 없거나 사라졌으면 첫 세트로
  const activeSet = sets.find((s) => s.id === setParam) ?? sets[0] ?? null
  const activeGroups = useMemo(() => {
    if (!activeSet) return []
    const ids = new Set(activeSet.adGroupIds)
    return groups.filter((g) => ids.has(g.id))
  }, [groups, activeSet])
  // URL 의 그룹이 현재 세트에 없으면 첫 그룹 자동 선택 (아래 그리드가 비어 보이는 순간을 없앤다)
  const activeGroup =
    activeGroups.find((g) => g.id === groupParam) ?? activeGroups[0] ?? null

  // 유도된 선택을 URL 에 되써서 상태와 주소를 일치시킨다
  useEffect(() => {
    const nextSet = activeSet?.id ?? null
    const nextGroup = activeGroup?.id ?? null
    if (nextSet === setParam && nextGroup === groupParam) return
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (nextSet) next.set("set", nextSet)
        else next.delete("set")
        if (nextGroup) next.set("group", nextGroup)
        else next.delete("group")
        return next
      },
      { replace: true }
    )
  }, [activeSet, activeGroup, setParam, groupParam, setParams])

  function selectSet(id: string) {
    // 세트가 바뀌면 그룹 선택은 초기화 → 위 effect 가 첫 그룹을 고른다
    setParams({ set: id })
  }

  function selectGroup(id: string | null) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (id) next.set("group", id)
      else next.delete("group")
      return next
    })
  }

  function toggleEnabled(set: BiddingSet, enabled: boolean) {
    updateSet.mutate(
      { id: set.id, enabled },
      {
        onError: (err) =>
          toast.error(
            errorMessage(
              err,
              `${set.name} 세트의 자동입찰을 ${enabled ? "시작" : "정지"}하지 못했습니다.`
            )
          ),
      }
    )
  }

  if (!account) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        계정을 연결하면 자동 입찰을 설정할 수 있습니다.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        불러오는 중...
      </div>
    )
  }

  if (sets.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Gavel className="size-5 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-medium">자동입찰 세트가 없습니다</p>
          <p className="text-sm text-muted-foreground">
            광고 그룹 페이지에서 그룹을 선택해 세트로 묶으세요.
          </p>
        </div>
        <Button variant="outline" onClick={goAdGroups}>
          광고 그룹으로 이동
          <ArrowRight />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* 세트 선택 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {sets.map((set) => (
            <Chip
              key={set.id}
              active={set.id === activeSet?.id}
              onClick={() => selectSet(set.id)}
              className={cn(!set.enabled && "opacity-60")}
            >
              <StatusDot enabled={set.enabled} />
              {set.name}
              <span className="tabular-nums opacity-70">
                {set.adGroupIds.length}
              </span>
            </Chip>
          ))}
        </div>
        <Button
          variant="link"
          size="sm"
          className="h-auto shrink-0 p-0 text-xs"
          onClick={goAdGroups}
        >
          광고 그룹에서 편집
          <ArrowRight />
        </Button>
      </div>

      {/* 선택된 세트 헤더 — 이 세트의 자동입찰 실행 여부를 여기서 켜고 끈다 */}
      {activeSet && (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="truncate font-medium">{activeSet.name}</span>
            <span className="shrink-0 text-muted-foreground">
              그룹 {activeSet.adGroupIds.length}개
            </span>
          </div>
          <Label
            htmlFor="bidding-set-enabled"
            className="flex shrink-0 cursor-pointer items-center gap-2 text-sm"
          >
            <span
              className={cn(
                activeSet.enabled ? "text-foreground" : "text-muted-foreground"
              )}
            >
              자동입찰 {activeSet.enabled ? "진행 중" : "정지"}
            </span>
            <Switch
              id="bidding-set-enabled"
              checked={activeSet.enabled}
              onCheckedChange={(checked) => toggleEnabled(activeSet, checked)}
            />
          </Label>
        </div>
      )}

      {/* 위: 그룹 / 아래: 키워드. 경계를 드래그해 비율을 바꿀 수 있다 */}
      <ResizablePanelGroup
        orientation="vertical"
        defaultLayout={splitLayout.defaultLayout}
        onLayoutChanged={splitLayout.onLayoutChanged}
        className="min-h-0 flex-1"
      >
        <ResizablePanel
          id="groups"
          defaultSize="30%"
          minSize="15%"
          className="flex flex-col"
        >
          <BiddingGroupGrid
            groups={activeGroups}
            selectedId={activeGroup?.id ?? null}
            onSelect={selectGroup}
          />
        </ResizablePanel>

        <ResizableHandle withHandle className="my-1.5" />

        <ResizablePanel
          id="keywords"
          defaultSize="70%"
          minSize="25%"
          className="flex flex-col"
        >
          <BiddingKeywordGrid group={activeGroup} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
