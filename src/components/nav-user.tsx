import { ChevronsUpDown, KeyRound, LogOut, UserPlus } from "lucide-react"

import { openAccountDialog } from "@/lib/overlays"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAccount } from "@/hooks/use-account"
import { formatNumber } from "@/lib/format"

export function NavUser() {
  const { account, logout } = useAccount()
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {account ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  tooltip={account.loginId}
                  className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
                />
              }
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg text-xs">
                  {account.loginId.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{account.loginId}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {account.balance === null ? "잔액 조회 불가" : `잔액 ${formatNumber(account.balance)}원`}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex flex-col gap-1 px-2 py-1.5 text-sm">
                  <span className="font-medium">{account.loginId}</span>
                  <span className="text-xs text-muted-foreground">
                    Customer ID {account.customerId}
                  </span>
                  <div className="mt-1 grid grid-cols-2 gap-x-2 text-xs">
                    <span className="text-muted-foreground">소진액</span>
                    <span className="text-right tabular-nums">
                      {account.spent === null ? "-" : formatNumber(account.spent)}
                    </span>
                    <span className="text-muted-foreground">잔액</span>
                    <span className="text-right tabular-nums">
                      {account.balance === null ? "-" : formatNumber(account.balance)}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void openAccountDialog()}>
                <KeyRound />
                다른 계정 로그인
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void logout()}>
                <LogOut />
                연결 해제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SidebarMenuButton
            size="lg"
            onClick={() => void openAccountDialog()}
            tooltip="계정 연결"
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg">
                <UserPlus className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">계정 연결 필요</span>
              <span className="truncate text-xs text-muted-foreground">
                클릭하여 API 정보 입력
              </span>
            </div>
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
