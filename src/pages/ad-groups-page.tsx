import { useState } from "react"
import { ArrowRight, RefreshCw, UserPlus } from "lucide-react"
import { useNavigate } from "react-router"

import { openAccountDialog } from "@/lib/overlays"
import { AdGroupSelectTable } from "@/components/ad-group-select-table"
import { PageHeader } from "@/components/page-header"
import { SetChipBar, type SetFilter } from "@/components/set-chip-bar"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAccount } from "@/hooks/use-account"
import { useAdGroups, useSyncAccount } from "@/hooks/use-ad-groups"
import { useBiddingSets } from "@/hooks/use-bidding-sets"
import { formatDateTime } from "@/lib/format"
import { routes } from "@/lib/pages"

interface Status {
  text: string
  showBiddingLink?: boolean
  error?: boolean
}

export function AdGroupsPage() {
  const navigate = useNavigate()
  const { account } = useAccount()
  const customerId = account?.customerId
  const [status, setStatus] = useState<Status | null>(null)
  const [filter, setFilter] = useState<SetFilter>("all")

  const { data: groups = [], isLoading: loading } = useAdGroups(customerId)
  const syncAccount = useSyncAccount(customerId)
  const syncing = syncAccount.isPending
  const {
    sets,
    membership,
    createSet,
    updateSet,
    reorderSets,
    deleteSet,
    assignGroups,
    unassignGroups,
  } = useBiddingSets()
  const pending =
    createSet.isPending || assignGroups.isPending || unassignGroups.isPending
  const unassignedCount = groups.filter((g) => !membership[g.id]).length

  const fail = (err: unknown, fallback: string) =>
    setStatus({
      text: err instanceof Error ? err.message : fallback,
      error: true,
    })

  function handleSync() {
    setStatus({ text: "계정 동기화 중..." })
    syncAccount.mutate(undefined, {
      onSuccess: (result) =>
        setStatus({
          text: `계정 동기화 완료 (${formatDateTime(result.syncedAt)}) — 캠페인 ${result.campaigns}개, 그룹 ${result.adGroups}개.`,
        }),
      onError: (err) => fail(err, "동기화에 실패했습니다."),
    })
  }

  function handleAssign(adGroupIds: string[], setId: string) {
    assignGroups.mutate(
      { setId, adGroupIds },
      {
        onSuccess: (result) =>
          setStatus({
            text:
              `${result.name}에 그룹 ${adGroupIds.length}개를 추가했습니다.` +
              (result.moved > 0
                ? ` (${result.moved}개는 다른 세트에서 이동)`
                : ""),
            showBiddingLink: true,
          }),
        onError: (err) => fail(err, "세트에 추가하지 못했습니다."),
      }
    )
  }

  function handleCreateSet(name: string, adGroupIds: string[]) {
    createSet.mutate(
      { name, adGroupIds },
      {
        onSuccess: (set) =>
          setStatus({
            text:
              adGroupIds.length > 0
                ? `${set.name} 세트를 만들고 그룹 ${adGroupIds.length}개를 추가했습니다.`
                : `${set.name} 세트를 만들었습니다.`,
            showBiddingLink: true,
          }),
        onError: (err) => fail(err, "세트를 만들지 못했습니다."),
      }
    )
  }

  function handleRenameSet(setId: string, name: string) {
    updateSet.mutate(
      { id: setId, name },
      {
        onSuccess: () =>
          setStatus({ text: `세트 이름을 "${name}"(으)로 변경했습니다.` }),
        onError: (err) => fail(err, "이름을 변경하지 못했습니다."),
      }
    )
  }

  function handleDeleteSet(setId: string) {
    const name = sets.find((s) => s.id === setId)?.name ?? "세트"
    deleteSet.mutate(setId, {
      onSuccess: () => {
        if (filter === setId) setFilter("all")
        setStatus({ text: `${name} 세트를 삭제했습니다.` })
      },
      onError: (err) => fail(err, "세트를 삭제하지 못했습니다."),
    })
  }

  function handleUnassign(adGroupIds: string[]) {
    unassignGroups.mutate(adGroupIds, {
      onSuccess: () =>
        setStatus({
          text: `그룹 ${adGroupIds.length}개를 세트에서 제거했습니다.`,
        }),
      onError: (err) => fail(err, "세트에서 제거하지 못했습니다."),
    })
  }

  if (!account) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <UserPlus className="size-5 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-medium">네이버 광고 계정이 연결되지 않았습니다</p>
          <p className="text-sm text-muted-foreground">
            계정을 연결하면 캠페인과 광고 그룹을 불러올 수 있습니다.
          </p>
        </div>
        <Button onClick={() => void openAccountDialog()}>계정 연결</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PageHeader
        title="광고 그룹"
        description="운영 중인 광고 그룹을 자동입찰 세트로 묶습니다."
        actions={
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncing}
                  aria-label="계정 동기화"
                />
              }
            >
              <RefreshCw className={syncing ? "animate-spin" : undefined} />
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">계정 동기화</p>
              <p>캠페인과 광고 그룹을 다시 불러옵니다</p>
            </TooltipContent>
          </Tooltip>
        }
      />

      <SetChipBar
        sets={sets}
        totalCount={groups.length}
        unassignedCount={unassignedCount}
        value={filter}
        onChange={setFilter}
        onCreate={(name) => handleCreateSet(name, [])}
        onRename={handleRenameSet}
        onDelete={handleDeleteSet}
        onReorder={(ids) =>
          reorderSets.mutate(ids, {
            onError: (err) => fail(err, "순서를 변경하지 못했습니다."),
          })
        }
      />

      <AdGroupSelectTable
        groups={groups}
        loading={loading}
        sets={sets}
        membership={membership}
        filter={filter}
        onAssign={handleAssign}
        onUnassign={handleUnassign}
        onCreateSet={handleCreateSet}
        pending={pending}
      />

      {status && (
        <div
          className={
            status.error
              ? "flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              : "flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
          }
        >
          <span>{status.text}</span>
          {status.showBiddingLink && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => void navigate(routes.bidding)}
            >
              자동 입찰로 이동
              <ArrowRight />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
