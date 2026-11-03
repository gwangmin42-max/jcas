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
  title: "JW Customs Audit System (J-CAS)",
  description: "JW관세법인의 수입신고 적정성 검증 서비스. UNI-PASS 수입신고 내역을 분석하여 관세 성실신고 확인제도 대응을 지원합니다.",
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
