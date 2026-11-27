import { searchHs } from "@/lib/hs";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const hs = (sp.get("hs") ?? "").replace(/\D/g, "");
  const name = (sp.get("name") ?? "").trim();
  if (!/^\d{10}$/.test(hs) && !name) return Response.json({ ok: false, error: "HS 10자리 또는 품명을 입력하세요." }, { status: 400 });
  try {
    const r = await searchHs(hs ? { hs } : { name });
    return Response.json({ ok: true, ...r, items: r.items.slice(0, 30) });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "조회 실패" }, { status: 200 });
  }
}
