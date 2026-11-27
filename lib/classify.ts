// AI 품목분류 검토: Claude(웹검색 포함) 분석 + HS BOX 데이터(UNI-PASS 세율·수입요건·국내 사례) 결합. 서버 전용.
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import path from "path";
import { searchHs } from "./hs";
import { fetchRequirements } from "./requirements";

export type ClassifyInput = {
  name: string; // 품명
  usage: string; // 용도
  material?: string; // 재질·성분
  structure?: string; // 구조·기능·작동원리
  spec?: string; // 규격·모델·형태
  extra?: string; // 기타
};

export type Candidate = {
  hs6: string; // 6단위 (예: 8517.13)
  hsk10?: string; // 10단위 후보 (확인 전)
  nameKo: string;
  confidence: "high" | "medium" | "low";
  reasoning: string[]; // 판단 근거(호의 용어, 부·류 주, 통칙, 해설서 등)
  gri: string[]; // 적용 통칙
  excluded: string; // 경합 호와 비교 시 제외 사유
};

export type CaseRef = { title: string; ref?: string; url?: string; hs?: string; summary: string; relevance?: string };

export type Analysis = {
  summary: string;
  missingInfo: string[];
  candidates: Candidate[];
  koreaCases: CaseRef[];
  usCases: CaseRef[];
  requirementsNote: string[];
  caveats: string[];
};

const MODEL = process.env.CLASSIFY_MODEL || "claude-opus-5-5";

