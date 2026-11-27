// 관세청 세관장확인대상물품 (공공데이터포털). 서버에서만 사용합니다.
export type Req = { law: string; agency: string; doc: string; since: string };

const ENDPOINT = "https://apis.data.go.kr/1220000/retrieveCcctLworCd/getRetrieveCcctLworCd";

function tag(block: string, name: string) {
  const m = block.match(new RegExp(`<${name}>([^<]*)</${name}>`));
  return m ? m[1].trim() : "";
}

export async function fetchRequirements(hs: string, type: "1" | "2"): Promise<Req[]> {
  const key = process.env.DATA_GO_KR_KEY;
  if (!key) throw new Error("DATA_GO_KR_KEY not set");
  const url = `${ENDPOINT}?serviceKey=${encodeURIComponent(key)}&hsSgn=${hs}&imexTpcd=${type}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`req http ${res.status}`);
  const xml = await res.text();
  if (!xml.includes("<resultCode>00</resultCode>")) throw new Error("req api error");
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const seen = new Set<string>();
  const out: Req[] = [];
  for (const b of items) {
    const r = { law: tag(b, "dcerCfrmLworNm"), agency: tag(b, "reqApreIttNm"), doc: tag(b, "reqCfrmIstmNm"), since: tag(b, "aplyStrtDt") };
    const k = `${r.law}|${r.agency}|${r.doc}`;
    if (!r.law || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}
