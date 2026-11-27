import { NextRequest, NextResponse } from "next/server";
import { buildOpinionDocx } from "@/lib/opinionDocx";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { opinion } = await req.json();
    if (!opinion?.sections) return NextResponse.json({ error: "의견서 내용이 없습니다." }, { status: 400 });
    const buf = await buildOpinionDocx(opinion);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("품목분류_분류의견서.docx")}`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "파일 생성 오류" }, { status: 500 });
  }
}
