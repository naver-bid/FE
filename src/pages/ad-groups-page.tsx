import { useState } from "react"
import { RefreshCw, UserPlus } from "lucide-react"
import { toast } from "sonner"

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
import { useSyncAccount } from "@/hooks/use-ad-groups"
import { formatDateTime } from "@/lib/format"
import { openAccountDialog } from "@/lib/overlays"
import { errorMessage } from "@/lib/toast"

export function AdGroupsPage() {
  const { account } = useAccount()
  const [filter, setFilter] = useState<SetFilter>("all")

  const syncAccount = useSyncAccount(account?.customerId)
  const syncing = syncAccount.isPending

  function handleSync() {
    const id = toast.loading("계정 동기화 중...")
    syncAccount.mutate(undefined, {
      onSuccess: (result) =>
        toast.success(
          `계정 동기화 완료 (${formatDateTime(result.syncedAt)}) — 캠페인 ${result.campaigns}개, 그룹 ${result.adGroups}개.`,
          { id }
        ),
      onError: (err) =>
        toast.error(errorMessage(err, "동기화에 실패했습니다."), { id }),
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

      <SetChipBar value={filter} onChange={setFilter} />
      <AdGroupSelectTable filter={filter} />
    </div>
  )
}
