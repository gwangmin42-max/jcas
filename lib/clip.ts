// 관세청 UNI-PASS(CLIP) 품목분류사례(대한민국) 조회. 인증키·요금 없이 공개 화면의 조회 주소를 사용한다. 서버 전용.
const BASE = "https://unipass.customs.go.kr/clip/prlstclsfsrch";

export type ClipCase = {
  rrdcNo: string;
  hs: string; // 결정세번 (예: 8517.62-1020)
  name: string; // 품명
  desc: string; // 물품설명
  reason: string; // 결정사유
  org: string; // 시행기관
  date: string; // 시행일자 yyyy-mm-dd
  url: string; // 원문(상세) 주소
};

const strip = (s: unknown) =>
  String(s ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .trim();

const fmtDate = (d: string) => (/^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : d);

// 4자리 8517 / 6자리 8517.13 / 10자리 8517.13-0000 형태로 맞춘다
const fmtHs = (d: string) => (d.length <= 4 ? d : d.length <= 6 ? `${d.slice(0, 4)}.${d.slice(4)}` : `${d.slice(0, 4)}.${d.slice(4, 6)}-${d.slice(6)}`);

type Raw = Record<string, string>;

export async function searchClipCases(q: { hs?: string; word?: string; limit?: number }): Promise<{ total: number; items: ClipCase[] }> {
  const body = new URLSearchParams({ pageIndex: "1", pageUnit: String(q.limit ?? 10), srchYn: "Y" });
  if (q.hs) body.set("dtrmHsSgn", fmtHs(q.hs));
  else if (q.word) body.set("srwr", q.word);
  else throw new Error("검색어가 없습니다.");
  const res = await fetch(`${BASE}/retrieveDmstPrlstClsfCaseLst.do`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest" },
    body,
    signal: AbortSignal.timeout(20000),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`clip http ${res.status}`);
  const j = (await res.json()) as { uls_dmst?: { thisTotalCount?: number; itemList?: Raw[] } };
  const list = j.uls_dmst?.itemList ?? [];
  return {
    total: Number(j.uls_dmst?.thisTotalCount ?? list.length),
    items: list.map((r) => ({
      rrdcNo: r.RRDC_NO,
      hs: r.DTRM_HS_SGN ?? strip(r.DTRM_HS_SGN_TIT),
      name: strip(r.CMDT_NM ?? r.CMDT_NM_TIT),
      desc: strip(r.CMDT_DESC ?? r.CMDT_DESC_TIT),
      reason: strip(r.DTRM_RSN_CN ?? r.DTRM_RSN_CN_TIT),
      org: strip(r.CSTM_NM ?? r.CSTM_NM_TIT),
      date: fmtDate(r.ENFR_DT ?? ""),
      url: `https://unipass.customs.go.kr/clip/prlstclsfsrch/openULS0203003S.do?koenTp=Y&rrdcNo=${r.RRDC_NO}`,
    })),
  };
}
