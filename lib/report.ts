import ExcelJS from "exceljs";
import type { Analysis } from "./analysis";
import { GENERAL_READINESS, GUIDE } from "./guidance";

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3A5F" } };
const SEVERITY_FILL: Record<string, string> = { 높음: "FFFDE2E2", 중간: "FFFFF4D6", 참고: "FFEAF2FB" };

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = HEADER_FILL;
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
}

function sheet(wb: ExcelJS.Workbook, name: string, columns: { header: string; key: string; width: number; numFmt?: string }[]) {
  const ws = wb.addWorksheet(name);
  ws.columns = columns.map(({ header, key, width }) => ({ header, key, width }));
  columns.forEach((c, i) => c.numFmt && (ws.getColumn(i + 1).numFmt = c.numFmt));
  styleHeader(ws.getRow(1));
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

function severityCell(row: ExcelJS.Row, key: string, severity: string) {
  row.getCell(key).fill = { type: "pattern", pattern: "solid", fgColor: { argb: SEVERITY_FILL[severity] } };
}

export async function buildReport(a: Analysis): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const { summary } = a;

  const sum = wb.addWorksheet("검증 종합현황");
  sum.columns = [{ width: 28 }, { width: 80 }];
  sum.addRow(["수입신고 적정성 검증 보고서 (과세가격 분야)"]).font = { bold: true, size: 14 };
  sum.addRow([]);
  const info: [string, string | number][] = [
    ["대상 파일", a.meta.sourceName],
    ["신고 기간", `${summary.dateFrom} ~ ${summary.dateTo}`],
    ["신고 건수 / 란 수", `${summary.declarationCount.toLocaleString()}건 / ${summary.lineCount.toLocaleString()}란`],
    ["과세가격 합계(원)", summary.totalTaxBaseKrw],
    ["관세 합계(원)", summary.totalDuty],
    ["검토 우선도", `${a.grade.label} — ${a.grade.note}`],
    ["검토 필요 항목", `${summary.findingCount.toLocaleString()}건 (높음 ${summary.bySeverity.높음} / 중간 ${summary.bySeverity.중간} / 참고 ${summary.bySeverity.참고})`],
    ["단가 저가 가능성 추정 과세가격 차이(원)", Math.round(a.exposure.taxBaseKrw)],
    ["위 금액 기준 추정 관세 차이(원)", Math.round(a.exposure.dutyKrw)],
  ];
  for (const [label, value] of info) {
    const row = sum.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    if (typeof value === "number") row.getCell(2).numFmt = "#,##0";
    row.getCell(2).alignment = { horizontal: "left", wrapText: true };
  }
  sum.addRow([]);
  sum.addRow(["분야별 검토 필요 건수"]).font = { bold: true };
  for (const [category, count] of Object.entries(summary.byCategory)) {
    sum.addRow([category, count]).getCell(2).alignment = { horizontal: "left" };
  }
  sum.addRow([]);
  for (const text of [
    "※ 추정 차이는 중앙값 단가로 환산한 단순 추정이며, 저가 신고를 확정한 금액이 아닙니다(단가 폭 50배 초과 그룹 제외).",
    "※ 본 검증 결과는 수입신고 데이터에 기반한 사전 분석자료로서, 신고내용의 법적 적정성에 대한 최종 확인 또는 관세당국의 심사 결과를 의미하지 않습니다.",
    "※ 성실신고 확인서 작성 및 제출을 위한 최종 검토는 관련 증빙자료와 관계 법령에 근거하여 별도로 수행되어야 합니다.",
  ]) {
    const notice = sum.addRow([text]);
    sum.mergeCells(`A${notice.number}:B${notice.number}`);
    notice.font = { italic: true, color: { argb: "FF6B7280" } };
    notice.alignment = { wrapText: true, vertical: "top" };
    notice.height = 32;
  }

  const rules = sheet(wb, "핵심 검토사항", [
    { header: "구분", key: "severity", width: 8 },
    { header: "검토항목", key: "rule", width: 28 },
    { header: "분야", key: "category", width: 12 },
    { header: "건수", key: "count", width: 8 },
    { header: "해당 란 과세가격(원)", key: "tax", width: 20, numFmt: "#,##0" },
    { header: "권고 조치", key: "action", width: 80 },
  ]);
  for (const r of a.ruleSummary) {
    const row = rules.addRow({ severity: r.severity, rule: r.rule, category: r.category, count: r.count, tax: r.taxBaseKrw, action: GUIDE[r.rule]?.action ?? "" });
    severityCell(row, "severity", r.severity);
    row.getCell("action").alignment = { wrapText: true, vertical: "top" };
  }

  const detail = sheet(wb, "검토대상 상세내역", [
    { header: "구분", key: "severity", width: 8 },
    { header: "분야", key: "category", width: 12 },
    { header: "검토항목", key: "rule", width: 26 },
    { header: "신고번호", key: "declarationNo", width: 18 },
    { header: "란", key: "lineNo", width: 6 },
    { header: "HS CODE", key: "hsCode", width: 14 },
    { header: "품명", key: "itemName", width: 34 },
    { header: "주요 확인사항", key: "message", width: 90 },
    { header: "검토 결과(메모)", key: "memo", width: 28 },
    { header: "조치 여부", key: "done", width: 12 },
  ]);
  for (const f of a.findings) {
    const row = detail.addRow({ ...f, memo: "", done: "" });
    severityCell(row, "severity", f.severity);
    row.getCell("message").alignment = { wrapText: true, vertical: "top" };
  }

  const price = sheet(wb, "단가 적정성", [
    { header: "구분", key: "severity", width: 8 },
    { header: "신고번호", key: "declarationNo", width: 18 },
    { header: "란", key: "lineNo", width: 6 },
    { header: "HS CODE", key: "hsCode", width: 14 },
    { header: "규격", key: "name", width: 40 },
    { header: "공급자", key: "supplier", width: 28 },
    { header: "통화", key: "currency", width: 7 },
    { header: "단위", key: "unit", width: 7 },
    { header: "단가(금액÷수량)", key: "unitPrice", width: 16, numFmt: "#,##0.####" },
    { header: "중앙값", key: "median", width: 14, numFmt: "#,##0.####" },
    { header: "배율", key: "ratio", width: 8, numFmt: "0.00" },
    { header: "비교 건수", key: "samples", width: 9 },
    { header: "최저", key: "min", width: 12, numFmt: "#,##0.####" },
    { header: "최고", key: "max", width: 12, numFmt: "#,##0.####" },
    { header: "수량", key: "qty", width: 10, numFmt: "#,##0" },
    { header: "금액", key: "amount", width: 14, numFmt: "#,##0.##" },
    { header: "추정 과세가격 차이(원)", key: "exp", width: 20, numFmt: "#,##0" },
    { header: "검토 결과(메모)", key: "memo", width: 28 },
  ]);
  for (const f of a.price.flags) {
    const row = price.addRow({ ...f, exp: Math.round(f.exposureTaxBaseKrw), memo: "" });
    severityCell(row, "severity", f.severity);
  }

  const gaps = sheet(wb, "공급자 간 단가차이", [
    { header: "규격", key: "name", width: 40 },
    { header: "HS CODE", key: "hsCode", width: 14 },
    { header: "통화/단위", key: "cu", width: 12 },
    { header: "낮은 공급자", key: "lowS", width: 30 },
    { header: "중앙값", key: "lowM", width: 14, numFmt: "#,##0.####" },
    { header: "건수", key: "lowN", width: 7 },
    { header: "높은 공급자", key: "highS", width: 30 },
    { header: "중앙값", key: "highM", width: 14, numFmt: "#,##0.####" },
    { header: "건수", key: "highN", width: 7 },
    { header: "배율", key: "ratio", width: 8, numFmt: "0.0" },
  ]);
  for (const g of a.price.supplierGaps) {
    gaps.addRow({ name: g.name, hsCode: g.hsCode, cu: `${g.currency}/${g.unit}`, lowS: g.low.supplier, lowM: g.low.median, lowN: g.low.n, highS: g.high.supplier, highM: g.high.median, highN: g.high.n, ratio: g.ratio });
  }

  const addon = sheet(wb, "가산요소 점검", [
    { header: "점검", key: "kind", width: 26 },
    { header: "신고번호", key: "declarationNo", width: 18 },
    { header: "신고일", key: "declDate", width: 12 },
    { header: "공급자", key: "supplier", width: 30 },
    { header: "인도조건", key: "incoterm", width: 10 },
    { header: "운임(원)", key: "freightKrw", width: 14, numFmt: "#,##0" },
    { header: "보험료(원)", key: "insuranceKrw", width: 14, numFmt: "#,##0" },
    { header: "가산금(원)", key: "addOnKrw", width: 14, numFmt: "#,##0" },
    { header: "과세가격(원)", key: "taxBaseKrw", width: 16, numFmt: "#,##0" },
  ]);
  for (const [kind, list] of [["FOB 계열·운임 0원", a.price.fobNoFreight], ["FOB 계열·보험료 0원", a.price.fobNoInsurance], ["가산금 신고", a.price.addOns]] as const) {
    for (const d of list) addon.addRow({ kind, ...d });
  }

  const req = sheet(wb, "수입요건 후보", [
    { header: "HS CODE", key: "hsCode", width: 14 },
    { header: "품명", key: "names", width: 44 },
    { header: "품목 구분", key: "product", width: 30 },
    { header: "관련 법령", key: "basis", width: 46 },
    { header: "란 수", key: "lines", width: 8 },
    { header: "과세가격(원)", key: "taxBaseKrw", width: 16, numFmt: "#,##0" },
    { header: "비고", key: "note", width: 40 },
    { header: "요건 구비 확인", key: "confirmed", width: 16 },
  ]);
  for (const c of a.req.candidates) req.addRow({ ...c, confirmed: "" });

  const guide = sheet(wb, "조사 대응 가이드", [
    { header: "검토항목", key: "rule", width: 26 },
    { header: "확인 방법", key: "check", width: 60 },
    { header: "준비 증빙", key: "evidence", width: 56 },
    { header: "권고 조치", key: "action", width: 56 },
    { header: "관련 법령", key: "basis", width: 46 },
  ]);
  for (const [rule, g] of Object.entries(GUIDE)) {
    const row = guide.addRow({ rule, check: g.check, evidence: g.evidence.join("\n"), action: g.action, basis: g.basis });
    row.alignment = { wrapText: true, vertical: "top" };
  }
  guide.addRow([]);
  guide.addRow(["상시 보관 서류 체크리스트"]).font = { bold: true };
  for (const t of GENERAL_READINESS) guide.addRow([`☐ ${t}`]);

  const excluded = sheet(wb, "검증 제외·추가 확인사항", [
    { header: "구분", key: "kind", width: 18 },
    { header: "내용", key: "text", width: 110 },
  ]);
  const exclusions = [
    ...a.skipped.map((text) => ({ kind: "검증 제외", text })),
    { kind: "검증 제외", text: "외환요소(수입대금 지급·수출대금 영수)는 ERP·원장·은행 자료와의 대조가 필요하여 본 보고서에 포함하지 않았습니다." },
    { kind: "추가 검토 필요", text: "품목분류의 정확성은 물품의 성상·기능·용도 및 관련 분류규정에 대한 별도 검토가 필요합니다." },
    { kind: "추가 검토 필요", text: "FTA 협정세율 적용의 적정성은 원산지증명서, 원산지결정기준 충족 여부 및 직접운송요건 등 증빙자료의 검토가 필요합니다." },
    { kind: "추가 검토 필요", text: "과세가격의 적정성은 실제 거래가격, 가산·공제요소, 특수관계 영향 및 계약·회계자료의 검토가 필요합니다." },
    { kind: "추가 검토 필요", text: "수입요건 후보는 세번 기준의 참고 목록이며, 대상 여부는 수출입공고·통합공고와 품목 사양으로 확정해야 합니다." },
  ];
  for (const item of exclusions) {
    const row = excluded.addRow(item);
    row.getCell("text").alignment = { wrapText: true, vertical: "top" };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
