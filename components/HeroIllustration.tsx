// 검증 리포트 카드 + 방패 배지 일러스트 (장식용)
export default function HeroIllustration() {
  return (
    <svg viewBox="0 0 420 360" role="img" aria-label="검증 리포트와 인증 방패" className="hero-art">
      <defs>
        <linearGradient id="shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3fa58f" />
          <stop offset="1" stopColor="#2f7d6d" />
        </linearGradient>
      </defs>

      {/* 뒤 카드 */}
      <rect x="62" y="38" width="262" height="282" rx="18" fill="#ffffff" opacity=".16" />
      {/* 리포트 카드 */}
      <rect x="40" y="56" width="262" height="282" rx="18" fill="#ffffff" />
      <rect x="62" y="80" width="96" height="12" rx="6" fill="#1f3a5f" />
      <rect x="62" y="100" width="150" height="8" rx="4" fill="#cbd5e1" />

      {/* 검사 행 */}
      {[0, 1, 2, 3].map((i) => {
        const y = 132 + i * 46;
        const warn = i === 2;
        return (
          <g key={i}>
            <rect x="62" y={y} width="218" height="36" rx="9" fill={warn ? "#fff4d6" : "#f1f5f9"} />
            <circle cx="82" cy={y + 18} r="9" fill={warn ? "#d97706" : "#2f7d6d"} />
            {warn ? (
              <path d="M82 13.5v6M82 23v.01" transform={`translate(0 ${y - 0})`} stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
            ) : (
              <path d={`M77.5 ${y + 18}l3.2 3.4 6-6.8`} stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            )}
            <rect x="100" y={y + 11} width={[96, 84, 110, 72][i]} height="7" rx="3.5" fill={warn ? "#d6b26a" : "#cbd5e1"} />
            <rect x="100" y={y + 22} width={[56, 64, 48, 60][i]} height="5" rx="2.5" fill={warn ? "#e8cf9d" : "#e2e8f0"} />
          </g>
        );
      })}

      {/* 방패 배지 */}
      <g transform="translate(262 196)">
        <circle cx="62" cy="76" r="92" fill="#ffffff" opacity=".08" />
        <path d="M62 8 L112 28 V74 C112 108 90 132 62 144 C34 132 12 108 12 74 V28 Z" fill="url(#shield)" stroke="#ffffff" strokeWidth="5" />
        <path d="M40 76 l16 17 L88 56" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {/* 장식 점 */}
      <circle cx="372" cy="62" r="6" fill="#9fd3c7" opacity=".7" />
      <circle cx="394" cy="104" r="3.5" fill="#9fd3c7" opacity=".5" />
      <circle cx="22" cy="318" r="5" fill="#9fd3c7" opacity=".5" />
    </svg>
  );
}
