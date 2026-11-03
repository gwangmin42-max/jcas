import { NextRequest, NextResponse } from "next/server";
import { readLines, verifyLines } from "@/lib/verify";
import { buildReport } from "@/lib/report";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const file = (await req.formData()).get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    const result = verifyLines(readLines(Buffer.from(await file.arrayBuffer())));
    const buffer = await buildReport(result, file.name);
    const filename = encodeURIComponent("성실신고_검증결과.xlsx");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "리포트 생성 중 오류가 발생했습니다" }, { status: 400 });
  }
}
