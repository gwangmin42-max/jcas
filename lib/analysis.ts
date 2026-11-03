import { makeGetter, num, readLines, readRaw, str, verifyLines, type Category, type Finding, type LineRow, type Raw, type Severity, type VerifyResult } from "./verify";
import { matchRequirement } from "./importRequirements";

// 과세가격 분야(품목분류 · 수입요건 · 과세가격) 분석. 외환요소 분야는 회계·은행 자료를 받은 뒤 별도로 추가한다.

export interface SpecRow {
  declarationNo: string;
  lineNo: string;
  declDate: string;
  hsCode: string;
  itemName: string;
  spec: string;
  qty: number;
  unit: string;
  unitPrice: number; // 금액 ÷ 수량 (실제 결제 기준 단가)
  declaredUnitPrice: number; // 파일에 적힌 단가
  amount: number;
  currency: string;
  supplier: string;
  incoterm: string;
}

export interface CalcMismatch {
  declarationNo: string;
  lineNo: string;
  name: string;
  qty: number;
  unit: string;
  declaredUnitPrice: number;
  amount: number;
  impliedUnitPrice: number;
  currency: string;
  diffPct: number;
}

export interface DeclHeader {
  declarationNo: string;
  declDate: string;
  supplier: string;
  incoterm: string;
  tradeType: string;
  payMethod: string;
  priceDecl: string;
  currency: string;
  freightKrw: number;
  insuranceKrw: number;
  addOnKrw: number;
  taxBaseKrw: number;
  dutyKrw: number;
  lineCount: number;
}

export interface HsTop {
  hsCode: string;
  name: string;
  lines: number;
  taxBaseKrw: number;
  dutyKrw: number;
  rates: string;
  origins: string;
}

export interface Dist {
  label: string;
  count: number;
  taxBaseKrw: number;
  dutyKrw?: number;
}

export interface ReqCandidate {
  hsCode: string;
  names: string;
  lines: number;
  taxBaseKrw: number;
  product: string;
  basis: string;
  note: string;
}

export interface PriceFlag {
  severity: "높음" | "중간";
  declarationNo: string;
  lineNo: string;
  hsCode: string;
  name: string;
  currency: string;
  unit: string;
  unitPrice: number;
  median: number;
  ratio: number;
  qty: number;
  amount: number;
  samples: number;
  supplier: string;
  min: number;
  max: number;
  peers: { declarationNo: string; unitPrice: number }[];
  exposureTaxBaseKrw: number; // 단가가 중앙값보다 낮은 건만: (중앙값 - 단가) × 수량을 원화로 환산한 과세가격 차이 추정
  exposureDutyKrw: number; // 위 금액 × 해당 란 관세율
}

export interface RuleSummary {
  rule: string;
  category: Category;
  severity: Severity; // 해당 항목 중 가장 높은 구분
  count: number;
  taxBaseKrw: number; // 해당 란들의 과세가격 합계
}

export interface SupplierGap {
  name: string;
  hsCode: string;
  unit: string;
  currency: string;
  low: { supplier: string; median: number; n: number };
  high: { supplier: string; median: number; n: number };
  ratio: number;
}

export interface Analysis {
  summary: VerifyResult["summary"];
  ruleSummary: RuleSummary[];
  exposure: { lines: number; taxBaseKrw: number; dutyKrw: number };
  grade: { label: string; note: string };
  meta: {
    sourceName: string;
    generatedAt: string;
    dateFrom: string;
    dateTo: string;
    declCount: number;
    lineCount: number;
    specCount: number;
    supplierCount: number;
    totalTaxBaseKrw: number;
    totalDutyKrw: number;
  };
  hs: {
    top: HsTop[];
    headingDist: Dist[];
    rateTypeDist: Dist[];
    originDist: Dist[];
    multiCode: Finding[];
    rateMismatch: Finding[];
    ftaMixed: Finding[];
    ftaOriginMismatch: Finding[];
    distinctCodes: number;
  };
  req: {
    candidates: ReqCandidate[];
    coveredLines: number;
    docCountFilled: number;
    docAttachedYes: number;
    attachedDocValues: Dist[];
  };
  price: {
    incotermDist: Dist[];
    tradeTypeDist: Dist[];
    payMethodDist: Dist[];
    priceDeclNoCount: number;
    priceDeclNoTaxBase: number;
    fobNoFreight: DeclHeader[];
    fobNoInsurance: DeclHeader[];
    addOns: DeclHeader[];
    groupsAnalyzed: number;
    groupsEligible: number;
    coveragePct: number;
    flags: PriceFlag[];
    flagTotal: number;
    calcMismatch: CalcMismatch[];
    calcMismatchTotal: number;
    microLines: number;
    supplierGaps: SupplierGap[];
    supplierDist: Dist[];
    monthly: Dist[];
  };
  findings: Finding[];
  skipped: string[];
}

