import { NextRequest, NextResponse } from "next/server";
import { analyze, enrich, type ClassifyInput } from "@/lib/classify";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as ClassifyInput;
    if (!b.name?.trim() || !b.usage?.trim()) return NextResponse.json({ error: "품명과 용도를 입력해 주세요." }, { status: 400 });
    const input: ClassifyInput = {
      name: b.name.trim().slice(0, 300),
      usage: b.usage.trim().slice(0, 1000),
      material: b.material?.trim().slice(0, 1000),
      structure: b.structure?.trim().slice(0, 2000),
      spec: b.spec?.trim().slice(0, 1000),
      extra: b.extra?.trim().slice(0, 2000),
    };
    const analysis = await analyze(input);
    const enriched = await enrich(analysis.candidates);
    return NextResponse.json({ input, analysis, enriched });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
