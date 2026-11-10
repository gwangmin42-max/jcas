import type { Analysis, PriceFlag } from "./analysis";
import { GUIDE } from "./guidance";

// 분석 결과(수치)를 근거로 '주의가 필요한 부분'과 '소명자료 대비' 문구를 작성한다.
// 문장은 모두 이번 신고 자료의 실제 건수·공급자·품목에서 만들며, 법적 판단이 아닌 사전 점검 의견이다.

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
  attention: string; // 주의가 필요한 부분
  prepare: string[]; // 소명자료 대비
}

function priceUnit(a: Analysis): Opinion | null {
  const p = a.price;
  if (p.flagTotal === 0) return null;
  const high = p.flags.filter((f) => f.severity === "높음");
  const worst: PriceFlag | undefined = [...p.flags].sort((x, y) => y.ratio - x.ratio)[0];
  const sup = top(p.flags, (f) => f.supplier, 3);
  const items = top(p.flags, (f) => f.name, 4);
  let t = `동일 세번·규격 비교 시 중앙값의 2배 이상 또는 1/2 이하인 단가가 ${n(p.flagTotal)}건이며 이 중 3배 이상 편차는 ${n(high.length)}건입니다.`;
  if (sup.length === 1) t += ` 전부 ${sup[0][0]}의 신고 건이며, 품목은 ${listText(items)} 등입니다.`;
  else if (sup.length > 1) t += ` 공급자별로는 ${listText(sup)} 순으로 많고, 품목은 ${listText(items)} 등입니다.`;
  if (worst) t += ` 편차가 가장 큰 건은 ${worst.declarationNo}-${worst.lineNo}(${worst.name}, ${fp(worst.unitPrice)} ${worst.currency}/${worst.unit}, 중앙값 대비 ${worst.ratio.toFixed(1)}배)입니다.`;
  if (a.exposure.lines > 0) t += ` 중앙값보다 낮게 신고된 ${n(a.exposure.lines)}개 란을 중앙값으로 환산하면 과세가격 차이가 약 ${eok(a.exposure.taxBaseKrw)}, 관세 약 ${eok(a.exposure.dutyKrw)}으로 추정되어 저가신고로 지적받을 소지가 있으므로 우선 소명이 필요합니다.`;
  t += " 다만 수량단위 상이(개·1,000개), 규격·등급 차이, 입력 오류가 원인일 가능성이 있어 확정적 저가신고로 볼 수 없습니다.";
  return {
    rule: "단가 적정성",
    severity: high.length ? "높음" : "중간",
    attention: t,
    prepare: [
      `${sup[0] ? sup[0][0] + " 등 상위 공급자의" : "해당 공급자의"} 상업송장·PO·단가표(Price List)로 단가 편차의 사유 정리`,
      "편차가 큰 건의 수량단위·규격·등급 차이를 송장 기준으로 대조하고, 입력 오류는 정정 여부 판단",
      "대금 지급 증빙(송금 내역)과 할인·리베이트·사후정산 약정 보관",
      "특수관계 여부 및 가격 결정 방법 설명자료 준비",
    ],
  };
}

function calcMismatch(a: Analysis): Opinion | null {
  const p = a.price;
  if (p.calcMismatchTotal === 0) return null;
  const worst = [...p.calcMismatch].sort((x, y) => y.diffPct - x.diffPct)[0];
  return {
    rule: "단가·수량·금액 산식 불일치",
    severity: "참고",
    attention: `신고 단가 × 수량이 금액과 2% 넘게 다른 행이 ${n(p.calcMismatchTotal)}건입니다.${worst ? ` 가장 큰 차이는 ${worst.declarationNo}-${worst.lineNo}(${worst.name}, 신고 단가 ${fp(worst.declaredUnitPrice)} vs 금액÷수량 ${fp(worst.impliedUnitPrice)})입니다.` : ""} 과세가격이 금액 기준으로 결정되었다면 세액에는 영향이 없을 수 있으나, 입력 단가가 실제와 다르면 조사 시 설명이 필요합니다.`,
    prepare: ["상업송장의 단가·수량·금액 대조표", "단가 표시 단위(100개당 등) 확인 내역"],
  };
}

