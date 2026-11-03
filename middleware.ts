import { NextRequest, NextResponse } from "next/server";
import { authToken, AUTH_COOKIE } from "@/lib/auth";

// 사이트 전체를 비밀번호로 잠근다. APP_PASSWORD가 없으면(운영 환경) 아무도 들어올 수 없게 막는다.
export async function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next(); // 로컬 개발은 잠금 없이 사용
    return new NextResponse("APP_PASSWORD 환경변수가 설정되지 않아 접속할 수 없습니다.", { status: 503 });
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (token && token === (await authToken(password))) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // 로그인 화면·로그인 API·정적 파일은 잠금에서 제외
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico|jw-logo.png).*)"],
};
