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

  const sum = wb.addWorksheet("요약");
  sum.columns = [{ width: 26 }, { width: 70 }];
  sum.addRow(["관세 성실신고 확인 검증 결과"]).font = { bold: true, size: 14 };
  sum.addRow([]);
  const info: [string, string | number][] = [
    ["대상 파일", sourceName],
    ["신고 기간", `${summary.dateFrom} ~ ${summary.dateTo}`],
    ["신고 건수 / 란 수", `${summary.declarationCount.toLocaleString()}건 / ${summary.lineCount.toLocaleString()}란`],
    ["과세가격 합계(원)", summary.totalTaxBaseKrw],
    ["관세 합계(원)", summary.totalDuty],
    ["확인 필요 항목", `${summary.findingCount.toLocaleString()}건 (높음 ${summary.bySeverity.높음} / 중간 ${summary.bySeverity.중간} / 참고 ${summary.bySeverity.참고})`],
  ];
  for (const [label, value] of info) {
    const row = sum.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    if (typeof value === "number") row.getCell(2).numFmt = "#,##0";
    row.getCell(2).alignment = { horizontal: "left" };
  }
  sum.addRow([]);
  sum.addRow(["분야별 확인 필요 건수"]).font = { bold: true };
  for (const [category, count] of Object.entries(summary.byCategory)) {
    const row = sum.addRow([category, count]);
    row.getCell(2).alignment = { horizontal: "left" };
  }
  if (result.skippedChecks.length > 0) {
    sum.addRow([]);
    sum.addRow(["수행하지 못한 검사"]).font = { bold: true, color: { argb: "FFB45309" } };
    for (const note of result.skippedChecks) {
      const row = sum.addRow([note]);
      sum.mergeCells(`A${row.number}:B${row.number}`);
      row.alignment = { wrapText: true, vertical: "top" };
      row.height = 32;
    }
  }
  sum.addRow([]);
  const notice = sum.addRow(["※ 이 결과는 오류 확정이 아니라 관세사가 다시 확인할 대상을 좁힌 것입니다. 최종 판단은 전문가가 합니다."]);
  sum.mergeCells(`A${notice.number}:B${notice.number}`);
  notice.font = { italic: true, color: { argb: "FF6B7280" } };

  const detail = wb.addWorksheet("확인필요 목록");
  detail.columns = [
    { header: "중요도", key: "severity", width: 8 },
    { header: "분야", key: "category", width: 12 },
    { header: "검사 항목", key: "rule", width: 26 },
    { header: "신고번호", key: "declarationNo", width: 18 },
    { header: "란", key: "lineNo", width: 6 },
    { header: "세번부호", key: "hsCode", width: 14 },
    { header: "품명", key: "itemName", width: 34 },
    { header: "내용", key: "message", width: 90 },
    { header: "확인 결과(메모)", key: "memo", width: 28 },
  ];
  styleHeader(detail.getRow(1));
  for (const f of result.findings) {
    const row = detail.addRow({ ...f, memo: "" });
    row.getCell("severity").fill = { type: "pattern", pattern: "solid", fgColor: { argb: SEVERITY_FILL[f.severity] } };
    row.getCell("message").alignment = { wrapText: true, vertical: "top" };
  }
  detail.views = [{ state: "frozen", ySplit: 1 }];
  detail.autoFilter = { from: "A1", to: "I1" };

  return Buffer.from(await wb.xlsx.writeBuffer());
}
