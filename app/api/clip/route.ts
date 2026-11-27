import { searchClipCases } from "@/lib/clip";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!q) return Response.json({ ok: false, error: "검색어를 입력하세요." }, { status: 400 });
  const digits = q.replace(/[\s.\-]/g, "");
  try {
    const r = await searchClipCases(/^\d{4,10}$/.test(digits) ? { hs: digits } : { word: q });
    return Response.json({ ok: true, ...r });
  } catch {
    return Response.json({ ok: false, error: "관세청 품목분류사례 조회에 실패했습니다. 잠시 후 다시 시도하세요." }, { status: 502 });
  }
}
