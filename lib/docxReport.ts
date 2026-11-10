import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Analysis } from "./analysis";
import { GENERAL_READINESS, GUIDE } from "./guidance";
import { buildOpinions, opinionFor, overallComment, type Opinion } from "./narrative";

// 성실신고 확인 보고서(Word). 수입신고 엑셀로 확인되는 내용만 본문에 싣고,
// 추가 자료가 있어야 확인되는 영역은 맨 뒤 'Ⅳ. 확인 불가 영역'으로 모은다.

const FONT = "맑은 고딕";
const NAVY = "1F3A5F";
const n = (v: number) => Math.round(v).toLocaleString();
const eok = (v: number) => (v >= 100000000 ? `${(v / 100000000).toFixed(1)}억원` : `${n(v)}원`);
const fp = (v: number) => (v >= 100 ? n(v) : String(Number(v.toPrecision(4))));
const ymd = (s: string) => (s.length === 8 ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6)}` : s);

function run(text: string, o: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {}) {
  return new TextRun({ text, font: FONT, bold: o.bold, size: o.size ?? 20, color: o.color, italics: o.italics });
}

function para(text: string, o: { bold?: boolean; size?: number; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; before?: number; after?: number; indent?: number; hanging?: number; italics?: boolean } = {}) {
  return new Paragraph({
    alignment: o.align,
    spacing: { before: o.before ?? 0, after: o.after ?? 80, line: 300 },
    indent: o.indent !== undefined ? { left: o.indent, hanging: o.hanging } : undefined,
    children: [run(text, o)],
  });
}

const major = (text: string) =>
  new Paragraph({
    spacing: { before: 360, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY, space: 4 } },
    children: [run(text, { bold: true, size: 30, color: NAVY })],
  });
const sec = (text: string) => para(text, { bold: true, size: 24, color: NAVY, before: 240, after: 100 });
const sub = (text: string) => para(text, { bold: true, size: 21, before: 160, after: 80 });
const circle = (text: string) => para(`❍ ${text}`, { indent: 280, hanging: 280, before: 80 });
const dot = (text: string) => para(`· ${text}`, { indent: 560, hanging: 220, size: 19 });
const arrow = (text: string) => para(`→ ${text}`, { indent: 760, hanging: 280, size: 19, color: "374151" });
const note = (text: string) => para(text, { size: 17, color: "6B7280", italics: true, before: 40, after: 120 });

function cell(text: string, o: { header?: boolean; width: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; bold?: boolean }) {
  return new TableCell({
    width: { size: o.width, type: WidthType.DXA },
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    shading: o.header ? { type: ShadingType.CLEAR, fill: NAVY, color: "auto" } : undefined,
    children: [
      new Paragraph({
        alignment: o.header ? AlignmentType.CENTER : o.align,
        children: text.split("\n").map(
          (t, i) => new TextRun({ text: t, font: FONT, size: 17, bold: o.header || o.bold, color: o.header ? "FFFFFF" : undefined, break: i > 0 ? 1 : undefined })
        ),
      }),
    ],
  });
}

const TOTAL = 9600;
function table(headers: string[], rows: string[][], weights: number[], rightFrom = -1) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.round((w / sum) * TOTAL));
  const border = { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" };
  return new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: widths,
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, { header: true, width: widths[i] })) }),
      ...rows.map(
        (r) =>
          new TableRow({
            cantSplit: true,
            children: r.map((t, i) => cell(t, { width: widths[i], align: rightFrom >= 0 && i >= rightFrom ? AlignmentType.RIGHT : undefined })),
          })
      ),
    ],
  });
}

// 데이터 근거의 검토 의견: 주의가 필요한 부분 + 소명자료 대비
function opinionBlock(list: Opinion[]): Paragraph[] {
  if (list.length === 0) return [];
  const out: Paragraph[] = [para("▶ 검토 의견", { bold: true, size: 21, color: "B45309", before: 200, after: 60 })];
  for (const o of list) {
    out.push(para(`[${o.severity}] ${o.rule}`, { bold: true, size: 20, before: 80, after: 40, indent: 280 }));
    out.push(para(`주의: ${o.attention}`, { size: 19, indent: 560, hanging: 0 }));
    out.push(para(`소명자료 대비: ${o.prepare.join(" / ")}`, { size: 19, color: "374151", indent: 560, hanging: 0 }));
  }
  return out;
}

const gap = () => para("", { after: 60 });
const emptyNote = (text: string) => para(text, { size: 19, color: "6B7280", indent: 280 });

export async function buildDocx(a: Analysis): Promise<Buffer> {
  const { meta, summary, detail } = a;
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const years = detail.years;
  const find = (rule: string) => a.findings.filter((f) => f.rule === rule);
  const ops = buildOpinions(a);
  const body: (Paragraph | Table)[] = [];
  const add = (...items: (Paragraph | Table)[]) => body.push(...items);

  // ── 표지 ──────────────────────────────────────────────────────────
  add(
    para("", { before: 1800 }),
    para("JW CUSTOMS AUDIT SYSTEM", { bold: true, size: 20, color: "2F7D6D", align: AlignmentType.CENTER }),
    para("성실신고 확인 보고서", { bold: true, size: 52, color: NAVY, align: AlignmentType.CENTER, before: 200, after: 120 }),
    para("수입신고 적정성 검증 결과", { size: 26, color: "4B5563", align: AlignmentType.CENTER, after: 600 }),
    table(
      ["구분", "내용"],
      [
        ["검증 대상 자료", meta.sourceName],
        ["신고 기간", `${ymd(meta.dateFrom)} ~ ${ymd(meta.dateTo)}`],
        ["검증 대상", `수입신고 ${n(meta.declCount)}건 · ${n(meta.lineCount)}란 · 공급자 ${n(meta.supplierCount)}곳`],
        ["과세가격 / 관세", `${eok(meta.totalTaxBaseKrw)} / ${eok(meta.totalDutyKrw)}`],
        ["작성일", today],
        ["작성", "제이더블유 관세법인 (JW Customs Audit System)"],
      ],
      [2, 6]
    ),
    para("", { before: 600 }),
    table(["확인 관세사", "직인"], [["성명:                                      ", "                    (인)"], ["확인일:", ""]], [4, 3]),
    para("본 보고서는 수입신고 데이터에 기반한 사전 분석자료로서, 신고내용의 법적 적정성에 대한 최종 확인 또는 관세당국의 심사 결과를 의미하지 않으며, 확인 관세사의 검토를 거쳐 활용합니다.", { size: 17, color: "6B7280", before: 300 }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // ── Ⅰ. 검증 개요 ──────────────────────────────────────────────────
  add(major("Ⅰ. 검증 개요"));
  add(circle("검증 대상 및 방법"));
  add(dot(`UNI-PASS 수입신고 내역(란 단위) ${n(meta.specCount)}행을 신고번호·란번호 기준으로 정리하여 ${n(meta.declCount)}건 ${n(meta.lineCount)}란을 분석하였음`));
  add(dot("수입신고 자료만으로 확인되는 항목(과세가격, 관세감면, 통관요건, 품목분류, 세율·FTA)을 본문 Ⅱ장에 기재하고, 추가 자료가 있어야 확인되는 항목은 Ⅳ장(확인 불가 영역)에 별도로 정리하였음"));
  add(circle("종합 결과"));
  add(dot(`검토 필요 항목 ${n(summary.findingCount)}건 (높음 ${n(summary.bySeverity.높음)} / 중간 ${n(summary.bySeverity.중간)} / 참고 ${n(summary.bySeverity.참고)}), 검토 우선도 '${a.grade.label}'`));
  add(arrow(`${a.grade.note} 검토 우선도는 전체 란 대비 '높음' 항목의 비중으로 산정한 참고 지표이며 법적 위험도를 의미하지 않음`));
  add(gap());
  add(
    table(
      ["분야", "검토 필요", "높음", "중간", "참고"],
      Object.keys(summary.byCategory).map((c) => {
        const list = a.findings.filter((f) => f.category === c);
        const by = (s: string) => String(list.filter((f) => f.severity === s).length);
        return [c, `${list.length}건`, by("높음"), by("중간"), by("참고")];
      }),
      [3, 2, 1, 1, 1],
      1
    )
  );
  add(circle("연도별 신고 현황"));
  add(table(["연도", "신고 건수", "과세가격", "관세"], detail.yearTotals.map((y) => [`${y.year}년`, `${n(y.decls)}건`, eok(y.taxBaseKrw), eok(y.dutyKrw)]), [2, 2, 3, 3], 1));

  // ── Ⅱ. 분야별 세부 검토내용 ─────────────────────────────────────
  add(new Paragraph({ children: [new PageBreak()] }));
  add(major("Ⅱ. 통관적법성 주요 검토분야별 세부 검토내용"));

  // 1. 과세가격
  add(sec("1. 과세가격 분야"));
  add(sub("(1) 수입단가 변동 및 적정성"));
  add(circle("규격별·결제방법별·연도별 수입단가 (금액 ÷ 수량, 연도별 건수/평균단가, 금액 상위 규격)"));
  if (detail.yearly.length === 0) {
    add(emptyNote("단가를 산출할 수 있는 규격 행이 없습니다."));
  } else {
    add(
      table(
        ["규격 (HS CODE)", "결제", "통화/단위", ...years.map((y) => `${y}`)],
        detail.yearly.map((r) => [
          `${r.name} (${r.hsCode})`,
          r.payMethod,
          `${r.currency}/${r.unit}`,
          ...years.map((y) => (r.years[y] ? `${r.years[y].n}건\n${fp(r.years[y].unitPrice)}` : "-")),
        ]),
        [5, 1, 1.6, ...years.map(() => 1.6)],
        3
      )
    );
    add(note("건수는 해당 연도에 해당 규격이 포함된 신고서 수, 단가는 연간 금액 합계 ÷ 수량 합계입니다. 파일에 적힌 단가가 아닌 금액÷수량 기준입니다."));
  }
  add(circle(`동일 세번·규격·단위·통화 품목 간 단가 비교 (비교 가능 그룹 ${n(a.price.groupsEligible)}개, 전체 금액의 ${a.price.coveragePct.toFixed(1)}%)`));
  add(dot(`그룹 중앙값(작은 순으로 세웠을 때 가운데 값)의 2배 이상 또는 1/2 이하인 단가 ${n(a.price.flagTotal)}건 확인 (3배 이상 '높음')`));
  if (a.price.flags.length === 0) {
    add(emptyNote("중앙값에서 크게 벗어난 단가가 확인되지 않았습니다."));
  } else {
    add(
      table(
        ["구분", "신고번호-란", "규격", "단가", "중앙값", "배율", "비교 건수(범위)", "추정 과세가격 차이"],
        a.price.flags.slice(0, 20).map((f) => [
          f.severity,
          `${f.declarationNo}-${f.lineNo}`,
          `${f.name} (${f.hsCode})`,
          `${fp(f.unitPrice)} ${f.currency}/${f.unit}`,
          fp(f.median),
          `${f.ratio.toFixed(2)}배`,
          `${f.samples}건 (${fp(f.min)}~${fp(f.max)})`,
          f.exposureTaxBaseKrw > 0 ? eok(f.exposureTaxBaseKrw) : "-",
        ]),
        [1, 2.6, 3, 2, 1.4, 1, 2.4, 1.8]
      )
    );
    if (a.price.flagTotal > 20) add(note(`상위 20건만 표시하였으며, 전체 ${n(a.price.flagTotal)}건은 엑셀 보고서의 '단가 적정성' 시트에 있습니다.`));
  }
  add(arrow("저가·고가 신고 여부, 수량단위 상이, 규격·등급 차이, 입력 오류 여부를 구매계약서·송장·대금 지급 증빙으로 확인해야 하며, 정당한 사유는 증빙과 함께 정리 필요"));
  add(
    arrow(
      `중앙값보다 단가가 낮은 ${n(a.exposure.lines)}개 란을 중앙값으로 환산한 추정 과세가격 차이는 약 ${eok(a.exposure.taxBaseKrw)}, 관세 약 ${eok(a.exposure.dutyKrw)}이며, 저가신고를 확정한 금액이 아닌 단순 추정임 (단가 폭 50배 초과 그룹은 제외)`
    )
  );
  if (a.price.calcMismatchTotal > 0) {
    add(circle(`신고 단가 × 수량 ≠ 금액인 행 ${n(a.price.calcMismatchTotal)}건 (차이 2% 초과)`));
    add(
      table(
        ["신고번호-란", "규격", "신고 단가", "수량", "금액", "금액÷수량", "차이"],
        a.price.calcMismatch.slice(0, 10).map((m) => [`${m.declarationNo}-${m.lineNo}`, m.name, fp(m.declaredUnitPrice), `${n(m.qty)} ${m.unit}`, `${n(m.amount)} ${m.currency}`, fp(m.impliedUnitPrice), `${m.diffPct.toFixed(1)}%`]),
        [2.6, 3, 1.4, 1.6, 2, 1.4, 1]
      )
    );
    add(arrow("단가 표시 단위 차이 또는 입력 오류일 수 있으며, 과세가격은 금액 기준으로 결정되었는지 확인 필요"));
  }
  if (a.price.supplierGaps.length > 0) {
    add(circle(`동일 규격의 공급자 간 단가 차이 (공급자별 중앙값 1.5배 이상) ${n(a.price.supplierGaps.length)}건`));
    add(
      table(
        ["규격", "낮은 공급자(중앙값)", "높은 공급자(중앙값)", "배율"],
        a.price.supplierGaps.slice(0, 10).map((g) => [`${g.name} (${g.hsCode})`, `${g.low.supplier} (${fp(g.low.median)}, ${g.low.n}건)`, `${g.high.supplier} (${fp(g.high.median)}, ${g.high.n}건)`, `${g.ratio.toFixed(1)}배`]),
        [3, 3.4, 3.4, 1]
      )
    );
  }

  add(sub("(2) 가산요소"));
  add(sub("1) 운임 및 보험료"));
  add(circle("인도조건별 신고 현황"));
  add(table(["인도조건", "건수", "과세가격"], a.price.incotermDist.map((d) => [d.label, `${n(d.count)}건`, eok(d.taxBaseKrw)]), [2, 2, 3], 1));
  add(circle(`운임·보험료가 가격에 포함되지 않는 인도조건(FOB·EXW·FCA·FAS)인데 신고서에 운임 0원: ${n(a.price.fobNoFreight.length)}건, 보험료 0원: ${n(a.price.fobNoInsurance.length)}건`));
  const noCost = [...a.price.fobNoFreight.map((d) => ({ d, kind: "운임 0원" })), ...a.price.fobNoInsurance.map((d) => ({ d, kind: "보험료 0원" }))];
  if (noCost.length === 0) {
    add(emptyNote("해당 건이 확인되지 않았습니다."));
  } else {
    add(
      table(
        ["점검", "신고번호", "신고일", "공급자", "인도조건", "과세가격"],
        noCost.slice(0, 20).map(({ d, kind }) => [kind, d.declarationNo, ymd(d.declDate), d.supplier, d.incoterm, eok(d.taxBaseKrw)]),
        [1.4, 2.6, 1.6, 3.6, 1.2, 1.8]
      )
    );
    if (noCost.length > 20) add(note(`상위 20건만 표시하였으며, 전체는 엑셀 보고서의 '가산요소 점검' 시트에 있습니다.`));
  }
  add(arrow("구매자가 운임·보험료를 부담한 경우 과세가격에 가산하여야 하므로 운임 청구서, B/L, 보험증권 등으로 실제 부담 여부를 확인 필요 (무보험인 경우 문제 없음)"));
  add(sub("2) 가산금(로열티 등) 신고 현황"));
  if (a.price.addOns.length === 0) {
    add(emptyNote("신고서에 가산금이 기재된 건이 확인되지 않았습니다."));
  } else {
    add(circle(`신고서에 가산금이 기재된 신고 ${n(a.price.addOns.length)}건`));
    add(table(["신고번호", "신고일", "공급자", "가산금(원)", "과세가격"], a.price.addOns.slice(0, 15).map((d) => [d.declarationNo, ymd(d.declDate), d.supplier, n(d.addOnKrw), eok(d.taxBaseKrw)]), [2.6, 1.6, 3.6, 1.8, 1.8], 3));
    add(arrow("가산 근거(계약, 지급 내역)와 계산 내역 보관 필요"));
  }
  add(circle(`가격신고서 'N' 신고 ${n(a.price.priceDeclNoCount)}건 (과세가격 ${eok(a.price.priceDeclNoTaxBase)})`));
  add(arrow("수수료·중개료, 권리사용료, 생산지원비용의 가산 여부는 송금 내역 등 추가 자료가 필요하여 Ⅳ장에 정리함"));

  add(sub("(3) 무상물품의 저가신고 여부 점검"));
  add(circle(`결제방법이 GN이거나 거래구분이 일반수입(11)이 아닌 신고 ${n(detail.gratis.length)}건`));
  if (detail.gratis.length === 0) {
    add(emptyNote("해당 신고가 확인되지 않았습니다."));
  } else {
    add(
      table(
        ["신고번호", "신고일", "거래구분", "결제", "공급자", "품명", "과세가격(원)"],
        detail.gratis.slice(0, 20).map((g) => [g.declarationNo, ymd(g.declDate), g.tradeType, g.payMethod, g.supplier, g.itemName, n(g.taxBaseKrw)]),
        [2.4, 1.5, 1, 0.8, 3, 3, 1.8],
        6
      )
    );
    if (detail.gratis.length > 20) add(note(`과세가격 상위 20건만 표시하였습니다. 총 ${n(detail.gratis.length)}건, 과세가격 합계 ${eok(detail.gratis.reduce((s, g) => s + g.taxBaseKrw, 0))}.`));
    const zero = detail.gratis.filter((g) => g.taxBaseKrw <= 0).length;
    add(arrow(zero > 0 ? `과세가격이 0원 이하로 신고된 무상물품 ${zero}건은 저가·미신고 여부 확인 필요` : "과세가격이 0원으로 신고된 건은 확인되지 않았음 (신고 가격의 적정성은 동종·동질물품 가격 또는 송장 등과 대조 필요)"));
    add(note("거래구분·결제방법 코드의 정의는 UNI-PASS 코드표로 확인해야 하며, 위 기준은 무상 성격 후보를 가려내기 위한 것입니다."));
  }

  add(...opinionBlock(opinionFor(ops, ["단가 적정성", "단가·수량·금액 산식 불일치", "운임 가산 여부", "보험료 가산 여부", "공급자 간 단가 차이"])));

  // 2. 관세감면
  add(sec("2. 관세감면 분야"));
  if (detail.reduction.length === 0) {
    add(circle("감면 적용 실적"));
    add(dot(`대상 기간 ${n(meta.lineCount)}란 중 관세감면구분·면세관세·경감관세가 입력된 란이 없음 (관세 감면 적용 실적 없음)`));
    add(arrow("감면 적용 대상 물품이 있었으나 감면을 받지 못한 경우는 신고 자료만으로 알 수 없으므로 담당자 확인 필요"));
  } else {
    add(circle(`관세감면 적용 실적 ${n(detail.exemptLines)}란`));
    add(table(["연도", "감면구분", "란 수", "과세가격", "감면액(원)"], detail.reduction.map((r) => [`${r.year}년`, r.code, n(r.lines), eok(r.taxBaseKrw), n(r.reducedDutyKrw)]), [1.5, 2, 1.2, 2.4, 2.4], 2));
    add(arrow("감면 적용 근거(법 조문, 용도 승인 등)와 사후관리 의무 이행 여부 확인 필요"));
  }

  // 3. 통관요건
  add(sec("3. 통관요건 분야"));
  add(circle("요건확인서류 입력 현황"));
  add(dot(`요건확인서류수가 입력된 신고 ${n(a.req.docCountFilled)}건, 서류첨부 'Y' ${n(a.req.docAttachedYes)}건`));
  if (a.req.docCountFilled === 0) add(arrow("요건확인서류 항목이 모두 비어 있어 서류 구비 여부는 확인되지 않음. 아래 후보는 세번 기준으로 가려낸 것임"));
  add(circle(`요건확인 대상 후보 세번 ${n(a.req.candidates.length)}개`));
  if (a.req.candidates.length === 0) {
    add(emptyNote("후보 목록에 해당하는 세번이 확인되지 않았습니다."));
  } else {
    add(table(["HS CODE", "품명", "품목 구분", "관련 법령", "란 수"], a.req.candidates.map((c) => [c.hsCode, c.names, c.product, c.basis, n(c.lines)]), [1.6, 3.2, 2.4, 3.6, 0.9], 4));
    add(arrow("실제 대상 여부는 품목 사양·정격에 따라 달라지므로 수출입공고·통합공고와 대조하고, 대상 품목은 KC 인증 등 요건 구비 증빙을 보관 필요"));
  }

  add(...opinionBlock(opinionFor(ops, ["수입요건 확인 후보"])));

  // 4. 품목분류
  add(sec("4. 품목분류 분야"));
  const multi = find("동일 품명 세번 불일치");
  add(circle(`신고 세번 ${n(a.hs.distinctCodes)}개, 동일 품명인데 세번이 다르게 신고된 란 ${n(multi.length)}건`));
  if (multi.length === 0) {
    add(emptyNote("해당 건이 확인되지 않았습니다."));
  } else {
    add(table(["구분", "신고번호-란", "HS CODE", "품명", "확인사항"], multi.slice(0, 30).map((f) => [f.severity, `${f.declarationNo}-${f.lineNo}`, f.hsCode, f.itemName, f.message]), [0.9, 2.6, 1.6, 2.4, 5.4]));
    if (multi.length > 30) add(note(`상위 30건만 표시하였으며, 전체는 엑셀 보고서의 '검토대상 상세내역' 시트에 있습니다.`));
    add(arrow("품명이 같아도 규격·성능이 달라 세번이 다를 수 있으므로 사양서·카탈로그로 구분 근거를 확인하고, 오류이면 수정신고를 검토. 분류가 불명확한 물품은 품목분류 사전심사 신청 검토"));
  }

  add(...opinionBlock(opinionFor(ops, ["동일 품명 세번 불일치"])));

  // 5. FTA·세율
  add(sec("5. 세율 및 FTA·원산지 분야"));
  add(circle("연도별 적용 세율구분 실적"));
  add(table(["연도", "세율구분", "란 수", "과세가격", "관세"], detail.ftaYearly.map((r) => [`${r.year}년`, r.rateType, n(r.lines), eok(r.taxBaseKrw), eok(r.dutyKrw)]), [1.5, 1.8, 1.2, 2.6, 2.6], 2));
  const taxFindings = a.findings.filter((f) => f.category === "세율·세액");
  add(circle(`세율·세액 검증: 동일 세번 세율 불일치 및 관세액 재계산 불일치 ${n(taxFindings.length)}건`));
  if (taxFindings.length > 0) {
    add(table(["구분", "검토항목", "신고번호-란", "HS CODE", "확인사항"], taxFindings.slice(0, 20).map((f) => [f.severity, f.rule, `${f.declarationNo}-${f.lineNo}`, f.hsCode, f.message]), [0.9, 2.2, 2.6, 1.6, 5]));
  } else {
    add(dot("세번·원산지·세율구분이 같은 란의 세율이 일치하고, 과세가격 × 세율이 신고 관세액과 일치함 (감면 건 제외)"));
  }
  const fta = a.findings.filter((f) => f.category === "FTA·원산지");
  add(circle(`FTA·원산지 검증: ${n(fta.length)}건`));
  if (fta.length > 0) {
    add(table(["구분", "검토항목", "신고번호-란", "HS CODE", "확인사항"], fta.slice(0, 20).map((f) => [f.severity, f.rule, `${f.declarationNo}-${f.lineNo}`, f.hsCode, f.message]), [0.9, 2.2, 2.6, 1.6, 5]));
    add(arrow("같은 세번·원산지 품목에 협정세율이 적용되지 않은 건은 원산지증명서 보유 여부를 확인하여 경정청구 여부를 검토 (청구 기한 확인 필요)"));
  }
  for (const s of a.skipped) add(note(`※ ${s}`));
  add(...opinionBlock(opinionFor(ops, ["FTA 적용 혼재", "FTA 세율인데 원산지증명 없음", "FTA 상대국과 원산지 불일치", "FTA 원산지증명서 번호 누락", "동일 세번 세율 불일치", "관세액 재계산 불일치", "란 금액 합계 불일치"])));

  // ── Ⅲ. 종합 의견 ─────────────────────────────────────────────────
  add(new Paragraph({ children: [new PageBreak()] }));
  add(major("Ⅲ. 종합 의견 및 조치 권고"));
  add(circle("종합 의견"));
  for (const t of overallComment(a, ops)) add(dot(t));
  add(circle("주의가 필요한 사항 및 소명자료 대비 (우선순위 순)"));
  ops.forEach((o, i) => {
    add(para(`${i + 1}) [${o.severity}] ${o.rule}`, { bold: true, size: 20, before: 100, after: 40, indent: 280 }));
    add(arrow(o.attention));
    add(dot(`소명자료 대비: ${o.prepare.join(" / ")}`));
  });
  add(circle("검토 항목별 요약 및 권고 조치"));
  add(
    table(
      ["구분", "검토항목", "건수", "권고 조치"],
      a.ruleSummary.map((r) => [r.severity, r.rule, `${n(r.count)}건`, GUIDE[r.rule]?.action ?? "-"]),
      [0.9, 2.4, 1, 6.2]
    )
  );
  add(circle("관세조사 대비 상시 보관 서류"));
  for (const t of GENERAL_READINESS) add(dot(`☐ ${t}`));
  add(note("※ 법령 인용은 참고용이며, 활용 전 현행 법령과 관세청 고시를 확인해야 합니다."));

  // ── Ⅳ. 확인 불가 영역 ────────────────────────────────────────────
  add(new Paragraph({ children: [new PageBreak()] }));
  add(major("Ⅳ. 확인 불가 영역 (추가 자료 필요)"));
  add(para("아래 항목은 수입신고 엑셀만으로는 확인할 수 없어 본 보고서에서 검토하지 못한 영역입니다. 해당 자료를 제공받으면 별도로 검토하여 보고서에 추가합니다.", { size: 19 }));
  add(gap());
  const unverifiable: string[][] = [
    ["거래구조 및 위험요소", "무역거래도, 거래당사자·가격 결정 방식, 특수관계자 간 거래가격 산정(이전가격) 정책, 클레임 처리 구조", "담당자 인터뷰, 계약서, 이전가격 보고서(BEPS 등)"],
    ["수수료·중개료", "해외 송금 내역 중 수수료·중개료·대행수수료의 가산 대상 여부, 구매수수료 구분", "외화 송금 내역(지급 사유별), 계약서·청구서"],
    ["권리사용료", "로열티·지식재산권 사용료의 수입물품 관련성 및 판매조건 충족 여부", "권리사용료 지급 내역, 라이선스 계약서"],
    ["생산지원비용", "원재료·설비 등을 무상 또는 인하된 가격으로 공급한 경우의 가산 여부", "원자재 공급 내역, 이전가격 정책"],
    ["실제지급 및 간접지급", "신고 가격과 실제 지급액 대조, 클레임 상계(Set-off), 제3자 지급, 수입대금 과다·과소 지급", "외화채무원장, 분개장, 송금 내역"],
    ["운임·보험료 외환지급 대사", "신고된 운임·보험료와 실제 지급 내역의 일치 여부", "운임·보험료 청구서, 송금 내역"],
    ["외국환거래법", "수입대금 지급, 상계·제3자 지급 신고, 수출대금 영수 대사", "외화 지급·영수 내역, 계약서"],
    ["품목분류 사전회시 대사", "사전심사·질의회신 결과와 실제 신고 세번의 일치 여부", "품목분류 사전심사 회신 목록"],
    ["ESL 품목분류 검토", "품목별 사양에 근거한 품목분류 정확성", "제품 사양서, 카탈로그"],
    ["관세환급", "환급 대상 신고 및 환급 내역", "환급 신청·결정 내역"],
  ];
  add(table(["구분", "확인하지 못한 내용", "필요한 자료"], unverifiable, [2, 5, 3.6]));

  add(para("", { before: 400 }));
  add(para("위와 같이 확인합니다.", { align: AlignmentType.CENTER, size: 22, before: 200 }));
  add(para(today, { align: AlignmentType.CENTER, size: 21 }));
  add(para("제이더블유 관세법인   확인 관세사                               (인)", { align: AlignmentType.CENTER, size: 22, before: 300, bold: true }));

  const doc = new Document({
    creator: "JW Customs Audit System",
    title: "성실신고 확인 보고서",
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1200, bottom: 1100, left: 1150, right: 1150 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [run("JW Customs Audit System · 성실신고 확인 보고서   ", { size: 16, color: "6B7280" }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "6B7280" })],
              }),
            ],
          }),
        },
        children: body,
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
