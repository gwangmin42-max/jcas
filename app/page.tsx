import Link from "next/link";
import HeroIllustration from "@/components/HeroIllustration";

const TRUST = [
  { title: "실무 점검 항목 기준", desc: "품목분류·세율·FTA·과세가격 네 분야" },
  { title: "자료는 저장하지 않습니다", desc: "업로드한 파일은 이 컴퓨터에서만 처리됩니다" },
  { title: "관세청 발표안 반영", desc: "2026.8.14. 보도자료 기준으로 정리했습니다" },
];

const FACTS = [
  { label: "시범운영", value: "2027년", note: "도입 추진 중" },
  { label: "본격 시행", value: "2028년", note: "시행 예정" },
  { label: "적용 대상", value: "연간 수입 3,000만 달러 미만", note: "중소·중견 수입기업 · AEO 인증기업 제외" },
  { label: "지정 유효기간", value: "5년", note: "재신청 가능" },
];

const STEPS = [
  { title: "지정 신청", desc: "대상 요건을 확인한 뒤 관할 세관에 신청합니다. 해당 과세연도 종료일 2개월 전까지 신청해야 합니다.", ours: false },
  { title: "통상 수입신고", desc: "지정 이후에도 연중 평소와 같이 수입통관과 납세신고를 진행합니다.", ours: false },
  { title: "연간 신고내역 검증", desc: "관세사 등 전문가가 과세가격·품목분류를 비롯한 납세신고의 적정성을 점검하고, 오류가 발견되면 정정합니다.", ours: true },
  { title: "성실신고 확인서 제출", desc: "과세연도 종료 후 3개월 이내에 확인서를 세관에 제출합니다.", ours: false },
  { title: "관세행정상 우대 적용", desc: "요건에 따라 수입검사가 축소·생략되고, 신고 오류를 정정한 경우 가산세 감면이 적용됩니다.", ours: false },
];

const CHECKS = [
  {
    tag: "품목분류",
    title: "세번 적용의 일관성",
    items: [
      "동일 품명이 서로 다른 세번으로 신고된 건",
      "4단위(호) 수준에서 갈린 건은 중요도를 높게 표시",
    ],
  },
  {
    tag: "세율·세액",
    title: "적용세율과 세액의 정합성",
    items: [
      "동일 세번·원산지·세율구분에 서로 다른 세율이 적용된 건",
      "과세가격에 세율을 곱한 값과 신고 관세액이 일치하지 않는 건",
    ],
  },
  {
    tag: "FTA·원산지",
    title: "협정세율 적용의 적정성",
    items: [
      "FTA 세율을 적용했으나 원산지증명이 없거나 상대국이 다른 건",
      "동일 품목에 협정세율과 일반세율이 혼재되어 신고된 건",
    ],
  },
  {
    tag: "과세가격",
    title: "신고가격의 타당성",
    items: [
      "인도조건상 가산해야 할 운임이 0원으로 신고된 건",
      "동일 품목 단가가 중앙값에서 크게 벗어난 건",
    ],
  },
];

const OUTPUTS = [
  { title: "요약 시트", desc: "신고 기간·건수, 과세가격과 관세 합계, 분야별 확인 필요 건수를 한 장에 정리합니다." },
  { title: "확인필요 목록", desc: "중요도, 검사 항목, 신고번호·란, 세번, 품명, 지적 내용을 건별로 제시하고 확인 결과를 적을 메모 칸을 둡니다." },
  { title: "수행하지 못한 검사", desc: "자료에 필요한 열이 비어 있어 검사하지 못한 항목은 그 사실을 리포트에 명시합니다." },
];

const BENEFITS = [
  {
    title: "가산세 감면",
    desc: "현행 제도는 납세신고일부터 6개월 이내에 부족세액을 보정하도록 하고 있습니다. 성실신고 확인 절차를 통해 오류를 발견하고 정정하는 경우에는 요건에 따라 보정기간 이내에 보정한 것으로 인정하여 가산세를 감면하는 방안이 예정되어 있습니다. 부족한 관세 자체가 면제되는 것은 아니며, 감면의 범위와 요건은 최종 법령으로 확인해야 합니다.",
  },
  {
    title: "수입물품 검사 축소·생략",
    desc: "성실신고 확인대상으로 지정된 기업은 통관 과정에서 수입물품 검사가 축소되거나 생략됩니다. 검사에 따른 물류비용과 통관 지연 부담을 줄일 수 있으나, 모든 수입 건의 신속통관이 보장되는 것은 아닙니다.",
  },
];

const FAQS = [
  {
    q: "이 프로그램이 신고 오류를 확정해 주나요?",
    a: "아닙니다. 엑셀 안의 값을 서로 비교해 관세사가 다시 확인해야 할 대상을 좁혀 드립니다. 지적된 건이 실제 오류인지의 판단과 성실신고 확인서의 작성은 전문가의 몫입니다.",
  },
  {
    q: "어떤 자료를 올려야 하나요?",
    a: "UNI-PASS에서 내려받은 수입신고 내역 엑셀(란 단위)입니다. 한 란이 규격별로 여러 줄로 나오는 파일은 란 단위로 합산해 처리합니다.",
  },
  {
    q: "올린 자료는 어디로 전송되나요?",
    a: "외부로 전송하거나 저장하지 않습니다. 파일은 이 프로그램이 실행 중인 컴퓨터에서만 처리됩니다.",
  },
  {
    q: "제도 시행 전인데 지금 사용할 의미가 있나요?",
    a: "시범운영은 2027년으로 예정되어 있습니다. 기존 신고분에서 반복되는 품목분류 불일치나 FTA 적용 혼재를 미리 파악해 두면, 지정 신청과 연간 검증 단계의 준비 부담을 줄일 수 있습니다.",
  },
  {
    q: "제도의 세부 요건은 확정되었나요?",
    a: "아닙니다. 위 내용은 관세청 발표안을 정리한 것으로, 지정 심사 기준과 확인서 세부 서식은 후속 규정이 마련되면 별도로 확인해야 합니다.",
  },
];

