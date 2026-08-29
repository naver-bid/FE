import { overlay } from "overlay-kit"

import { AccountDialog } from "@/components/account-dialog"

/**
 * 계정 연결 다이얼로그를 연다. 로그인 성공 시 true, 취소 시 false로 resolve.
 */
export function openAccountDialog() {
  return overlay.openAsync<boolean>(({ isOpen, close, unmount }) => (
    <AccountDialog isOpen={isOpen} close={close} unmount={unmount} />
  ))
}
