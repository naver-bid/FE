/** mutation 에러에서 사용자에게 보여줄 메시지 */
export function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback
}