export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <div className="hero-inner">
          <div>
            <p className="eyebrow">관세 성실신고 확인제도 대비</p>
            <h1>
              확인서를 작성하기 전,
              <br />
              1년간의 수입신고를 먼저 점검하십시오
            </h1>
            <p className="lede">
              UNI-PASS 수입신고 내역을 올리면 품목분류, 세율·세액, FTA 적용, 과세가격의 네 분야에서 다시 확인해야 할 건을
              선별하여 목록과 리포트로 정리해 드립니다.
            </p>
            <div className="hero-actions">
              <Link href="/verify" className="btn-primary">
                수입신고 내역 검증하기
              </Link>
              <Link href="/#overview" className="btn-secondary">
                제도 안내 보기
              </Link>
            </div>
            <ul className="hero-points">
              <li>업로드한 자료는 저장되지 않습니다</li>
              <li>오류를 확정하지 않고 확인 대상을 선별합니다</li>
            </ul>
          </div>
          <HeroIllustration />
        </div>
      </section>

      <section className="trust">
        <div className="trust-inner">
          {TRUST.map((t) => (
            <div className="trust-item" key={t.title}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <circle cx="10" cy="10" r="10" fill="#2f7d6d" />
                <path d="M5.5 10.3l3 3.1 6-6.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <b>{t.title}</b>
                <span>{t.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="overview" className="section">
        <div className="section-inner">
          <h2>관세 성실신고 확인제도</h2>
          <p className="section-lede">
            기업이 자발적으로 신청하여 지정을 받으면, 관세사 등 전문가가 매 과세연도의 납세신고 적정성을 확인하고 그 결과를
            확인서로 세관에 제출하는 제도입니다. 현재 도입이 추진 중이며 2027년 시범운영을 거쳐 2028년 본격 시행될
            예정입니다.
          </p>
          <div className="fact-grid">
            {FACTS.map((fact) => (
              <div className="fact" key={fact.label}>
                <span className="fact-label">{fact.label}</span>
                <b>{fact.value}</b>
                <span className="fact-note">{fact.note}</span>
              </div>
            ))}
          </div>
          <p className="source">출처: 관세청 2026.8.14. 보도자료. 지정 심사와 확인서 세부 서식은 후속 규정을 확인해야 합니다.</p>
        </div>
      </section>

      <section id="process" className="section alt">
        <div className="section-inner">
          <h2>진행 절차</h2>
          <p className="section-lede">
            이 프로그램은 다섯 단계 가운데 세 번째, 연간 신고내역의 검증 단계에서 전문가의 점검을 돕습니다.
          </p>
          <ol className="steps">
            {STEPS.map((step, i) => (
              <li key={step.title} className={step.ours ? "step ours" : "step"}>
                <span className="step-no">{i + 1}</span>
                <div>
                  <b>{step.title}</b>
                  {step.ours && <span className="badge">이 프로그램</span>}
                  <p>{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="checks" className="section">
        <div className="section-inner">
          <h2>점검 항목</h2>
          <p className="section-lede">
            관세청이 핵심 점검 분야로 밝힌 품목분류와 과세가격을 중심으로, 수입신고 내역 안의 값을 서로 비교하여 이상
            징후를 찾아냅니다. 관세평가의 세부 항목과 감면·환급 신고의 적정성처럼 점검 범위가 확정되지 않은 분야는 범위가
            정해지는 대로 반영할 수 있도록 구성했습니다.
          </p>
          <div className="check-grid">
            {CHECKS.map((check) => (
              <article className="check" key={check.tag}>
                <span className="check-tag">{check.tag}</span>
                <h3>{check.title}</h3>
                <ul>
                  {check.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="section-inner">
          <h2>검증 결과물</h2>
          <p className="section-lede">검증이 끝나면 화면에서 바로 확인하고, 엑셀 리포트로 내려받아 검토 기록으로 보관할 수 있습니다.</p>
          <div className="output-grid">
            {OUTPUTS.map((o, i) => (
              <article className="output" key={o.title}>
                <span className="output-no">{String(i + 1).padStart(2, "0")}</span>
                <h3>{o.title}</h3>
                <p>{o.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <h2>제도 도입 시 기대되는 혜택</h2>
          <div className="benefit-grid">
            {BENEFITS.map((benefit) => (
              <article className="benefit" key={benefit.title}>
                <h3>{benefit.title}</h3>
                <p>{benefit.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="section-inner faq">
          <h2>자주 묻는 질문</h2>
          {FAQS.map((faq) => (
            <details key={faq.q}>
              <summary>{faq.q}</summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-inner cta">
          <h2>보유하신 수입실적으로 먼저 점검해 보십시오</h2>
          <p className="section-lede">UNI-PASS 수입신고 내역(란 단위) 엑셀 한 개면 시작할 수 있습니다.</p>
          <Link href="/verify" className="btn-primary">
            검증 시작하기
          </Link>
          <p className="disclaimer">
            이 프로그램의 결과는 관세사가 다시 확인할 대상을 선별한 것으로, 오류를 확정하지 않습니다. 최종 판단과 성실신고
            확인서의 작성은 전문가의 책임 아래 이루어져야 합니다.
          </p>
        </div>
      </section>

      <footer className="site-footer">JW Customs Audit System (J-CAS) · 제이더블유 관세법인 · 내부 업무용</footer>
    </main>
  );
}
