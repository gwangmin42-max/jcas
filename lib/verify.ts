import * as XLSX from "xlsx";

// UNI-PASS 수입신고 내역(란 단위) 엑셀을 읽어, 성실신고 확인 시 전문 검토가 필요한 신고건을 선별한다.
// 오류를 확정하는 도구가 아니라 확인 대상을 좁혀 주는 도구다 (최종 판단은 전문가).

export type Severity = "높음" | "중간" | "참고";
export type Category = "품목분류" | "세율·세액" | "FTA·원산지" | "수입요건" | "과세가격";

export interface Finding {
  rule: string;
  category: Category;
  severity: Severity;
  declarationNo: string;
  lineNo: string;
  hsCode: string;
  itemName: string;
  message: string;
}

export interface LineRow {
  declarationNo: string;
  lineNo: string;
  declDate: string;
  hsCode: string;
  rateType: string;
  itemName: string;
  dutyRate: number;
  dutyAmount: number;
  exemptDuty: number;
  reducedDuty: number;
  exemptionType: string;
  taxBaseKrw: number;
  lineAmount: number;
  quantity: number;
  qtyUnit: string;
  origin: string;
  originCertYn: string;
  originCertNo: string;
  incoterm: string;
  headerFreight: number;
  headerInsurance: number;
  headerLineSum: number;
  currency: string;
}

export interface VerifyResult {
  summary: {
    lineCount: number;
    declarationCount: number;
    dateFrom: string;
    dateTo: string;
    totalTaxBaseKrw: number;
    totalDuty: number;
    findingCount: number;
    byCategory: Record<Category, number>;
    bySeverity: Record<Severity, number>;
  };
  skippedChecks: string[];
  findings: Finding[];
}

export type Raw = Record<string, unknown>;

