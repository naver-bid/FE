import {
  CellStyleModule,
  ClientSideRowModelModule,
  ExternalFilterModule,
  ModuleRegistry,
  NumberEditorModule,
  QuickFilterModule,
  RenderApiModule,
  RowApiModule,
  RowSelectionModule,
  RowStyleModule,
  SelectEditorModule,
  TooltipModule,
  ValidationModule,
  themeQuartz,
  type Theme,
} from "ag-grid-community"

// AG Grid 모듈은 앱에서 한 번만 등록하면 된다. 이 파일을 import 하는 것으로 등록이 완료된다.
// 번들 크기를 위해 AllCommunityModule 대신 쓰는 기능만 등록한다.
// (새 기능을 쓰면 개발 모드의 ValidationModule 이 누락된 모듈을 콘솔에 알려준다)
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  RowSelectionModule,
  QuickFilterModule,
  ExternalFilterModule,
  // 자동 입찰 그룹 그리드에서 api.forEachNode 로 선택 상태를 맞출 때 필요
  RowApiModule,
  // 키워드 그리드 No 열을 정렬·필터 뒤 api.refreshCells 로 다시 그릴 때 필요
  RenderApiModule,
  // 키워드 그리드의 희망순위·입찰가 한도·가감액 셀 편집
  NumberEditorModule,
  // 자동 입찰 그룹 그리드의 기기(device) 셀 편집
  SelectEditorModule,
  // 셀 편집 검증 오류 메시지를 툴팁으로 보여준다 (invalidEditValueMode)
  TooltipModule,
  RowStyleModule,
  CellStyleModule,
  ...(import.meta.env.DEV ? [ValidationModule] : []),
])

/**
 * shadcn 디자인 토큰(CSS 변수)에 맞춘 AG Grid 테마.
 * 색상을 var() 로 연결하므로 `.dark` 클래스 전환(다크 모드)이 그대로 반영된다.
 */
export const gridTheme: Theme = themeQuartz.withParams({
  // 색상
  accentColor: "var(--primary)",
  // 셀 편집 검증 실패 시 테두리 색 (invalidEditValueMode)
  invalidColor: "var(--destructive)",
  backgroundColor: "var(--background)",
  foregroundColor: "var(--foreground)",
  textColor: "var(--foreground)",
  subtleTextColor: "var(--muted-foreground)",
  borderColor: "var(--border)",
  chromeBackgroundColor: "var(--muted)",
  headerBackgroundColor: "var(--muted)",
  headerTextColor: "var(--muted-foreground)",
  // 호버는 헤더와 같은 muted 톤(일시적이라 무방), 선택 행은 primary 를 살짝 섞어 헤더/호버와 구분
  rowHoverColor: "var(--muted)",
  selectedRowBackgroundColor:
    "color-mix(in oklab, var(--primary) 22%, var(--background))",
  focusShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  browserColorScheme: "inherit",

  // 체크박스 (shadcn Checkbox 와 동일한 톤)
  checkboxBorderRadius: 4,
  checkboxUncheckedBackgroundColor: "var(--background)",
  checkboxUncheckedBorderColor: "var(--input)",
  checkboxCheckedBackgroundColor: "var(--primary)",
  checkboxCheckedBorderColor: "var(--primary)",
  checkboxCheckedShapeColor: "var(--primary-foreground)",
  checkboxIndeterminateBackgroundColor: "var(--primary)",
  checkboxIndeterminateBorderColor: "var(--primary)",
  checkboxIndeterminateShapeColor: "var(--primary-foreground)",

  // 타이포/간격 — 한 화면에 많은 행이 보이도록 촘촘하게
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  headerFontSize: 14,
  headerFontWeight: 500,
  rowHeight: 32,
  headerHeight: 32,
  cellHorizontalPadding: 8,
  borderRadius: 4,
  wrapperBorderRadius: "calc(var(--radius) - 2px)",
})