export function formatInput(i: ClassifyInput): string {
  return [
    `품명: ${i.name}`,
    `용도: ${i.usage}`,
    i.material && `재질·성분: ${i.material}`,
    i.structure && `구조·기능·작동원리: ${i.structure}`,
    i.spec && `규격·형태: ${i.spec}`,
    i.extra && `기타: ${i.extra}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function client() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
  return new Anthropic();
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const s = body.indexOf("{");
  const e = body.lastIndexOf("}");
  if (s < 0 || e < s) throw new Error("AI 응답에서 결과를 읽지 못했습니다. 다시 시도해 주세요.");
  return JSON.parse(body.slice(s, e + 1));
}

async function ask(system: string, user: string, opts: { search: boolean; maxTokens: number }): Promise<string> {
  const c = client();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];
  let text = "";
  // 서버 도구(웹검색)가 길어지면 pause_turn으로 멈추므로 이어서 호출한다.
  for (let turn = 0; turn < 4; turn++) {
    const stream = c.messages.stream({
      model: MODEL,
      max_tokens: opts.maxTokens,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system,
      messages,
      ...(opts.search
        ? { tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }] as Anthropic.ToolUnion[] }
        : {}),
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") throw new Error("AI가 이 요청에 답하지 못했습니다. 입력 내용을 확인해 주세요.");
    text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
    if (msg.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: msg.content });
      continue;
    }
    if (msg.stop_reason === "max_tokens") throw new Error("AI 응답이 길어 중단되었습니다. 입력을 줄여 다시 시도해 주세요.");
    return text;
  }
  return text;
}

const ANALYZE_SYSTEM = `당신은 대한민국 관세사 수준의 HS 품목분류 전문가입니다. 사용자가 제공한 물품 정보를 바탕으로 HSK(관세·통계통합품목분류표) 품목분류를 검토합니다.

원칙:
- 관세율표 해석에 관한 통칙(제1~6호), 부·류·호의 주(註), 관세율표 호 용어, HS 해설서(Explanatory Notes)를 근거로 판단 근거를 서술합니다. 조문·주 번호를 단정해서 인용하되, 확실하지 않으면 "확인 필요"라고 밝힙니다.
- 후보는 1~4개, 가능성이 높은 순서로 제시합니다. 정보가 부족해 판단이 갈리면 부족한 정보를 missingInfo에 구체적으로 적습니다.
- 유사 사례는 웹 검색으로 실제로 확인한 것만 적습니다. 미국 CBP 사례는 CROSS(rulings.cbp.gov)의 Ruling 번호(예: NY N123456, HQ H123456)와 URL을 반드시 함께 적고, 확인하지 못했으면 빈 배열로 둡니다. 한국 사례(관세청 품목분류 질의회신·사전심사 결과, 조세심판원 결정 등)도 사건번호/문서번호를 적습니다. 번호나 내용을 지어내지 마십시오.
- 수입요건은 확정이 아니라 가능성이 있는 법령(전기용품안전관리법, 전파법, 식품위생법, 화학물질관리법, 의료기기법, 전략물자 등)을 짚어 주는 수준으로 requirementsNote에 적습니다. 정확한 요건은 HS 10단위 확정 후 확인해야 합니다.
- hsk10은 한국 HSK 10단위 후보입니다. 확신이 없으면 생략하세요(시스템이 별도로 검증합니다).

응답은 아래 JSON 객체 하나만 출력합니다(설명 문장, 마크다운 금지).
{
 "summary": "한 줄 결론",
 "missingInfo": ["판단에 더 필요한 정보"],
 "candidates": [{"hs6":"8517.13","hsk10":"8517.13-0000","nameKo":"스마트폰","confidence":"high|medium|low","reasoning":["근거1","근거2"],"gri":["통칙 1","통칙 6"],"excluded":"경합 호와 비교한 제외 사유 또는 유의점"}],
 "koreaCases": [{"title":"","ref":"문서번호","url":"","hs":"","summary":"","relevance":"본 물품과의 관련성"}],
 "usCases": [{"title":"","ref":"NY N000000","url":"https://rulings.cbp.gov/...","hs":"HTS 번호","summary":"","relevance":""}],
 "requirementsNote": ["..."],
 "caveats": ["..."]
}`;

export async function analyze(input: ClassifyInput): Promise<Analysis> {
  const text = await ask(ANALYZE_SYSTEM, `다음 물품의 품목분류를 검토해 주세요.\n\n${formatInput(input)}`, { search: true, maxTokens: 16000 });
  const j = extractJson(text) as Partial<Analysis>;
  return {
    summary: j.summary ?? "",
    missingInfo: j.missingInfo ?? [],
    candidates: (j.candidates ?? []).slice(0, 4),
    koreaCases: j.koreaCases ?? [],
    usCases: j.usCases ?? [],
    requirementsNote: j.requirementsNote ?? [],
    caveats: j.caveats ?? [],
  };
}

// ── 세율·수입요건·국내 사례 (자체 데이터, 서버 전용) ─────────────
export type HsVerified = { hs: string; name: string; basic?: string; wto?: string; fta: { label: string; rate: string }[] } | null;
export type Req = { law: string; agency: string; doc: string };
export type DomesticCase = { title: string; no?: string; date?: string; org?: string; set: string };
export type Enriched = {
  hs6: string;
  verified: HsVerified;
  requirements: Req[] | null;
  requirementsNote?: string;
  domesticCases: DomesticCase[];
};

type Head = { id: string; title: string; no?: string; date?: string; org?: string };
const fileCache = new Map<string, unknown>();
function readCase<T>(name: string): T | null {
  try {
    if (!fileCache.has(name)) fileCache.set(name, JSON.parse(readFileSync(path.join(process.cwd(), "public", "case-data", name), "utf8")));
    return fileCache.get(name) as T;
  } catch {
    return null;
  }
}

export async function enrich(cands: Candidate[]): Promise<Enriched[]> {
  const idx = readCase<Record<string, string[]>>("hsindex.json");
  const sets: Record<string, { label: string; map: Map<string, Head> }> = {};
  for (const [k, label] of [["cgm", "관세청 법령해석"], ["tt", "조세심판원 결정"], ["prec", "판례"]] as const) {
    const j = readCase<{ items: Head[] }>(`${k}.json`);
    sets[k] = { label, map: new Map((j?.items ?? []).map((h) => [h.id, h])) };
  }

  return Promise.all(
    cands.map(async (c) => {
      const d6 = c.hs6.replace(/\D/g, "").slice(0, 6);
      const d10 = (c.hsk10 ?? "").replace(/\D/g, "");
      const refs: string[] = [...(idx?.[d6] ?? []), ...(d6.length >= 4 ? (idx?.[d6.slice(0, 4)] ?? []) : [])];
      const seen = new Set<string>();
      const domesticCases: DomesticCase[] = [];
      for (const r of refs) {
        if (seen.has(r)) continue;
        seen.add(r);
        const [k, id] = r.split(":");
        const s = sets[k];
        const h = s?.map.get(id);
        if (!h) continue;
        domesticCases.push({ title: h.title, no: h.no, date: h.date, org: h.org, set: s.label });
        if (domesticCases.length >= 8) break;
      }

      let verified: HsVerified = null;
      let requirements: Req[] | null = null;
      let requirementsNote: string | undefined;
      if (d10.length === 10) {
        try {
          const { items } = await searchHs({ hs: d10 });
          const it = items[0];
          if (it) {
            verified = {
              hs: it.hs,
              name: it.name,
              basic: it.rates.find((r) => r.code === "A")?.rate,
              wto: it.rates.find((r) => r.code === "C")?.rate,
              fta: it.rates.filter((r) => r.code.startsWith("F")).map((r) => ({ label: r.label, rate: r.rate })),
            };
            try {
              requirements = await fetchRequirements(d10, "2");
            } catch {
              requirementsNote = "수입요건 조회에 실패했습니다.";
            }
          } else {
            requirementsNote = "AI가 제시한 10단위가 관세청 HSK 표에서 확인되지 않아 세율·요건을 조회하지 못했습니다. 아래 ‘HS·사례 조회’로 10단위를 확정하세요.";
          }
        } catch (e) {
          requirementsNote = e instanceof Error && /not set/.test(e.message) ? "UNIPASS_HS_KEY 환경변수가 없어 세율을 조회하지 못했습니다." : "세율 조회에 실패했습니다.";
        }
      } else {
        requirementsNote = "10단위가 확정되지 않아 세율·수입요건은 조회하지 않았습니다.";
      }
      return { hs6: c.hs6, verified, requirements, requirementsNote, domesticCases };
    })
  );
}


// ── 분류의견서 ─────────────────────────────────────────────
export type Opinion = {
  title: string;
  applicant: string;
  goods: { label: string; value: string }[]; // 신청물품 개요
  proposedHs: string; // 신청 세번
  proposedName: string;
  sections: { heading: string; paragraphs: string[] }[]; // 분류 판단 근거
  comparison: { hs: string; name: string; verdict: string; reason: string }[]; // 경합 호 비교
  cases: { kind: string; title: string; ref: string; point: string }[];
  conclusion: string;
  attachments: string[]; // 첨부 권장 자료
};

const OPINION_SYSTEM = `당신은 관세사입니다. 관세청 품목분류 사전심사 신청에 첨부할 "품목분류 분류의견서"를 작성합니다.

규칙:
- 아래 [입력 자료]에 있는 물품 정보, 검토 결과, 사례만 근거로 합니다. 자료에 없는 사실(제조사, 모델, 수치 등)을 지어내지 마십시오. 모르는 항목은 "(신청인 기재 필요)"로 둡니다.
- 사례(한국/미국)는 입력 자료에 있는 것만 인용하고, 번호와 URL을 바꾸지 않습니다.
- 법적 판단 근거는 관세율표 해석에 관한 통칙, 부·류 주, 호 용어, 해설서 순서로, 선택한 호가 왜 타당한지, 경합 호가 왜 배제되는지를 논리적으로 서술합니다.
- 문체는 공문서체(~함, ~임 또는 ~합니다)로 일관합니다.

JSON 객체 하나만 출력하십시오(설명, 마크다운 금지):
{
 "title":"품목분류 분류의견서",
 "applicant":"(신청인 기재 필요)",
 "goods":[{"label":"품명","value":""},{"label":"용도","value":""},{"label":"재질·성분","value":""},{"label":"구조·기능","value":""},{"label":"규격","value":""}],
 "proposedHs":"8517.13-0000","proposedName":"",
 "sections":[{"heading":"1. 물품의 개요","paragraphs":[""]},{"heading":"2. 적용 법령 및 통칙","paragraphs":[""]},{"heading":"3. 분류 판단","paragraphs":[""]}],
 "comparison":[{"hs":"","name":"","verdict":"채택|배제","reason":""}],
 "cases":[{"kind":"한국|미국(CBP)","title":"","ref":"","point":"본 건에 시사하는 점"}],
 "conclusion":"",
 "attachments":["카탈로그","성분표","사진 등 첨부 권장 자료"]
}`;

export async function writeOpinion(args: { input: ClassifyInput; analysis: Analysis; chosen: number; enriched: Enriched[] }): Promise<Opinion> {
  const { input, analysis, chosen, enriched } = args;
  const cand = analysis.candidates[chosen];
  if (!cand) throw new Error("선택한 분류 후보가 없습니다.");
  const mat = [
    "[물품 정보]",
    formatInput(input),
    "",
    "[채택할 분류]",
    JSON.stringify(cand),
    enriched[chosen]?.verified ? `UNI-PASS 확인: ${enriched[chosen]!.verified!.hs} ${enriched[chosen]!.verified!.name} (기본세율 ${enriched[chosen]!.verified!.basic ?? "-"}%)` : "",
    "",
    "[경합 후보]",
    JSON.stringify(analysis.candidates.filter((_, i) => i !== chosen)),
    "",
    "[한국 사례]",
    JSON.stringify([...analysis.koreaCases, ...(enriched[chosen]?.domesticCases ?? []).map((d) => ({ title: d.title, ref: d.no, summary: d.set }))]),
    "[미국 CBP 사례]",
    JSON.stringify(analysis.usCases),
    "[보완이 필요한 정보]",
    JSON.stringify(analysis.missingInfo),
  ].join("\n");
  const text = await ask(OPINION_SYSTEM, `[입력 자료]\n${mat}`, { search: false, maxTokens: 16000 });
  return extractJson(text) as Opinion;
}
