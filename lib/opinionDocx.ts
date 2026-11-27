// 분류의견서 Word 파일. 서식이 확정되면 이 파일만 고치면 된다.
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, HeadingLevel } from "docx";
import type { Opinion } from "./classify";

const FONT = "맑은 고딕";
const t = (text: string, o: { bold?: boolean; size?: number } = {}) => new TextRun({ text, font: FONT, bold: o.bold, size: o.size ?? 21 });
const p = (text: string, o: { bold?: boolean; after?: number } = {}) => new Paragraph({ children: [t(text, o)], spacing: { after: o.after ?? 100, line: 320 } });
const h = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(text, { bold: true, size: 24 })], spacing: { before: 240, after: 100 } });

function cell(text: string, w: number, bold = false, shade = false) {
  return new TableCell({
    width: { size: w, type: WidthType.PERCENTAGE },
    shading: shade ? { fill: "EEF2F7" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [p(text, { bold, after: 0 })],
  });
}
const table = (rows: string[][], widths: number[], header = false) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r, ri) => new TableRow({ children: r.map((c, ci) => cell(c, widths[ci], (header && ri === 0) || (!header && ci === 0), (header && ri === 0) || (!header && ci === 0))) })),
  });

export async function buildOpinionDocx(o: Opinion): Promise<Buffer> {
  const body: (Paragraph | Table)[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [t(o.title || "품목분류 분류의견서", { bold: true, size: 36 })] }),
    p(`신청인: ${o.applicant}`),
    h("신청 물품"),
    table(o.goods.map((g) => [g.label, g.value || "(신청인 기재 필요)"]), [22, 78]),
    p(""),
    p(`신청 세번: ${o.proposedHs}  ${o.proposedName}`, { bold: true }),
  ];
  for (const s of o.sections) {
    body.push(h(s.heading));
    for (const x of s.paragraphs) body.push(p(x));
  }
  if (o.comparison?.length) {
    body.push(h("경합 호 비교"));
    body.push(table([["세번", "품명", "판단", "사유"], ...o.comparison.map((c) => [c.hs, c.name, c.verdict, c.reason])], [14, 22, 10, 54], true));
  }
  if (o.cases?.length) {
    body.push(h("관련 사례"));
    body.push(table([["구분", "사례", "번호", "시사점"], ...o.cases.map((c) => [c.kind, c.title, c.ref, c.point])], [12, 30, 18, 40], true));
  }
  body.push(h("결론"), p(o.conclusion));
  if (o.attachments?.length) {
    body.push(h("첨부 권장 자료"));
    for (const a of o.attachments) body.push(p(`- ${a}`, { after: 40 }));
  }
  const doc = new Document({ sections: [{ children: body }] });
  return Packer.toBuffer(doc);
}
