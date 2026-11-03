import { NextRequest, NextResponse } from "next/server";
import { authToken, safeEqual, AUTH_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.json({ error: "서버에 비밀번호가 설정되지 않았습니다" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const input = typeof body.password === "string" ? body.password : "";

  // 무차별 대입을 늦추기 위해 실패 시 잠시 대기
  if (!safeEqual(input, password)) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await authToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
