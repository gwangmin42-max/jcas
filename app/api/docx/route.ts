import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/analysis";
import { buildDocx } from "@/lib/docxReport";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const file = (await req.formData()).get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    const buffer = await buildDocx(analyze(Buffer.from(await file.arrayBuffer()), file.name));
    const filename = encodeURIComponent("성실신고_확인보고서.docx");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "보고서 생성 중 오류가 발생했습니다" }, { status: 400 });
  }
}