export const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
export const num = (v: unknown) => {
  if (typeof v === "number") return v;
  const n = Number(str(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

// 열 이름이 파일마다 조금씩 달라도 읽을 수 있게, 공백을 없앤 이름으로 찾는다.
export function makeGetter(row: Raw) {
  const index = new Map<string, string>();
  for (const key of Object.keys(row)) index.set(key.replace(/\s/g, ""), key);
  return (...names: string[]) => {
    for (const name of names) {
      const key = index.get(name.replace(/\s/g, ""));
      if (key !== undefined) return row[key];
    }
    return undefined;
  };
}

export function readRaw(buffer: Buffer): Raw[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("시트를 찾을 수 없습니다");
  const raws = XLSX.utils.sheet_to_json<Raw>(sheet, { defval: "" });
  if (raws.length === 0) throw new Error("데이터가 없습니다");
  return raws;
}

export function readLines(source: Buffer | Raw[]): LineRow[] {
  const raws = Buffer.isBuffer(source) ? readRaw(source) : source;

  const probe = makeGetter(raws[0]);
  if (probe("신고번호") === undefined || probe("세번부호") === undefined) {
    throw new Error("'신고번호', '세번부호' 열을 찾을 수 없습니다. UNI-PASS 수입신고 내역(란 단위) 엑셀인지 확인해 주세요");
  }

  return raws
    .map((raw) => {
      const g = makeGetter(raw);
      return {
        declarationNo: str(g("신고번호")),
        lineNo: str(g("란번호")),
        declDate: str(g("신고일자")),
        hsCode: str(g("세번부호")),
        rateType: str(g("세율구분")),
        itemName: str(g("거래품명", "표준품명")),
        dutyRate: num(g("관세실행세율")),
        dutyAmount: num(g("실제관세액")),
        exemptDuty: num(g("면세관세")),
        reducedDuty: num(g("경감관세")),
        exemptionType: str(g("관세감면구분")),
        taxBaseKrw: num(g("과세가격원화")),
        lineAmount: num(g("란결제금액")),
        quantity: num(g("수량")),
        qtyUnit: str(g("수량단위")),
        origin: str(g("원산지코드")),
        originCertYn: str(g("원산지증명유무")),
        originCertNo: str(g("원산지증명서발급번호")),
        incoterm: str(g("인도조건")),
        headerFreight: num(g("계산된운임원화")) || num(g("입력운임")),
        headerInsurance: num(g("계산된보험료원화")) || num(g("입력보험료")),
        headerLineSum: num(g("란결제금액합계")),
        currency: str(g("결제통화단위")),
      };
    })
    .filter((line) => line.declarationNo)
    // 한 란이 규격 단위로 여러 줄 나오는 파일이 있어, (신고번호, 란번호)당 한 줄만 남긴다.
    .filter((line, i, all) => i === all.findIndex((o) => o.declarationNo === line.declarationNo && o.lineNo === line.lineNo));
}

function normalizeName(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9가-힣]/g, "");
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function groupBy<T>(items: T[], keyOf: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}

const won = (n: number) => `${Math.round(n).toLocaleString()}원`;

export function verifyLines(lines: LineRow[]): VerifyResult {
  const findings: Finding[] = [];
  const skippedChecks: string[] = [];

  const add = (line: LineRow, rule: string, category: Category, severity: Severity, message: string) => {
    findings.push({
      rule,
      category,
      severity,
      declarationNo: line.declarationNo,
      lineNo: line.lineNo,
      hsCode: line.hsCode,
      itemName: line.itemName,
      message,
    });
  };

  // ── 1. 품목분류: 같은 품명인데 세번이 갈리는 경우 ─────────────────────
  for (const [, group] of groupBy(lines.filter((l) => normalizeName(l.itemName)), (l) => normalizeName(l.itemName))) {
    const codes = new Map<string, LineRow[]>();
    for (const l of group) (codes.get(l.hsCode) ?? codes.set(l.hsCode, []).get(l.hsCode)!).push(l);
    if (codes.size < 2) continue;
    const codeList = [...codes.entries()].sort((a, b) => b[1].length - a[1].length);
    const mainCode = codeList[0][0];
    const headings = new Set(codeList.map(([code]) => code.slice(0, 4)));
    const severity: Severity = headings.size > 1 ? "높음" : "중간";
    const summary = codeList.map(([code, ls]) => `${code}(${ls.length}건)`).join(", ");
    for (const [code, ls] of codeList.slice(1)) {
      for (const l of ls) {
        add(l, "동일 품명 세번 불일치", "품목분류", severity, `같은 품명이 서로 다른 세번으로 신고됨: ${summary}. 가장 많이 쓴 세번은 ${mainCode}`);
      }
    }
  }

  // ── 2. 세율: 같은 세번·원산지·세율구분인데 적용세율이 다른 경우 ─────────
  for (const [, group] of groupBy(lines, (l) => `${l.hsCode}|${l.origin}|${l.rateType}`)) {
    const rates = new Map<number, LineRow[]>();
    for (const l of group) (rates.get(l.dutyRate) ?? rates.set(l.dutyRate, []).get(l.dutyRate)!).push(l);
    if (rates.size < 2) continue;
    const rateList = [...rates.entries()].sort((a, b) => b[1].length - a[1].length);
    const summary = rateList.map(([rate, ls]) => `${rate}%(${ls.length}건)`).join(", ");
    for (const [, ls] of rateList.slice(1)) {
      for (const l of ls) {
        add(l, "동일 세번 세율 불일치", "세율·세액", "높음", `세번 ${l.hsCode}, 원산지 ${l.origin}, 세율구분 ${l.rateType}에서 적용세율이 서로 다름: ${summary}`);
      }
    }
  }

  // ── 3. 세액 재계산: 과세가격 × 세율 vs 신고된 관세액 ───────────────────
  for (const l of lines) {
    if (l.exemptionType || l.exemptDuty || l.reducedDuty) continue; // 감면 건은 계산 구조가 달라 제외
    const expected = Math.floor((l.taxBaseKrw * l.dutyRate) / 100);
    const diff = l.dutyAmount - expected;
    if (Math.abs(diff) > 10) {
      add(l, "관세액 재계산 불일치", "세율·세액", "높음", `과세가격 ${won(l.taxBaseKrw)} × 세율 ${l.dutyRate}% = ${won(expected)}인데 신고 관세액은 ${won(l.dutyAmount)} (차이 ${won(diff)})`);
    }
  }

  // ── 4. FTA·원산지 ────────────────────────────────────────────────────
  const ftaLines = lines.filter((l) => /^F[A-Z]{2}\d?/.test(l.rateType));
  const certNoFilled = lines.some((l) => l.originCertNo);
  if (!certNoFilled && ftaLines.length > 0) {
    skippedChecks.push("원산지증명서 발급번호 열이 전부 비어 있어, FTA 적용 건의 증명서 번호 누락 검사는 하지 못했습니다 (세관 전송 자료에 발급번호가 없는 파일입니다)");
  }
  for (const l of ftaLines) {
    const partner = l.rateType.slice(1, 3);
    if (l.originCertYn === "N") {
      add(l, "FTA 세율인데 원산지증명 없음", "FTA·원산지", "높음", `세율구분 ${l.rateType}(FTA)인데 원산지증명유무가 N`);
    }
    const isCountryCode = !["EU", "AS", "EF"].includes(partner);
    if (isCountryCode && l.origin && l.origin !== partner) {
      add(l, "FTA 상대국과 원산지 불일치", "FTA·원산지", "높음", `세율구분 ${l.rateType}은 ${partner}산에 적용되는데 원산지코드는 ${l.origin}`);
    }
    if (certNoFilled && !l.originCertNo) {
      add(l, "FTA 원산지증명서 번호 누락", "FTA·원산지", "중간", `세율구분 ${l.rateType}(FTA)인데 원산지증명서 발급번호가 비어 있음`);
    }
  }
  // 같은 세번·원산지 품목을 어떤 때는 FTA, 어떤 때는 일반세율로 신고
  for (const [, group] of groupBy(lines, (l) => `${l.hsCode}|${l.origin}`)) {
    const fta = group.filter((l) => /^F[A-Z]{2}\d?/.test(l.rateType));
    const non = group.filter((l) => !/^F[A-Z]{2}\d?/.test(l.rateType) && l.dutyRate > 0);
    if (fta.length === 0 || non.length === 0) continue;
    for (const l of non) {
      add(l, "FTA 적용 혼재", "FTA·원산지", "중간", `세번 ${l.hsCode}, 원산지 ${l.origin}: 같은 품목이 FTA 적용 ${fta.length}건 / 일반세율(${l.rateType}) ${non.length}건으로 섞여 신고됨. 협정세율 적용 누락 여부 확인`);
    }
  }

  // ── 5. 과세가격 ──────────────────────────────────────────────────────
  // (a) 운임·보험료를 더해야 하는 인도조건인데 신고에 운임이 0
  const seenDeclarations = new Set<string>();
  for (const l of lines) {
    if (seenDeclarations.has(l.declarationNo)) continue;
    seenDeclarations.add(l.declarationNo);
    if (["FOB", "EXW", "FCA", "FAS"].includes(l.incoterm.toUpperCase()) && l.headerFreight === 0) {
      add(l, "운임 가산 여부 검토", "과세가격", "높음", `인도조건 ${l.incoterm}이나 신고서에 운임이 0원으로 기재됨 — 과세가격에 가산할 운임의 반영 여부 검토 필요`);
    }
  }
  // (b) 신고서 전체 결제금액과 란 합계가 어긋남
  for (const [, group] of groupBy(lines, (l) => l.declarationNo)) {
    const head = group[0];
    if (!head.headerLineSum) continue;
    const sum = group.reduce((acc, l) => acc + l.lineAmount, 0);
    if (Math.abs(sum - head.headerLineSum) > 1) {
      add(head, "란 금액 합계 불일치", "과세가격", "중간", `란별 결제금액 합계 ${sum.toLocaleString()} ≠ 신고서 란결제금액합계 ${head.headerLineSum.toLocaleString()}`);
    }
  }
  // (c) 같은 세번·품명 단가가 중앙값에서 크게 벗어남 (수량이 있는 란만)
  const priced = lines.filter((l) => l.quantity > 0 && l.taxBaseKrw > 0);
  if (priced.length < lines.length * 0.2) {
    skippedChecks.push(`수량이 있는 란이 ${priced.length}건뿐이라 단가 이상치 검사는 일부 품목에서만 수행했습니다`);
  }
  for (const [, group] of groupBy(priced, (l) => `${l.hsCode}|${normalizeName(l.itemName)}|${l.qtyUnit}`)) {
    if (group.length < 3) continue;
    const unit = group.map((l) => l.taxBaseKrw / l.quantity);
    const mid = median(unit);
    if (mid <= 0) continue;
    group.forEach((l, i) => {
      const ratio = unit[i] / mid;
      if (ratio >= 3 || ratio <= 1 / 3) {
        add(l, "단가 이상치", "과세가격", "중간", `단가 ${won(unit[i])}/${l.qtyUnit || "단위"}가 같은 품목(동일 세번·품명·단위)의 단가를 작은 순으로 세웠을 때 가운데 값(중앙값) ${won(mid)}의 ${ratio.toFixed(1)}배 (${group.length}건 비교)`);
      }
    });
  }

  const severityOrder: Record<Severity, number> = { 높음: 0, 중간: 1, 참고: 2 };
  findings.sort(
    (a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] ||
      a.declarationNo.localeCompare(b.declarationNo) ||
      a.lineNo.localeCompare(b.lineNo)
  );

  const byCategory: Record<Category, number> = { 품목분류: 0, "세율·세액": 0, "FTA·원산지": 0, 수입요건: 0, 과세가격: 0 };
  const bySeverity: Record<Severity, number> = { 높음: 0, 중간: 0, 참고: 0 };
  for (const f of findings) {
    byCategory[f.category]++;
    bySeverity[f.severity]++;
  }
  const dates = lines.map((l) => l.declDate).filter(Boolean).sort();

  return {
    summary: {
      lineCount: lines.length,
      declarationCount: new Set(lines.map((l) => l.declarationNo)).size,
      dateFrom: dates[0] ?? "",
      dateTo: dates[dates.length - 1] ?? "",
      totalTaxBaseKrw: lines.reduce((acc, l) => acc + l.taxBaseKrw, 0),
      totalDuty: lines.reduce((acc, l) => acc + l.dutyAmount, 0),
      findingCount: findings.length,
      byCategory,
      bySeverity,
    },
    skippedChecks,
    findings,
  };
}
