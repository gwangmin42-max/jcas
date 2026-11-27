import { NextRequest, NextResponse } from "next/server";
import { writeOpinion } from "@/lib/classify";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b?.input || !b?.analysis || typeof b.chosen !== "number") return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    const opinion = await writeOpinion({ input: b.input, analysis: b.analysis, chosen: b.chosen, enriched: b.enriched ?? [] });
    return NextResponse.json({ opinion });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "의견서 작성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
