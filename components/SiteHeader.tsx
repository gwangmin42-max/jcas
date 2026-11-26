import Image from "next/image";
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">
          <Image src="/jw-logo.png" alt="JW" width={36} height={29} priority />
          <span className="brand-text">
            <b>JW CUSTOMS AUDIT SYSTEM</b>
          </span>
        </Link>
        <nav className="site-nav">
          <Link href="/#overview">성실신고 확인제도</Link>
          <Link href="/#self-review">자율심사업체</Link>
          <Link href="/#process">확인 절차</Link>
          <Link href="/#checks">검증 항목</Link>
          <Link href="/#results">검증 결과</Link>
          <Link href="/verify" className="nav-cta">
            수입신고 적정성 검증
          </Link>
        </nav>
      </div>
    </header>
  );
}