function freightInsurance(a: Analysis): Opinion[] {
  const p = a.price;
  const out: Opinion[] = [];
  if (p.fobNoFreight.length > 0) {
    const tb = a.ruleSummary.find((r) => r.rule === "운임 가산 여부")?.taxBaseKrw ?? 0;
    out.push({
      rule: "운임 가산 여부",
      severity: "참고",
      attention: `FOB 계열 인도조건인데 운임이 0원으로 신고된 건이 ${n(p.fobNoFreight.length)}건(과세가격 ${eok(tb)})입니다. 구매자가 운임을 부담했다면 과세가격에 가산되어야 하므로 누락 여부를 점검해야 합니다.`,
      prepare: ["운임 청구서(Freight Invoice)·B/L·AWB", "운임 지급 증빙 및 운송계약서"],
    });
  }
  if (p.fobNoInsurance.length > 0) {
    const tb = a.ruleSummary.find((r) => r.rule === "보험료 가산 여부")?.taxBaseKrw ?? 0;
    out.push({
      rule: "보험료 가산 여부",
      severity: "참고",
      attention: `FOB 계열 인도조건인데 보험료가 0원으로 신고된 건이 ${n(p.fobNoInsurance.length)}건(과세가격 ${eok(tb)})입니다. 구매자가 부보했다면 가산 대상이고, 무보험이면 문제가 없으므로 부보 여부부터 확인해야 합니다.`,
      prepare: ["적하보험 증권·보험료 영수증", "무보험임을 확인할 수 있는 자료(담당자 확인서 등)"],
    });
  }
  return out;
}

function hsOpinion(a: Analysis): Opinion | null {
  const multi = a.findings.filter((f) => f.rule === "동일 품명 세번 불일치");
  if (multi.length === 0) return null;
  const hi = multi.filter((f) => f.severity === "높음").length;
  const names = top(multi, (f) => f.itemName, 5);
  return {
    rule: "동일 품명 세번 불일치",
    severity: hi ? "높음" : "중간",
    attention: `동일 품명이 서로 다른 세번으로 신고된 란이 ${n(multi.length)}건이며, 4단위(호)부터 다른 '높음' 건이 ${n(hi)}건입니다. 품명별로는 ${listText(names)} 순으로 많습니다. 세번이 달라지면 세율·FTA·수입요건이 함께 달라질 수 있어 조사에서 가장 먼저 확인되는 항목입니다.`,
    prepare: [
      "해당 품목의 사양서·카탈로그·도면으로 세번 구분 근거 정리(품명이 같아도 규격·용도가 다른 경우)",
      "과거 품목분류 사전심사·질의회신 결과 확인",
      "오분류로 확인되면 세율 차이에 따른 수정신고·경정청구 여부 검토, 불명확한 품목은 사전심사 신청",
    ],
  };
}

function ftaOpinion(a: Analysis): Opinion[] {
  const out: Opinion[] = [];
  const rs = (rule: string) => a.ruleSummary.find((r) => r.rule === rule);
  const mixed = rs("FTA 적용 혼재");
  if (mixed) {
    out.push({
      rule: "FTA 적용 혼재",
      severity: mixed.severity,
      attention: `같은 세번·원산지 물품이 FTA 세율과 일반 세율로 섞여 신고된 건이 ${n(mixed.count)}건(과세가격 ${eok(mixed.taxBaseKrw)})입니다. 일반 세율로 신고한 건에 원산지증명서가 있었다면 협정세율 누락으로 관세를 더 낸 것이어서 경정청구 대상이 될 수 있습니다.`,
      prepare: ["일반 세율 신고 건의 원산지증명서 보유 여부 확인(경정청구 기한 확인)", "공급자별 원산지 확인서 및 원산지결정기준 충족 근거"],
    });
  }
  for (const rule of ["FTA 세율인데 원산지증명 없음", "FTA 상대국과 원산지 불일치", "FTA 원산지증명서 번호 누락"]) {
    const r = rs(rule);
    if (!r) continue;
    out.push({
      rule,
      severity: r.severity,
      attention: `${rule} 건이 ${n(r.count)}건(과세가격 ${eok(r.taxBaseKrw)})입니다. 협정세율 적용을 뒷받침하는 증빙이 없으면 사후검증에서 협정세율이 부인되어 관세 추징 및 가산세가 발생할 수 있습니다.`,
      prepare: GUIDE[rule]?.evidence ?? [],
    });
  }
  return out;
}

