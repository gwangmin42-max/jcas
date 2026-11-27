import { fetchRequirements } from "@/lib/requirements";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const hs = (sp.get("hs") ?? "").replace(/\D/g, "");
  const type = sp.get("type") === "1" ? "1" : "2";
  if (hs.length !== 10) return Response.json({ ok: false, error: "HS 10자리를 입력하세요." }, { status: 400 });
  try {
    const items = await fetchRequirements(hs, type);
    return Response.json({ ok: true, items }, { headers: { "Cache-Control": "public, s-maxage=86400" } });
  } catch {
    return Response.json({ ok: false, error: "조회에 실패했습니다. 잠시 후 다시 시도하세요." }, { status: 502 });
  }
}
