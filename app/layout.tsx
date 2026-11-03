import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "관세성실신고 확인제도 검증 프로그램",
  description: "UNI-PASS 수입신고 내역을 올리면 성실신고 확인 시 다시 볼 의심 건을 찾아 줍니다",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
