export default function BrandBanner() {
  return (
    <div className="brand-banner">
      <p className="bb-eyebrow">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 2.5l8 3v6c0 5-3.3 8.6-8 10-4.7-1.4-8-5-8-10v-6l8-3z" stroke="#7cc4e8" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8.5 12l2.4 2.5 4.6-5" stroke="#7cc4e8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        JW CUSTOMS SOLUTIONS
      </p>
      <p className="bb-name">J-CAS</p>
      <p className="bb-sub">JW Customs Audit System</p>
      <hr />
      <p className="bb-ko">관세 성실신고 통합 검증 시스템</p>
      <p className="bb-tag">Customs Compliance · Risk Analysis · Verification</p>
    </div>
  );
}
