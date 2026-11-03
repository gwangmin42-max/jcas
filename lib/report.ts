import ExcelJS from "exceljs";
import type { VerifyResult } from "./verify";

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3A5F" } };
const SEVERITY_FILL: Record<string, string> = { 높음: "FFFDE2E2", 중간: "FFFFF4D6", 참고: "FFEAF2FB" };

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = HEADER_FILL;
  row.alignment = { vertical: "middle", horizontal: "center" };
}

export async function buildReport(result: VerifyResult, sourceName: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const { summary } = result;

  const sum = wb.addWorksheet("검증 종합현황");
  sum.columns = [{ width: 26 }, { width: 70 }];
  sum.addRow(["수입신고 적정성 검증 보고서"]).font = { bold: true, size: 14 };
  sum.addRow([]);
  const info: [string, string | number][] = [
    ["대상 파일", sourceName],
    ["신고 기간", `${summary.dateFrom} ~ ${summary.dateTo}`],
    ["신고 건수 / 란 수", `${summary.declarationCount.toLocaleString()}건 / ${summary.lineCount.toLocaleString()}란`],
    ["과세가격 합계(원)", summary.totalTaxBaseKrw],
    ["관세 합계(원)", summary.totalDuty],
    ["검토 필요 항목", `${summary.findingCount.toLocaleString()}건 (높음 ${summary.bySeverity.높음} / 중간 ${summary.bySeverity.중간} / 참고 ${summary.bySeverity.참고})`],
  ];
  for (const [label, value] of info) {
    const row = sum.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    if (typeof value === "number") row.getCell(2).numFmt = "#,##0";
    row.getCell(2).alignment = { horizontal: "left" };
  }
  sum.addRow([]);
  sum.addRow(["분야별 검토 필요 건수"]).font = { bold: true };
  for (const [category, count] of Object.entries(summary.byCategory)) {
    const row = sum.addRow([category, count]);
    row.getCell(2).alignment = { horizontal: "left" };
  }
  sum.addRow([]);
  for (const text of [
    "※ 본 검증 결과는 수입신고 데이터에 기반한 사전 분석자료로서, 신고내용의 법적 적정성에 대한 최종 확인 또는 관세당국의 심사 결과를 의미하지 않습니다.",
    "※ 성실신고 확인서 작성 및 제출을 위한 최종 검토는 관련 증빙자료와 관계 법령에 근거하여 별도로 수행되어야 합니다.",
  ]) {
    const notice = sum.addRow([text]);
    sum.mergeCells(`A${notice.number}:B${notice.number}`);
    notice.font = { italic: true, color: { argb: "FF6B7280" } };
    notice.alignment = { wrapText: true, vertical: "top" };
    notice.height = 32;
  }

  const detail = wb.addWorksheet("검토대상 상세내역");
  detail.columns = [
    { header: "구분", key: "severity", width: 8 },
    { header: "분야", key: "category", width: 12 },
    { header: "검토항목", key: "rule", width: 26 },
    { header: "신고번호", key: "declarationNo", width: 18 },
    { header: "란", key: "lineNo", width: 6 },
    { header: "HS CODE", key: "hsCode", width: 14 },
    { header: "품명", key: "itemName", width: 34 },
    { header: "주요 확인사항", key: "message", width: 90 },
    { header: "검토 결과(메모)", key: "memo", width: 28 },
  ];
  styleHeader(detail.getRow(1));
  for (const f of result.findings) {
    const row = detail.addRow({ ...f, memo: "" });
    row.getCell("severity").fill = { type: "pattern", pattern: "solid", fgColor: { argb: SEVERITY_FILL[f.severity] } };
    row.getCell("message").alignment = { wrapText: true, vertical: "top" };
  }
  detail.views = [{ state: "frozen", ySplit: 1 }];
  detail.autoFilter = { from: "A1", to: "I1" };

  const excluded = wb.addWorksheet("검증 제외·추가 확인사항");
  excluded.columns = [{ header: "구분", key: "kind", width: 18 }, { header: "내용", key: "text", width: 110 }];
  styleHeader(excluded.getRow(1));
  const exclusions = [
    ...result.skippedChecks.map((text) => ({ kind: "검증 제외", text })),
    { kind: "추가 검토 필요", text: "품목분류의 정확성은 물품의 성상·기능·용도 및 관련 분류규정에 대한 별도 검토가 필요합니다." },
    { kind: "추가 검토 필요", text: "FTA 협정세율 적용의 적정성은 원산지증명서, 원산지결정기준 충족 여부 및 직접운송요건 등 증빙자료의 검토가 필요합니다." },
    { kind: "추가 검토 필요", text: "과세가격의 적정성은 실제 거래가격, 가산·공제요소, 특수관계 영향 및 계약·회계자료의 검토가 필요합니다." },
  ];
  for (const item of exclusions) {
    const row = excluded.addRow(item);
    row.getCell("text").alignment = { wrapText: true, vertical: "top" };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
