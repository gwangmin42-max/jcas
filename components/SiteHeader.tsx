import Image from "next/image";
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">
          <Image src="/jw-logo.png" alt="JW" width={36} height={29} priority />
          <span className="brand-text">
            <b>JW Customs Audit System</b>
            <small>J-CAS · 제이더블유 관세법인</small>
          </span>
        </Link>
        <nav className="site-nav">
          <Link href="/#overview">제도 안내</Link>
          <Link href="/#process">진행 절차</Link>
          <Link href="/#checks">검증 항목</Link>
          <Link href="/verify" className="nav-cta">
            검증 시작
          </Link>
        </nav>
      </div>
    </header>
  );
}