const FOB_LIKE = ["FOB", "EXW", "FCA", "FAS"];

function normalize(text: string) {
  return text.toUpperCase().replace(/[^A-Z0-9가-힣]/g, "");
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

function dist<T>(items: T[], labelOf: (item: T) => string, taxOf: (item: T) => number, dutyOf?: (item: T) => number): Dist[] {
  const out: Dist[] = [];
  for (const [label, group] of groupBy(items, labelOf)) {
    out.push({
      label: label || "(없음)",
      count: group.length,
      taxBaseKrw: group.reduce((a, g) => a + taxOf(g), 0),
      dutyKrw: dutyOf ? group.reduce((a, g) => a + dutyOf(g), 0) : undefined,
    });
  }
  return out.sort((a, b) => b.taxBaseKrw - a.taxBaseKrw);
}

export function analyze(buffer: Buffer, sourceName: string): Analysis {
  const raws = readRaw(buffer);
  const lines = readLines(raws);
  const verify = verifyLines(lines);
  const skipped = [...verify.skippedChecks];
  const lineByKey = new Map(lines.map((l) => [`${l.declarationNo}|${l.lineNo}`, l]));

  // 규격(송장 품목) 단위 행: 수입단가 분석의 기본 단위
  const specs: SpecRow[] = raws
    .map((raw) => {
      const g = makeGetter(raw);
      return {
        declarationNo: str(g("신고번호")),
        lineNo: str(g("란번호")),
        declDate: str(g("신고일자")),
        hsCode: str(g("세번부호")),
        itemName: str(g("거래품명", "표준품명")),
        spec: str(g("규격1")),
        qty: num(g("수량_1")),
        unit: str(g("수량단위_1")),
        unitPrice: 0,
        declaredUnitPrice: num(g("단가")),
        amount: num(g("금액")),
        currency: str(g("결제통화단위")),
        supplier: str(g("무역거래처상호", "해외공급자상호")),
        incoterm: str(g("인도조건")),
      };
    })
    .filter((s) => s.declarationNo)
    .map((s) => ({ ...s, unitPrice: s.qty > 0 && s.amount > 0 ? s.amount / s.qty : 0 }));

  const headerOf = new Map<string, Raw>();
  for (const raw of raws) {
    const no = str(makeGetter(raw)("신고번호"));
    if (no && !headerOf.has(no)) headerOf.set(no, raw);
  }
  const linesByDecl = groupBy(lines, (l) => l.declarationNo);
  const decls: DeclHeader[] = [...headerOf.entries()].map(([no, raw]) => {
    const g = makeGetter(raw);
    const ls = linesByDecl.get(no) ?? [];
    return {
      declarationNo: no,
      declDate: str(g("신고일자")),
      supplier: str(g("무역거래처상호", "해외공급자상호")),
      incoterm: str(g("인도조건")),
      tradeType: str(g("거래구분")),
      payMethod: str(g("결제방법")),
      priceDecl: str(g("가격신고서유무")),
      currency: str(g("결제통화단위")),
      freightKrw: num(g("계산된운임원화")) || num(g("입력운임")),
      insuranceKrw: num(g("계산된보험료원화")) || num(g("입력보험료")),
      addOnKrw: num(g("전체계산된가산금원화")) || num(g("입력가산금")),
      taxBaseKrw: ls.reduce((a, l) => a + l.taxBaseKrw, 0),
      dutyKrw: ls.reduce((a, l) => a + l.dutyAmount, 0),
      lineCount: ls.length,
    };
  });

  // ── 품목분류(HS) ─────────────────────────────────────────────────────
  const top: HsTop[] = [...groupBy(lines, (l) => l.hsCode)].map(([hsCode, group]) => ({
    hsCode,
    name: [...groupBy(group, (l) => l.itemName)].sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? "",
    lines: group.length,
    taxBaseKrw: group.reduce((a, l) => a + l.taxBaseKrw, 0),
    dutyKrw: group.reduce((a, l) => a + l.dutyAmount, 0),
    rates: [...new Set(group.map((l) => `${l.dutyRate}%`))].join(", "),
    origins: [...new Set(group.map((l) => l.origin))].join(", "),
  })).sort((a, b) => b.taxBaseKrw - a.taxBaseKrw);

  const byRule = (rule: string) => verify.findings.filter((f) => f.rule === rule);

  // ── 수입요건 ─────────────────────────────────────────────────────────
  const candidateMap = new Map<string, ReqCandidate>();
  for (const l of lines) {
    const rule = matchRequirement(l.hsCode);
    if (!rule) continue;
    const prev = candidateMap.get(l.hsCode);
    if (prev) {
      prev.lines++;
      prev.taxBaseKrw += l.taxBaseKrw;
      if (!prev.names.includes(l.itemName)) prev.names += `, ${l.itemName}`;
    } else {
      candidateMap.set(l.hsCode, { hsCode: l.hsCode, names: l.itemName, lines: 1, taxBaseKrw: l.taxBaseKrw, product: rule.product, basis: rule.basis, note: rule.note });
    }
  }
  const headerGet = raws.map((r) => makeGetter(r));
  const docCountFilled = headerGet.filter((g) => num(g("요건확인서류수")) > 0).length;
  const docAttachedYes = headerGet.filter((g) => str(g("서류첨부여부")).toUpperCase() === "Y").length;
  const attachedDocValues = dist(
    raws.map((_, i) => str(headerGet[i]("첨부서류"))),
    (v) => v,
    () => 0
  ).map((d) => ({ ...d, count: d.count }));
  if (docCountFilled === 0) {
    skipped.push("요건확인서류수가 모두 비어 있고 서류첨부 여부도 전부 'N'이어서, 요건확인서류의 실제 첨부·누락 여부는 판정하지 못했습니다. 세번 기준 후보만 제시합니다");
  }

  // ── 과세가격 ─────────────────────────────────────────────────────────
  const fobNoFreight = decls.filter((d) => FOB_LIKE.includes(d.incoterm.toUpperCase()) && d.freightKrw === 0);
  const fobNoInsurance = decls.filter((d) => FOB_LIKE.includes(d.incoterm.toUpperCase()) && d.insuranceKrw === 0);
  const addOns = decls.filter((d) => d.addOnKrw > 0);
  const priceDeclNo = decls.filter((d) => d.priceDecl.toUpperCase() === "N");

  // 금액이 1 미만인 행은 샘플·무상 성격이어서 단가 비교에서 제외한다
  const microLines = specs.filter((s) => s.amount > 0 && s.amount < 1).length;
  const calcMismatchAll: CalcMismatch[] = specs
    .filter((s) => s.qty > 0 && s.declaredUnitPrice > 0 && s.amount >= 1)
    .map((s) => ({
      declarationNo: s.declarationNo,
      lineNo: s.lineNo,
      name: s.spec || s.itemName,
      qty: s.qty,
      unit: s.unit,
      declaredUnitPrice: s.declaredUnitPrice,
      amount: s.amount,
      impliedUnitPrice: s.unitPrice,
      currency: s.currency,
      diffPct: (Math.abs(s.declaredUnitPrice * s.qty - s.amount) / s.amount) * 100,
    }))
    .filter((m) => m.diffPct > 2)
    .sort((a, b) => b.amount - a.amount);

  const groups = [...groupBy(
    specs.filter((s) => s.unitPrice > 0 && s.qty > 0 && s.amount >= 1),
    (s) => `${s.hsCode}|${normalize(s.spec || s.itemName)}|${s.unit}|${s.currency}`
  )].map(([, items]) => items);
  const eligible = groups.filter((items) => items.length >= 3 && new Set(items.map((i) => i.declarationNo)).size >= 2);
  const totalAmountAll = specs.reduce((a, s) => a + s.amount, 0);
  const coveredAmount = eligible.flat().reduce((a, s) => a + s.amount, 0);

  const allFlags: PriceFlag[] = [];
  for (const items of eligible) {
    const med = median(items.map((i) => i.unitPrice));
    if (med <= 0) continue;
    const prices = items.map((i) => i.unitPrice);
    for (const item of items) {
      const ratio = item.unitPrice / med;
      const extreme = Math.max(ratio, 1 / ratio);
      if (extreme < 2) continue;
      const line = lineByKey.get(`${item.declarationNo}|${item.lineNo}`);
      const rate = line && line.lineAmount > 0 && line.taxBaseKrw > 0 ? line.taxBaseKrw / line.lineAmount : 0;
      // 추정 차이는 해당 란 과세가격을 넘을 수 없다. 그룹 내 단가 폭이 50배를 넘으면 규격 구분이 불명확한 것으로 보고 추정에서 제외한다
      const wide = Math.min(...prices) > 0 && Math.max(...prices) / Math.min(...prices) > 50;
      const exposureTaxBaseKrw = ratio < 1 && !wide ? Math.min((med - item.unitPrice) * item.qty * rate, line?.taxBaseKrw ?? 0) : 0;
      allFlags.push({
        min: Math.min(...prices),
        max: Math.max(...prices),
        peers: items.filter((o) => o !== item).slice(0, 4).map((o) => ({ declarationNo: o.declarationNo, unitPrice: o.unitPrice })),
        exposureTaxBaseKrw,
        exposureDutyKrw: line ? (exposureTaxBaseKrw * line.dutyRate) / 100 : 0,
        severity: extreme >= 3 && !wide ? "높음" : "중간",
        declarationNo: item.declarationNo,
        lineNo: item.lineNo,
        hsCode: item.hsCode,
        name: item.spec || item.itemName,
        currency: item.currency,
        unit: item.unit,
        unitPrice: item.unitPrice,
        median: med,
        ratio,
        qty: item.qty,
        amount: item.amount,
        samples: items.length,
        supplier: item.supplier,
      });
    }
  }
  // 우선 검토(높음) 먼저, 같은 구분에서는 추정 과세가격 차이가 큰 순, 그다음 이격이 큰 순
  allFlags.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "높음" ? -1 : 1) || b.exposureTaxBaseKrw - a.exposureTaxBaseKrw || Math.max(b.ratio, 1 / b.ratio) - Math.max(a.ratio, 1 / a.ratio));

  // 같은 규격을 서로 다른 공급자에게서 들여온 경우 공급자 간 단가 차이
  const supplierGaps: SupplierGap[] = [];
  for (const items of groups) {
    const bySupplier = [...groupBy(items, (i) => i.supplier)].filter(([, v]) => v.length >= 2);
    if (bySupplier.length < 2) continue;
    const meds = bySupplier.map(([supplier, v]) => ({ supplier, median: median(v.map((i) => i.unitPrice)), n: v.length })).sort((a, b) => a.median - b.median);
    const low = meds[0];
    const high = meds[meds.length - 1];
    if (low.median <= 0) continue;
    const ratio = high.median / low.median;
    if (ratio >= 1.5) {
      supplierGaps.push({
        name: items[0].spec || items[0].itemName,
        hsCode: items[0].hsCode,
        unit: items[0].unit,
        currency: items[0].currency,
        low,
        high,
        ratio,
      });
    }
  }
  supplierGaps.sort((a, b) => b.ratio - a.ratio);

  const dates = lines.map((l) => l.declDate).filter(Boolean).sort();
  const lineTax = (l: LineRow) => l.taxBaseKrw;

  // ── 종합: 기본 검증 결과 + 규격 단위 분석 결과를 하나의 검토목록으로 합친다 ──
  const fmt = (n: number) => Math.round(n).toLocaleString();
  const fp = (n: number) => (n >= 100 ? fmt(n) : String(Number(n.toPrecision(4))));
  const firstLineOf = (declarationNo: string) => linesByDecl.get(declarationNo)?.[0];
  const extra: Finding[] = [];
  for (const f of allFlags) {
    const low = f.ratio < 1;
    const line = lineByKey.get(`${f.declarationNo}|${f.lineNo}`);
    extra.push({
      rule: "단가 적정성",
      category: "과세가격",
      severity: f.severity,
      declarationNo: f.declarationNo,
      lineNo: f.lineNo,
      hsCode: f.hsCode,
      itemName: line?.itemName ?? f.name,
      message: `규격 '${f.name}' 단가 ${fp(f.unitPrice)} ${f.currency}/${f.unit}가 동일 세번·규격·단위 ${f.samples}건의 중앙값(가운데 값) ${fp(f.median)}의 ${f.ratio.toFixed(2)}배 (범위 ${fp(f.min)}~${fp(f.max)})${f.min > 0 && f.max / f.min > 50 ? ". 그룹 내 단가 폭이 매우 커 규격·수량단위 구분 확인 필요" : ""}${low && f.exposureTaxBaseKrw > 0 ? `. 중앙값 기준 추정 과세가격 차이 약 ${fmt(f.exposureTaxBaseKrw)}원` : ""}`,
    });
  }
  for (const m of calcMismatchAll) {
    const line = lineByKey.get(`${m.declarationNo}|${m.lineNo}`);
    extra.push({
      rule: "단가·수량·금액 산식 불일치",
      category: "과세가격",
      severity: "참고",
      declarationNo: m.declarationNo,
      lineNo: m.lineNo,
      hsCode: line?.hsCode ?? "",
      itemName: line?.itemName ?? m.name,
      message: `'${m.name}' 신고 단가 ${m.declaredUnitPrice} × 수량 ${m.qty} ≠ 금액 ${fmt(m.amount)} (금액÷수량 = ${m.impliedUnitPrice.toFixed(4)}, 차이 ${m.diffPct.toFixed(1)}%)`,
    });
  }
  for (const d of fobNoInsurance) {
    const line = firstLineOf(d.declarationNo);
    extra.push({
      rule: "보험료 가산 여부",
      category: "과세가격",
      severity: "참고",
      declarationNo: d.declarationNo,
      lineNo: line?.lineNo ?? "",
      hsCode: line?.hsCode ?? "",
      itemName: line?.itemName ?? "",
      message: `인도조건 ${d.incoterm}이나 보험료가 0원으로 기재됨 — 구매자 부보 여부 확인 필요`,
    });
  }
  for (const c of [...candidateMap.values()]) {
    extra.push({
      rule: "수입요건 확인 후보",
      category: "수입요건",
      severity: "참고",
      declarationNo: "",
      lineNo: "",
      hsCode: c.hsCode,
      itemName: c.names,
      message: `${c.product} (${c.basis}) — ${c.note}. 해당 세번 ${c.lines}란, 과세가격 ${fmt(c.taxBaseKrw)}원`,
    });
  }
  // 기본 검증의 '단가 이상치'(과세가격 ÷ 수량)는 규격 단위 '단가 적정성'로 대체한다
  const severityOrder: Record<Severity, number> = { 높음: 0, 중간: 1, 참고: 2 };
  const findings = [...verify.findings.filter((f) => f.rule !== "단가 이상치"), ...extra].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.declarationNo.localeCompare(b.declarationNo) || a.lineNo.localeCompare(b.lineNo)
  );

  const declTax = new Map(decls.map((d) => [d.declarationNo, d.taxBaseKrw]));
  const taxOfFinding = (f: Finding) => (f.lineNo ? lineByKey.get(`${f.declarationNo}|${f.lineNo}`)?.taxBaseKrw ?? 0 : declTax.get(f.declarationNo) ?? 0);
  const ruleMap = new Map<string, RuleSummary>();
  const byCategory: Record<Category, number> = { 품목분류: 0, "세율·세액": 0, "FTA·원산지": 0, 수입요건: 0, 과세가격: 0 };
  const bySeverity: Record<Severity, number> = { 높음: 0, 중간: 0, 참고: 0 };
  for (const f of findings) {
    byCategory[f.category]++;
    bySeverity[f.severity]++;
    const cur = ruleMap.get(f.rule);
    if (cur) {
      cur.count++;
      cur.taxBaseKrw += taxOfFinding(f);
      if (severityOrder[f.severity] < severityOrder[cur.severity]) cur.severity = f.severity;
    } else {
      ruleMap.set(f.rule, { rule: f.rule, category: f.category, severity: f.severity, count: 1, taxBaseKrw: taxOfFinding(f) });
    }
  }
  const ruleSummary = [...ruleMap.values()].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.count - a.count);

  const lowFlags = allFlags.filter((f) => f.exposureTaxBaseKrw > 0);
  const exposure = {
    lines: lowFlags.length,
    taxBaseKrw: lowFlags.reduce((a, f) => a + f.exposureTaxBaseKrw, 0),
    dutyKrw: lowFlags.reduce((a, f) => a + f.exposureDutyKrw, 0),
  };

  const highShare = lines.length > 0 ? bySeverity.높음 / lines.length : 0;
  const grade =
    bySeverity.높음 === 0
      ? { label: "양호", note: "우선 검토 대상으로 분류된 항목이 확인되지 않았습니다." }
      : highShare <= 0.01
        ? { label: "보통", note: "우선 검토 항목이 소수에 그치며, 개별 건 확인으로 대응 가능한 수준입니다." }
        : highShare <= 0.05
          ? { label: "주의", note: "우선 검토 항목이 일정 비중으로 확인되어, 증빙 정리와 신고 정정 여부 검토가 필요합니다." }
          : { label: "중점 검토", note: "우선 검토 항목의 비중이 높아, 관세조사 전 전반적인 신고 내용 점검이 필요합니다." };

  return {
    summary: {
      lineCount: lines.length,
      declarationCount: decls.length,
      dateFrom: dates[0] ?? "",
      dateTo: dates[dates.length - 1] ?? "",
      totalTaxBaseKrw: lines.reduce((a, l) => a + l.taxBaseKrw, 0),
      totalDuty: lines.reduce((a, l) => a + l.dutyAmount, 0),
      findingCount: findings.length,
      byCategory,
      bySeverity,
    },
    ruleSummary,
    exposure,
    grade,
    meta: {
      sourceName,
      generatedAt: new Date().toISOString(),
      dateFrom: dates[0] ?? "",
      dateTo: dates[dates.length - 1] ?? "",
      declCount: decls.length,
      lineCount: lines.length,
      specCount: specs.length,
      supplierCount: new Set(decls.map((d) => d.supplier)).size,
      totalTaxBaseKrw: lines.reduce((a, l) => a + l.taxBaseKrw, 0),
      totalDutyKrw: lines.reduce((a, l) => a + l.dutyAmount, 0),
    },
    hs: {
      top,
      headingDist: dist(lines, (l) => l.hsCode.slice(0, 4), lineTax, (l) => l.dutyAmount),
      rateTypeDist: dist(lines, (l) => l.rateType, lineTax, (l) => l.dutyAmount),
      originDist: dist(lines, (l) => l.origin, lineTax, (l) => l.dutyAmount),
      multiCode: byRule("동일 품명 세번 불일치"),
      rateMismatch: byRule("동일 세번 세율 불일치"),
      ftaMixed: byRule("FTA 적용 혼재"),
      ftaOriginMismatch: byRule("FTA 상대국과 원산지 불일치"),
      distinctCodes: top.length,
    },
    req: {
      candidates: [...candidateMap.values()].sort((a, b) => b.taxBaseKrw - a.taxBaseKrw),
      coveredLines: [...candidateMap.values()].reduce((a, c) => a + c.lines, 0),
      docCountFilled,
      docAttachedYes,
      attachedDocValues,
    },
    price: {
      incotermDist: dist(decls, (d) => d.incoterm, (d) => d.taxBaseKrw),
      tradeTypeDist: dist(decls, (d) => d.tradeType, (d) => d.taxBaseKrw),
      payMethodDist: dist(decls, (d) => d.payMethod, (d) => d.taxBaseKrw),
      priceDeclNoCount: priceDeclNo.length,
      priceDeclNoTaxBase: priceDeclNo.reduce((a, d) => a + d.taxBaseKrw, 0),
      fobNoFreight,
      fobNoInsurance,
      addOns,
      groupsAnalyzed: groups.length,
      groupsEligible: eligible.length,
      coveragePct: totalAmountAll > 0 ? (coveredAmount / totalAmountAll) * 100 : 0,
      flags: allFlags.slice(0, 200),
      flagTotal: allFlags.length,
      calcMismatch: calcMismatchAll.slice(0, 100),
      calcMismatchTotal: calcMismatchAll.length,
      microLines,
      supplierGaps: supplierGaps.slice(0, 50),
      supplierDist: dist(decls, (d) => d.supplier, (d) => d.taxBaseKrw),
      monthly: dist(decls, (d) => d.declDate.slice(0, 6), (d) => d.taxBaseKrw).sort((a, b) => a.label.localeCompare(b.label)),
    },
    findings,
    skipped,
  };
}

// 분야별 지적 건수 (보고서 요약용)
export function countByArea(a: Analysis) {
  return {
    hs: a.hs.multiCode.length + a.hs.rateMismatch.length + a.hs.ftaMixed.length + a.hs.ftaOriginMismatch.length,
    req: a.req.candidates.length,
    price: a.price.flagTotal + a.price.calcMismatchTotal + a.price.fobNoFreight.length + a.price.fobNoInsurance.length + a.price.supplierGaps.length,
  };
}
