import type { Metadata } from "next";
import { Noto_Serif_KR } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const serif = Noto_Serif_KR({
  weight: ["600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "관세성실신고 확인제도 검증 프로그램",
  description: "UNI-PASS 수입신고 내역을 올리면 성실신고 확인 시 다시 볼 의심 건을 찾아 줍니다",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={serif.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
