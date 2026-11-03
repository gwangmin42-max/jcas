import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/analysis";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const file = (await req.formData()).get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    return NextResponse.json(analyze(Buffer.from(await file.arrayBuffer()), file.name));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "검증 중 오류가 발생했습니다" }, { status: 400 });
  }
}
