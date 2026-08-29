import { ChevronsUpDown, KeyRound, Link2, LogOut, Unlink } from "lucide-react"

import { openAccountDialog } from "@/lib/overlays"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAccount } from "@/hooks/use-account"
import { formatNumber } from "@/lib/format"

export function NavUser() {
  const { user, account, logout, disconnectNaver } = useAccount()
  const { isMobile } = useSidebar()

  if (!user) return null

  const initials = user.email.slice(0, 2).toUpperCase()
  const subtitle = account
    ? account.balance === null
      ? `${account.loginId} · 잔액 조회 불가`
      : `${account.loginId} · 잔액 ${formatNumber(account.balance)}원`
    : "네이버 광고 계정 미연결"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                tooltip={user.email}
                className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.email}</span>
              <span className="truncate text-xs text-muted-foreground">
                {subtitle}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-60 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex flex-col gap-0.5 px-2 py-1.5 text-sm">
                  <span className="font-medium">{user.email}</span>
                  <span className="text-xs text-muted-foreground">앱 계정</span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuLabel>네이버 광고 계정</DropdownMenuLabel>
              {account ? (
                <>
                  <div className="flex flex-col gap-1 px-2 py-1.5 text-sm">
                    <span className="font-medium">{account.loginId}</span>
                    <span className="text-xs text-muted-foreground">
                      Customer ID {account.customerId}
                    </span>
                    <div className="mt-1 grid grid-cols-2 gap-x-2 text-xs">
                      <span className="text-muted-foreground">소진액</span>
                      <span className="text-right tabular-nums">
                        {account.spent === null
                          ? "-"
                          : formatNumber(account.spent)}
                      </span>
                      <span className="text-muted-foreground">잔액</span>
                      <span className="text-right tabular-nums">
                        {account.balance === null
                          ? "-"
                          : formatNumber(account.balance)}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuItem onClick={() => void openAccountDialog()}>
                    <KeyRound />
                    다른 광고 계정 연결
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void disconnectNaver()}>
                    <Unlink />
                    연결 해제
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => void openAccountDialog()}>
                  <Link2 />
                  광고 계정 연결
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => void logout()}>
              <LogOut />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
