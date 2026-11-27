// 관세청 UNI-PASS HS부호검색 (세율 포함). 서버에서만 사용합니다.
export type HsRate = { code: string; label: string; rate: string };
export type HsItem = { hs: string; name: string; unit: string; rates: HsRate[] };

const ENDPOINT = "https://unipass.customs.go.kr:38010/ext/rest/hsSgnQry/searchHsSgn";

const LABELS: Record<string, string> = {
  A: "기본", C: "WTO협정", R: "최혜국(MFN)", U: "국제협력(한-미 등 제외)",
  FAS1: "한-ASEAN", FAU1: "한-호주", FCA1: "한-캐나다", FCECR1: "한-중미(코스타리카)", FCEHN1: "한-중미(온두라스)",
  FCENI1: "한-중미(니카라과)", FCEPA1: "한-중미(파나마)", FCESV1: "한-중미(엘살바도르)", FCL1: "한-칠레", FCN1: "한-중국",
  FCO1: "한-콜롬비아", FEF1: "한-EFTA", FID1: "한-인도네시아", FIL1: "한-이스라엘", FIN1: "한-인도", FKH1: "한-캄보디아",
  FNZ1: "한-뉴질랜드", FPE1: "한-페루", FPH1: "한-필리핀", FRCAS1: "RCEP(ASEAN)", FRCAU1: "RCEP(호주)", FRCCN1: "RCEP(중국)",
  FRCJP1: "RCEP(일본)", FRCNZ1: "RCEP(뉴질랜드)", FSG1: "한-싱가포르", FTR1: "한-튀르키예", FUS1: "한-미국", FVN1: "한-베트남",
  FAE1: "한-UAE", FEU1: "한-EU", FGB1: "한-영국",
};

function tag(b: string, n: string) {
  const m = b.match(new RegExp(`<${n}>([^<]*)</${n}>`));
  return m ? m[1].trim() : "";
}

export async function searchHs(params: { hs?: string; name?: string }): Promise<{ total: number; items: HsItem[] }> {
  const key = process.env.UNIPASS_HS_KEY;
  if (!key) throw new Error("UNIPASS_HS_KEY not set");
  const q = params.hs ? `hsSgn=${encodeURIComponent(params.hs)}` : `prnm=${encodeURIComponent(params.name ?? "")}`;
  const res = await fetch(`${ENDPOINT}?crkyCn=${key}&koenTp=1&${q}`, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`hs http ${res.status}`);
  const xml = await res.text();
  const note = tag(xml, "ntceInfo");
  if (note) throw new Error(note);
  const blocks = xml.match(/<hsSgnSrchRsltVo>[\s\S]*?<\/hsSgnSrchRsltVo>/g) ?? [];
  const map = new Map<string, HsItem>();
  for (const b of blocks) {
    const hs = tag(b, "hsSgn");
    let it = map.get(hs);
    if (!it) { it = { hs, name: tag(b, "korePrnm"), unit: tag(b, "wghtUt"), rates: [] }; map.set(hs, it); }
    const code = tag(b, "txtpSgn");
    it.rates.push({ code, label: LABELS[code] ?? code, rate: tag(b, "txrt") });
  }
  return { total: map.size, items: [...map.values()] };
}