function reqOpinion(a: Analysis): Opinion | null {
  const c = a.req.candidates;
  if (c.length === 0) return null;
  const names = [...new Set(c.map((x) => x.product))].slice(0, 4).join(", ");
  return {
    rule: "수입요건 확인 후보",
    severity: "참고",
    attention: `세번 기준으로 요건확인 대상일 가능성이 있는 세번이 ${n(c.length)}개(${names} 등)입니다.${a.req.docCountFilled === 0 ? " 신고 자료의 요건확인서류 항목이 모두 비어 있어 실제 서류 구비 여부는 이 자료로는 확인되지 않습니다." : ""} 실제 대상 여부는 품목 사양·정격에 따라 달라지므로 통합공고와 대조가 필요합니다.`,
    prepare: ["대상 품목의 KC·안전확인 인증서 또는 '해당 없음' 확인 자료", "요건확인서류 사본 및 통합공고 대조 결과"],
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
      attention: `${rule} 건이 ${n(r.count)}건(과세가격 ${eok(r.taxBaseKrw)})입니다. 세액 차이로 이어질 수 있어 신고서·납부 내역과의 대조가 필요합니다.`,
      prepare: GUIDE[rule]?.evidence ?? [],
    });
  }
  return out;
}

/** 전체 의견 목록(심각도 → 건수 순) */
export function buildOpinions(a: Analysis): Opinion[] {
  const all = [priceUnit(a), hsOpinion(a), ...ftaOpinion(a), ...taxOpinion(a), calcMismatch(a), ...freightInsurance(a), reqOpinion(a)].filter((o): o is Opinion => !!o);
  const order: Record<string, number> = { 높음: 0, 중간: 1, 참고: 2 };
  return all.sort((x, y) => (order[x.severity] ?? 3) - (order[y.severity] ?? 3));
}

export function overallComment(a: Analysis, ops: Opinion[]): string[] {
  const hi = ops.filter((o) => o.severity === "높음").map((o) => o.rule);
  const lines: string[] = [];
  lines.push(
    `본 신고 자료(${a.meta.declCount.toLocaleString()}건·${a.meta.lineCount.toLocaleString()}란, 과세가격 ${eok(a.meta.totalTaxBaseKrw)})를 분석한 결과, 검토 필요 항목은 ${n(a.summary.findingCount)}건이며 검토 우선도는 '${a.grade.label}'입니다.`
  );
  lines.push(
    hi.length
      ? `특히 ${hi.join(", ")} 부분은 관세조사 시 우선적으로 소명을 요구받을 가능성이 있어 주의가 필요합니다.`
      : "'높음'으로 분류된 항목은 없으나, 아래 참고·중간 항목은 증빙을 미리 확인해 두는 것이 좋습니다."
  );
  lines.push("아래 각 항목의 '소명자료 대비'에 적은 증빙을 건별로 미리 정리하고, 오류로 확인되는 건은 조사 통지 전 수정신고(가산세 감면 여부 포함)를 검토하시기 바랍니다.");
  return lines;
}

export function opinionFor(ops: Opinion[], rules: string[]) {
  return ops.filter((o) => rules.includes(o.rule));
}
