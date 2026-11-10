import type { Analysis } from "./analysis";
import { GUIDE } from "./guidance";

// 분석 결과(수치)를 근거로 '주의가 필요한 부분'과 '소명자료 대비' 문구를 작성한다.
// 솔루엠 사전진단 보고서 체계(❍ 확인 사실 · 구체 사례 → 판단·소명 필요)를 따르며,
// 모든 문장은 이번 신고 자료의 건수·공급자·품목에서 만든다. 법적 판단이 아닌 사전 점검 의견이다.

const n = (v: number) => Math.round(v).toLocaleString();
const eok = (v: number) => (v >= 100000000 ? `${(v / 100000000).toFixed(1)}억원` : `${n(v)}원`);
const fp = (v: number) => (v >= 100 ? n(v) : String(Number(v.toPrecision(4))));

function top<T>(items: T[], keyOf: (t: T) => string, k: number) {
  const m = new Map<string, number>();
  for (const it of items) m.set(keyOf(it), (m.get(keyOf(it)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k);
}
const listText = (rows: [string, number][], unit = "건") => rows.map(([k, c]) => `${k}(${c}${unit})`).join(", ");

export interface Opinion {
  rule: string;
  severity: string;
  facts: string[]; // 확인 사실·구체 사례 (· 줄)
  judgement: string; // 판단·소명 필요 (→ 줄)
  prepare: string[]; // 소명자료 대비
}

function priceUnit(a: Analysis): Opinion | null {
  const p = a.price;
  if (p.flagTotal === 0) return null;
  const high = p.flags.filter((f) => f.severity === "높음");
  const sup = top(p.flags, (f) => f.supplier, 3);
  const items = top(p.flags, (f) => f.name, 4);
  const facts: string[] = [
    `동일 세번·규격·단위·통화 품목의 중앙값 대비 2배 이상 또는 1/2 이하인 단가 ${n(p.flagTotal)}건 (3배 이상 ${n(high.length)}건)`,
  ];
  facts.push(sup.length === 1 ? `전부 ${sup[0][0]}의 신고 건이며 품목은 ${listText(items)} 등` : `공급자별 ${listText(sup)}, 품목은 ${listText(items)} 등`);
  // 같은 품명이 반복되지 않도록 편차 큰 순으로 사례 3건
  const seen = new Set<string>();
  const cases = [...p.flags]
    .sort((x, y) => y.ratio - x.ratio)
    .filter((f) => (seen.has(f.name) ? false : (seen.add(f.name), true)))
    .slice(0, 3);
  for (const f of cases) {
    facts.push(`${sup.length === 1 ? "" : f.supplier + "로부터 수입하는 "}${f.name}(${f.hsCode})의 단가 ${fp(f.unitPrice)} ${f.currency}/${f.unit}, 동종 ${f.samples}건 중앙값 ${fp(f.median)} 대비 ${f.ratio.toFixed(1)}배 (${f.declarationNo}-${f.lineNo})`);
  }
  if (a.exposure.lines > 0)
    facts.push(`중앙값보다 낮은 ${n(a.exposure.lines)}개 란을 중앙값 단가로 환산하면 과세가격 약 ${eok(a.exposure.taxBaseKrw)}, 관세 약 ${eok(a.exposure.dutyKrw)} 차이로 추정`);
  const g = a.detail.gratis;
  if (g.length > 0 && a.meta.declCount > 0)
    facts.push(`결제방법 GN 또는 일반수입이 아닌 무상 성격 신고 ${n(g.length)}건 (전체 신고 ${n(a.meta.declCount)}건 중 ${((g.length / a.meta.declCount) * 100).toFixed(0)}%) — 무상물품도 동종·동질물품 가격 기준으로 신고되어야 함`);
  return {
    rule: "단가 적정성",
    severity: high.length ? "높음" : "중간",
    facts,
    judgement: "동일 모델의 단가가 크게 벌어진 건은 합리적인 변경사유(수량단위, 규격·등급, 계약 변경)가 없으면 저가신고로 지적받을 수 있어 건별 소명 필요. 규격·단위가 다른 물품이 같은 그룹으로 묶였을 가능성도 있어 확정적 저가신고는 아님",
    prepare: [
      `${sup[0] ? sup[0][0] : "해당 공급자"} 상업송장·PO·단가표(Price List)로 단가 편차 사유 정리`,
      "편차가 큰 건의 수량단위·규격·등급을 송장 기준으로 대조하고, 입력 오류는 정정 여부 판단",
      "대금 지급 증빙(송금 내역)과 할인·리베이트·사후정산 약정",
      "특수관계 여부 및 가격 결정 방법 설명자료",
    ],
  };
}

function calcMismatch(a: Analysis): Opinion | null {
  const p = a.price;
  if (p.calcMismatchTotal === 0) return null;
  const worst = [...p.calcMismatch].sort((x, y) => y.diffPct - x.diffPct)[0];
  const facts = [`신고 단가 × 수량이 금액과 2% 넘게 다른 행 ${n(p.calcMismatchTotal)}건`];
  if (worst) facts.push(`${worst.name} (${worst.declarationNo}-${worst.lineNo}): 신고 단가 ${fp(worst.declaredUnitPrice)} vs 금액÷수량 ${fp(worst.impliedUnitPrice)} (차이 ${worst.diffPct.toFixed(1)}%)`);
  return {
    rule: "단가·수량·금액 산식 불일치",
    severity: "참고",
    facts,
    judgement: "과세가격이 금액 기준으로 결정되었다면 세액 영향은 없을 수 있으나, 입력 단가가 실제와 다르면 조사 시 설명이 필요함",
    prepare: ["상업송장의 단가·수량·금액 대조표", "단가 표시 단위(100개당 등) 확인 내역"],
  };
}

function freightInsurance(a: Analysis): Opinion[] {
  const p = a.price;
  const out: Opinion[] = [];
  const spec = (list: typeof p.fobNoFreight) => {
    const s = top(list, (d) => d.supplier, 3);
    return s.length ? ` (공급자별 ${listText(s)})` : "";
  };
  if (p.fobNoFreight.length > 0) {
    const tb = a.ruleSummary.find((r) => r.rule === "운임 가산 여부")?.taxBaseKrw ?? 0;
    out.push({
      rule: "운임 가산 여부",
      severity: "참고",
      facts: [`FOB 계열(FOB·EXW·FCA·FAS) 인도조건인데 운임 0원 신고 ${n(p.fobNoFreight.length)}건, 과세가격 ${eok(tb)}${spec(p.fobNoFreight)}`],
      judgement: "구매자가 운임을 부담했다면 과세가격에 가산되어야 하므로 실제 부담 여부 소명 필요",
      prepare: ["운임 청구서(Freight Invoice)·B/L·AWB", "운임 지급 증빙 및 운송계약서"],
    });
  }
  if (p.fobNoInsurance.length > 0) {
    const tb = a.ruleSummary.find((r) => r.rule === "보험료 가산 여부")?.taxBaseKrw ?? 0;
    out.push({
      rule: "보험료 가산 여부",
      severity: "참고",
      facts: [`FOB 계열 인도조건인데 보험료 0원 신고 ${n(p.fobNoInsurance.length)}건, 과세가격 ${eok(tb)}${spec(p.fobNoInsurance)}`],
      judgement: "구매자가 부보했다면 가산 대상이고, 무보험이면 문제가 없으므로 부보 여부부터 확인 필요",
      prepare: ["적하보험 증권·보험료 영수증", "무보험임을 확인할 수 있는 자료(담당자 확인서 등)"],
    });
  }
  return out;
}

function hsOpinion(a: Analysis): Opinion | null {
  const multi = a.findings.filter((f) => f.rule === "동일 품명 세번 불일치");
  if (multi.length === 0) return null;
  const hi = multi.filter((f) => f.severity === "높음");
  const names = top(multi, (f) => f.itemName, 5);
  const facts = [`동일 품명이 서로 다른 세번으로 신고된 란 ${n(multi.length)}건 (4단위부터 다른 '높음' ${n(hi.length)}건)`, `품명별 ${listText(names)}`];
  const seen = new Set<string>();
  for (const f of (hi.length ? hi : multi).filter((x) => (seen.has(x.itemName) ? false : (seen.add(x.itemName), true))).slice(0, 3))
    facts.push(`${f.itemName} (${f.declarationNo}-${f.lineNo}): ${f.message}`);
  return {
    rule: "동일 품명 세번 불일치",
    severity: hi.length ? "높음" : "중간",
    facts,
    judgement: "동일 품명·규격임에도 신고 세번이 다르면 관세조사 시 사유 소명 필요. 세번이 달라지면 세율·FTA·수입요건이 함께 달라질 수 있음",
    prepare: [
      "품목 사양서·카탈로그·도면으로 세번 구분 근거 정리(품명이 같아도 규격·용도가 다른 경우)",
      "과거 품목분류 사전심사·질의회신 결과 확인 및 신고 세번 대사",
      "오분류로 확인되면 세율 차이에 따른 수정신고·경정청구 검토, 불명확한 품목은 사전심사 신청",
    ],
  };
}

function ftaOpinion(a: Analysis): Opinion[] {
  const out: Opinion[] = [];
  const rs = (rule: string) => a.ruleSummary.find((r) => r.rule === rule);
  const mixed = rs("FTA 적용 혼재");
  if (mixed) {
    const fm = a.findings.filter((f) => f.rule === "FTA 적용 혼재");
    const hs = top(fm, (f) => f.hsCode, 3);
    out.push({
      rule: "FTA 적용 혼재",
      severity: mixed.severity,
      facts: [`같은 세번·원산지 물품이 FTA 세율과 일반 세율로 섞여 신고된 건 ${n(mixed.count)}건, 과세가격 ${eok(mixed.taxBaseKrw)}`, `세번별 ${listText(hs)}`],
      judgement: "일반 세율로 신고한 건에 원산지증명서가 있었다면 협정세율 누락(관세 과다 납부)으로 경정청구 검토 필요. 증명서가 없는데 FTA를 적용한 건은 사후검증 시 소명 필요",
      prepare: ["일반 세율 신고 건의 원산지증명서 보유 여부(경정청구 기한 확인)", "공급자별 원산지 확인서 및 원산지결정기준 충족 근거"],
    });
  }
  for (const rule of ["FTA 세율인데 원산지증명 없음", "FTA 상대국과 원산지 불일치", "FTA 원산지증명서 번호 누락"]) {
    const r = rs(rule);
    if (!r) continue;
    out.push({
      rule,
      severity: r.severity,
      facts: [`${rule} ${n(r.count)}건, 과세가격 ${eok(r.taxBaseKrw)}`],
      judgement: "협정세율 적용을 뒷받침하는 증빙이 없으면 사후검증에서 협정세율이 부인되어 관세 추징 및 가산세가 발생할 수 있어 소명 필요",
      prepare: GUIDE[rule]?.evidence ?? [],
    });
  }
  return out;
}

function reqOpinion(a: Analysis): Opinion | null {
  const c = a.req.candidates;
  if (c.length === 0) return null;
  const names = [...new Set(c.map((x) => x.product))].slice(0, 4).join(", ");
  const facts = [`세번 기준 요건확인 대상 후보 ${n(c.length)}개 (${names} 등)`];
  if (a.req.docCountFilled === 0) facts.push("신고 자료의 요건확인서류 항목이 모두 비어 있어 실제 서류 구비 여부는 이 자료로 확인되지 않음");
  return {
    rule: "수입요건 확인 후보",
    severity: "참고",
    facts,
    judgement: "실제 대상 여부는 품목 사양·정격에 따라 달라 통합공고와 대조 필요. 대상이면 요건 구비 증빙, 비대상이면 비대상 사유 소명 필요",
    prepare: ["대상 품목의 KC·안전확인 인증서 또는 '해당 없음(면제·비대상)' 확인 자료", "요건확인서류 사본 및 통합공고 대조 결과"],
  };
}

function taxOpinion(a: Analysis): Opinion[] {
  const out: Opinion[] = [];
  for (const rule of ["동일 세번 세율 불일치", "관세액 재계산 불일치", "란 금액 합계 불일치"]) {
    const r = a.ruleSummary.find((x) => x.rule === rule);
    if (!r) continue;
    out.push({
      rule,
      severity: r.severity,
      facts: [`${rule} ${n(r.count)}건, 과세가격 ${eok(r.taxBaseKrw)}`],
      judgement: "세액 차이로 이어질 수 있어 신고서·납부 내역과 대조하여 소명 필요",
      prepare: GUIDE[rule]?.evidence ?? [],
    });
  }
  return out;
}

/** 전체 의견 목록(심각도 순) */
export function buildOpinions(a: Analysis): Opinion[] {
  const all = [priceUnit(a), hsOpinion(a), ...ftaOpinion(a), ...taxOpinion(a), calcMismatch(a), ...freightInsurance(a), reqOpinion(a)].filter((o): o is Opinion => !!o);
  const order: Record<string, number> = { 높음: 0, 중간: 1, 참고: 2 };
  return all.sort((x, y) => (order[x.severity] ?? 3) - (order[y.severity] ?? 3));
}

export function overallComment(a: Analysis, ops: Opinion[]): string[] {
  const hi = ops.filter((o) => o.severity === "높음").map((o) => o.rule);
  return [
    `본 신고 자료(${n(a.meta.declCount)}건·${n(a.meta.lineCount)}란, 과세가격 ${eok(a.meta.totalTaxBaseKrw)})를 분석한 결과 검토 필요 항목은 ${n(a.summary.findingCount)}건이며, 검토 우선도는 '${a.grade.label}'임`,
    hi.length
      ? `${hi.join(", ")} 부분은 관세조사 시 우선 소명을 요구받을 가능성이 있어 주의 필요`
      : "'높음' 항목은 없으나 중간·참고 항목은 증빙을 미리 확인해 두는 것이 좋음",
    "각 항목의 '소명자료 대비'에 적은 증빙을 건별로 정리하고, 오류로 확인되는 건은 조사 통지 전 수정신고(가산세 감면 포함) 검토 필요",
  ];
}

export function opinionFor(ops: Opinion[], rules: string[]) {
  return ops.filter((o) => rules.includes(o.rule));
}
