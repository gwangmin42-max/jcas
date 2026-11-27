import Link from "next/link";
import HeroIllustration from "@/components/HeroIllustration";

const FEATURES = [
  { no: "01", title: "주요 신고항목 검증", desc: "품목분류·관세율·FTA 원산지·과세가격 검토" },
  { no: "02", title: "신고자료 기반 정합성 분석", desc: "UNI-PASS 수입신고 내역의 항목별 비교 및 이상거래 선별" },
  { no: "03", title: "관세청 제도 도입 대응", desc: "성실신고 확인제도·자율심사업체 제도 대응을 위한 사전점검 지원" },
];

const FACTS = [
  { label: "시범운영", value: "2027년", note: "참여 희망기업 대상 시범운영 예정" },
  { label: "본격 시행", value: "2028년", note: "관세청 발표 기준 시행 예정" },
  { label: "적용 대상", value: "연간 수입금액 3,000만 달러 미만", note: "중소·중견기업 대상, AEO 공인기업 제외" },
  { label: "지정 유효기간", value: "5년", note: "유효기간 종료 후 재신청 가능" },
];

const STEPS = [
  {
    title: "확인대상 사업자 지정 신청",
    desc: "제도 참여를 희망하는 수입기업은 지정 요건을 검토한 후 관할 세관에 성실신고 확인대상 사업자 지정을 신청합니다. 관세청 발표에 따르면 신청기한은 해당 과세연도 종료일 2개월 전까지입니다.",
    ours: false,
  },
  {
    title: "연간 수입신고 및 납세신고",
    desc: "지정된 기업은 통상적인 수입통관 및 납세신고 절차에 따라 수입신고를 진행하고, 과세연도별 신고내역과 관련 증빙자료를 관리합니다.",
    ours: false,
  },
  {
    title: "수입신고 적정성 검증",
    desc: "JW관세법인의 검증 프로그램을 활용하여 연간 수입신고 내역의 주요 신고항목을 분석합니다. 품목분류, 관세율, FTA 협정세율 및 과세가격 등을 중심으로 신고자료 간 정합성을 점검하고, 전문 검토가 필요한 신고건을 선별합니다.",
    ours: true,
  },
  {
    title: "성실신고 확인서 작성 및 제출",
    desc: "관세사 등 전문가가 수입신고 내용의 적정성을 검토하고, 관련 규정 및 절차에 따라 성실신고 확인서를 작성하여 세관에 제출합니다. 관세청 발표 기준 제출기한은 과세연도 종료일 이후 3개월 이내입니다.",
    ours: false,
  },
  {
    title: "관세행정상 지원 및 우대",
    desc: "제도에 따른 요건과 절차를 충족하는 경우 수입물품 검사 축소·생략 및 신고세액 정정에 따른 가산세 감면 등의 지원을 받을 수 있도록 제도 도입이 추진되고 있습니다. 실제 지원 범위는 시행 법령과 세관의 적용기준에 따릅니다.",
    ours: false,
  },
];

const CHECKS = [
  {
    tag: "품목분류",
    title: "HS CODE 적용 일관성 검토",
    items: [
      "동일 또는 유사 품명에 대한 상이한 HS CODE 신고내역 분석",
      "품목분류 변경 및 세번 적용의 일관성 검토",
      "동일 품목의 신고이력 비교를 통한 이상내역 선별",
    ],
    note: "품목명 또는 신고이력 비교만으로 품목분류의 정확성을 최종 판단할 수 없으며, 물품의 성상·기능·용도 및 관련 분류규정에 대한 별도 검토가 필요합니다.",
  },
  {
    tag: "세율·세액",
    title: "관세율 및 신고세액 정합성 검토",
    items: [
      "동일 HS CODE 및 적용조건에 따른 관세율 차이 분석",
      "과세가격과 적용세율에 따른 신고세액의 정합성 검토",
      "세율 적용내역의 이상 여부 및 추가 검토대상 선별",
    ],
    note: "적정세율의 최종 판단에는 수입신고일, 적용 법령, 국가별 협정, 감면요건 등 추가적인 검토가 필요할 수 있습니다.",
  },
  {
    tag: "FTA·원산지",
    title: "FTA 협정세율 적용 적정성 검토",
    items: [
      "FTA 협정세율 적용 신고내역 분석",
      "원산지 및 협정세율 신고항목 간 정합성 검토",
      "동일 품목의 협정세율 및 비협정세율 적용이력 비교",
    ],
    note: "FTA 특혜관세 적용의 최종 적정성은 원산지증명서, 원산지결정기준 충족 여부 및 직접운송요건 등 관련 증빙자료에 대한 검토가 필요합니다.",
  },
  {
    tag: "과세가격",
    title: "과세가격 신고 적정성 검토",
    items: [
      "동일 또는 유사 품목의 신고단가 변동 분석",
      "거래별 과세가격 및 신고금액의 이상내역 선별",
      "신고자료에서 확인 가능한 운임 등 과세가격 관련 항목의 정합성 검토",
    ],
    note: "과세가격의 최종 적정성은 실제 거래가격, 가산·공제요소, 특수관계 영향 및 관련 계약·회계자료 등을 종합적으로 검토하여 판단해야 합니다.",
  },
];

const OUTPUTS = [
  {
    title: "검증 종합현황",
    desc: "분석 대상 기간, 수입신고 건수, 주요 신고금액 및 검증 분야별 검토 필요 건수를 종합적으로 제공합니다.",
  },
  {
    title: "검토대상 상세내역",
    desc: "검토가 필요한 신고건을 신고번호, 품목, HS CODE, 검토항목 및 주요 확인사항별로 구분하여 제공합니다.",
  },
  {
    title: "검증 제외·추가 확인사항",
    desc: "자료 누락 또는 검증에 필요한 정보의 부족 등으로 분석이 제한된 항목을 별도로 구분하여 제공합니다.",
  },
];

const BENEFITS = [
  {
    title: "신고세액 정정 시 가산세 감면",
    desc: "관세청은 성실신고 확인 과정에서 신고 오류가 확인되어 세액을 정정하는 경우, 일정한 요건에 따라 보정기간 이내에 보정한 것으로 인정하여 가산세를 감면하는 방안을 발표했습니다.",
    note: "이는 모든 신고 오류에 대한 가산세 면제나 관세 본세의 감면을 의미하지 않습니다.",
  },
  {
    title: "수입물품 검사 축소·생략",
    desc: "성실신고 확인대상 사업자에 대하여 수입통관 과정에서 물품검사를 축소하거나 생략하는 등의 지원이 예정되어 있습니다.",
    note: "검사 축소·생략 여부는 관련 법령과 세관의 위험관리 및 검사기준에 따라 결정되며, 모든 수입신고에 대한 검사 면제를 보장하는 것은 아닙니다.",
  },
];

const SERVICES = [
  "연간 수입신고 내역 분석 및 위험요인 식별",
  "품목분류·관세평가·FTA 등 주요 신고사항 정밀검토",
  "신고 오류 검토 및 정정신고 관련 자문",
  "관세 성실신고 확인제도 도입에 따른 기업별 사전 대응 지원",
  "자율심사업체 신청 요건 검토 및 자율심사 대응 상담",
];

// ───────── 자율심사업체 제도 (관세청 공고 제2026-166호·제2026-168호, 「납세업무 처리에 관한 고시」 제60조의2~8) ─────────

const SELF_FACTS = [
  { label: "신청서 접수", value: "2026.11.30 ~ 12.28", note: "업체 소재지 관할 본부세관 (관세청 공고 제2026-168호)" },
  { label: "선정 결과", value: "2027년 1월 중 개별 통보", note: "세관의 인력규모 등을 감안하여 최종 선정" },
  { label: "신청 대상", value: "최근 2년 연평균 수입액 3,000만 달러 이상", note: "전전년도 7월~당해년도 6월 실적 기준" },
  { label: "자율심사 대상기간", value: "직전 관세조사 대상기간 이후 ~ 2026.12.31 수입신고분", note: "부과제척기간(관세법 제21조) 이내 건에 한함" },
];

const COMPARE_HEAD = ["구분", "성실신고 확인제도", "자율심사업체 제도"];
const COMPARE_ROWS: [string, string, string][] = [
  ["제도 상태", "관세법 개정(신설) 예정 · 2026.8.4. 재정경제부 입법예고", "관세법 제38조제4항 및 납세업무 처리에 관한 고시에 따라 2026.11.30부터 신청서 접수"],
  ["적용 대상", "최근 2년 연평균 수입액 3,000만 달러 미만 사업자(예정)", "최근 2년 연평균 수입액 3,000만 달러 이상 납세의무자"],
  ["AEO(수입부문) 공인업체", "제외", "납세협력프로그램을 활용 중이면 신청 불가"],
  ["운영 시기", "2027년 시범운영, 2028년 본격 시행(예정)", "2027년 1월 중 선정 통보"],
  ["결과 제출", "과세연도 종료일 이후 3개월 이내(예정)", "자율심사 대상기간 종료일로부터 6개월 이내 (부득이한 사유 시 1개월 범위 내 연장)"],
  ["확인 주체", "관세사 등 전문가", "2인 이상의 확인관세사"],
  ["주요 지원", "가산세 감면, 수입물품 검사 축소·생략(예정)", "고시 별표 3의 혜택 제공, 조치가 완료된 건은 관세조사 대상에서 제외 가능(예외 있음)"],
];

const SELF_REQS = [
  "최근 2년간 관세법 등 수출입관련 법령 위반으로 형사처벌 받은 사실이 없을 것",
  "최근 2년간 관세 등의 체납이 없을 것. 다만 납부기한 경과 후 15일 이내에 납부하였거나, 15일이 경과하였더라도 납부지연가산세를 제외한 총 체납세액이 300만원 미만으로서 신청일 기준 납부를 완료한 경우를 포함",
  "납세협력프로그램과 관련하여 ① 수출입 안전관리 우수업체(수입부문)로 공인되어 납세협력프로그램을 활용 중이거나 ② 성실신고확인 제도를 활용할 수 있는 납세의무자(최근 2년 연평균 수입액 미화 3천만달러 미만 사업자로 예정)에 해당하지 않을 것",
  "최근 2년 연평균 수입액이 미화 3천만달러 이상일 것",
];

const SELF_STEPS = [
  {
    title: "자율심사업체 신청",
    desc: "신청 요건을 갖춘 기업이 자율심사업체 신청서(별지 제18호의2서식)를 관할 본부세관에 제출합니다. 자율심사결과 확인관세사 선임신고서(별지 제18호의5서식)를 함께 제출할 수 있습니다. 세관장은 접수일부터 7일 이내에 관세청장에게 보고합니다. (고시 제60조의3제1항·제2항)",
    ours: false,
  },
  {
    title: "자율심사업체 승인",
    desc: "관세청장이 신청서 접수 마감일부터 30일 이내에 해당 여부를 검토하여 세관장에게 통보하고, 세관장은 자율심사업체 승인서(별지 제18호의3서식)를 발급합니다. (고시 제60조의3제3항·제4항)",
    ours: false,
  },
  {
    title: "위험정보 제공",
    desc: "세관장은 자율점검 지원을 위해 납세오류·통관요건 등에 대한 위험정보를 제공할 수 있으며, 필요한 경우 현장 확인이나 관련 자료 제출을 요구할 수 있습니다. 업체는 제공받은 위험정보를 자체 점검하여 결과보고서에 포함해야 합니다. (고시 제60조의4제3항·제4항)",
    ours: false,
  },
  {
    title: "자율심사(자체 점검) 및 결과보고서 작성",
    desc: "승인 후 2년마다(최초 승인 연도에는 직전 관세조사 대상기간 이후 부과제척기간) 수출입신고 내역을 자체 점검합니다. 납부세액의 과부족분은 결과 제출 전에 보정신청, 수정신고 또는 경정청구하고, 2인 이상의 확인관세사가 검증·확인한 자율심사 결과보고서(별지 제18호의4서식)를 대상기간 종료일부터 6개월 이내에 세관장에게 제출합니다. (고시 제60조의4제1항·제2항)",
    ours: true,
  },
  {
    title: "결과 확인 및 통지",
    desc: "세관장은 관세조사 처분검토회의에 자율심사 사항을 상정한 후, 결과보고서 제출일부터 6개월 이내에 심사결과를 통지합니다(별지 제18호의7서식). (고시 제60조의6제1항·제2항)",
    ours: false,
  },
  {
    title: "관세조사 대상 제외 가능",
    desc: "통보서에 따라 조치가 완료된 자율심사 건은 관세조사 대상에서 제외될 수 있습니다. 다만 거짓·부정한 자료를 제출했거나, 자료 미제출 등 납세협력의무를 불성실하게 이행했거나, 세관장이 추가 심사가 필요하다고 통지한 경우는 제외됩니다. (고시 제60조의6제3항)",
    ours: false,
  },
];

const SELF_CHECK_ITEMS = [
  "과세가격에 관한 사항 (과세가격 결정방법 사전심사 결과가 통보된 물품은 제외)",
  "품목분류 및 세율에 관한 사항",
  "관세감면 및 사후관리에 관한 사항",
  "관세환급(소요량 계산 포함)에 관한 사항",
  "개별소비세 등 내국세 신고 및 납부에 관한 사항",
  "외환거래 및 수출입 물품 관련 요건의 구비 여부 등 법령 준수에 관한 사항",
  "관세 등의 납부가 보류된 물품 관리 업무의 적법 여부에 관한 사항",
  "그 밖에 세관장이 필요하다고 지정하는 사항",
];

const SELF_OFFICES: [string, string, string][] = [
  ["서울본부세관", "심사총괄1과", "02-510-1212"],
  ["부산본부세관", "심사총괄과", "051-620-6322"],
  ["인천본부세관", "심사총괄과", "032-452-3312·3347"],
  ["대구본부세관", "납세지원과", "053-230-5322"],
  ["광주본부세관", "심사과", "062-975-8172"],
];

export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-art-wrap">
            <HeroIllustration />
          </div>
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-dot" />
              JW CUSTOMS COMPLIANCE SOLUTION
            </p>
            <h1>
              관세 성실신고 확인·자율심사 제도,
              <br />
              <span className="hl">체계적인 수입신고 검증</span>부터 시작합니다.
            </h1>
            <p className="lede">
              JW관세법인의 수입신고 검증 프로그램은 UNI-PASS 수입신고 내역을 기반으로 품목분류, 관세율, FTA 협정세율 및
              과세가격 등 주요 신고항목의 적정성을 분석합니다.
            </p>
            <p className="lede">
              신고자료 간 불일치와 이상거래를 선별하여 기업의 자율적인 관세 위험관리 및 성실신고 확인제도·자율심사업체 제도 대응을 지원합니다.
            </p>
            <div className="hero-actions">
              <Link href="/verify" className="btn-primary">
                수입신고 적정성 검증
              </Link>
              <Link href="/classify" className="btn-secondary">
                AI 품목분류 검토
              </Link>
              <Link href="/#overview" className="btn-secondary">
                성실신고 확인·자율심사 제도 안내
              </Link>
            </div>
            <div className="hero-chips">
              <span>품목분류</span>
              <span>관세율·FTA</span>
              <span>과세가격</span>
              <span>수입요건</span>
              <span>AI 분류의견서</span>
            </div>
            <ul className="hero-points">
              <li>업로드 자료는 검증 목적으로만 처리하며 서버에 별도로 보관하지 않습니다.</li>
              <li>검증 결과는 전문 검토가 필요한 신고내역을 식별하기 위한 참고자료입니다.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="trust">
        <div className="trust-inner">
          {FEATURES.map((f) => (
            <div className="trust-item" key={f.no}>
              <span className="feature-no">{f.no}</span>
              <div>
                <b>{f.title}</b>
                <span>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="overview" className="section">
        <div className="section-inner">
          <h2>1. 관세 성실신고 확인제도</h2>
          <p className="section-lede">
            관세 성실신고 확인제도는 수입기업이 관세사 등 전문가를 통해 납세신고 내용의 적정성을 자율적으로 검증하고, 그 결과를
            세관에 제출하도록 하는 제도입니다.
          </p>
          <p className="section-lede">
            품목분류 및 과세가격 등 주요 신고사항에 대한 전문적인 확인을 통해 납세신고의 정확성을 높이고, 수입기업의 자율적인
            관세 위험관리를 지원하는 데 목적이 있습니다.
          </p>
          <p className="section-lede">
            관세청은 2027년 시범운영 및 의견수렴을 거쳐 2028년부터 제도를 본격 시행할 계획이라고 발표했습니다.
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
          <p className="source">
            출처: 관세청, 「관세 성실신고 확인제도 도입 추진」(2026.8. 발표) · 재정경제부 공고 제2026-219호(2026.8.4. 입법예고,
            관세법 개정안) · 관세청 공고 제2026-166호(2026.11.25.)
          </p>
          <p className="source">
            ※ 위 내용은 관세청 발표 및 제도 도입 추진 내용을 기준으로 작성하였으며, 실제 적용 대상과 절차 등은 향후 확정되는
            법령 및 세부 운영기준에 따릅니다.
          </p>
          <div className="legal-box">
            <p>
              연평균 수입액이 미화 3,000만 달러 이상인 기업은 성실신고 확인제도의 대상이 아니라 아래 2번의 <b>자율심사업체
              제도</b>(2026.11.30.부터 신청서 접수)를 검토하게 됩니다.
            </p>
          </div>
        </div>
      </section>

      <section id="self-review" className="section alt">
        <div className="section-inner">
          <h2>2. 관세 자율심사업체 제도</h2>
          <p className="section-lede">
            자율심사업체 제도는 납세의무자가 납세신고한 세액과 수출입 관련 법령 준수 여부 등을 스스로 심사하고, 관세사의 검증·확인을
            거친 결과보고서를 세관에 제출하는 제도입니다. 관세법 제38조제4항과 「납세업무 처리에 관한 고시」 제60조의2부터
            제60조의8까지에 근거합니다.
          </p>
          <p className="section-lede">
            관세청은 2026년 11월 25일 자율심사업체 신청 요건(공고 제2026-166호)과 신청서 접수(공고 제2026-168호)를
            공고했습니다. 최종 선정은 2027년 1월 중 개별 통보됩니다.
          </p>
          <div className="fact-grid">
            {SELF_FACTS.map((fact) => (
              <div className="fact" key={fact.label}>
                <span className="fact-label">{fact.label}</span>
                <b>{fact.value}</b>
                <span className="fact-note">{fact.note}</span>
              </div>
            ))}
          </div>

          <h3 className="sub-h">성실신고 확인제도와의 비교</h3>
          <div className="cmp-wrap">
            <table className="cmp">
              <thead>
                <tr>
                  {COMPARE_HEAD.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row[0]}>
                    <th scope="row">{row[0]}</th>
                    <td>{row[1]}</td>
                    <td>{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="sub-h">신청 요건</h3>
          <p className="section-lede">다음 요건을 모두 충족하는 납세의무자가 신청할 수 있습니다. (관세청 공고 제2026-166호)</p>
          <ol className="req-list">
            {SELF_REQS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
          <p className="source">
            우대 사항: 관세법 제37조제1항제3호에 따른 특수관계자 간 과세가격 결정방법 사전심사(ACVA)를 활용 중인 경우
          </p>
          <p className="source">
            요건 확인: 법령 위반 및 체납 사실은 신청일이 속하는 월의 직전 월부터 소급하여, 수입액은 전전년도 7월부터 당해년도
            6월의 실적을 기준으로 관세청장이 전자통관시스템을 통해 확인합니다.
          </p>

          <h3 className="sub-h">신청 방법</h3>
          <div className="fact-grid">
            <div className="fact">
              <span className="fact-label">제출서류</span>
              <b>자율심사업체 신청서</b>
              <span className="fact-note">납세업무 처리에 관한 고시 별지 제18호의2서식</span>
            </div>
            <div className="fact">
              <span className="fact-label">제출서류</span>
              <b>확인관세사 선임신고서</b>
              <span className="fact-note">별지 제18호의5서식 · 관세사 등록증 등 입증서류 첨부</span>
            </div>
            <div className="fact">
              <span className="fact-label">접수처</span>
              <b>업체 소재지 관할 본부세관</b>
              <span className="fact-note">선정 후 결과보고서 확인 세관은 접수 세관과 달라질 수 있음</span>
            </div>
          </div>
          <div className="cmp-wrap office">
            <table className="cmp">
              <thead>
                <tr>
                  <th>본부세관</th>
                  <th>접수 부서</th>
                  <th>연락처</th>
                </tr>
              </thead>
              <tbody>
                {SELF_OFFICES.map((o) => (
                  <tr key={o[0]}>
                    <td>{o[0]}</td>
                    <td>{o[1]}</td>
                    <td>{o[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="source">문의: 관세청 심사정책과 042-481-7863·7894</p>

          <h3 className="sub-h">자율심사 절차</h3>
          <ol className="steps">
            {SELF_STEPS.map((step, i) => (
              <li key={step.title} className={step.ours ? "step ours" : "step"}>
                <span className="step-no">{i + 1}</span>
                <div>
                  <b>{step.title}</b>
                  {step.ours && <span className="badge">JW관세법인 검증 프로그램 지원 단계</span>}
                  <p>{step.desc}</p>
                  {step.ours && (
                    <p className="step-caveat">
                      이 프로그램의 자동 검증 결과만으로 자율심사 결과보고서의 확인이 완료되는 것은 아닙니다.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <h3 className="sub-h">자체 점검 항목</h3>
          <p className="section-lede">
            자율심사업체는 수출입신고 내역 등에 대해 다음 사항을 자체 점검해야 합니다. (고시 제60조의4제1항)
          </p>
          <ol className="req-list">
            {SELF_CHECK_ITEMS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
          <p className="source">
            JW관세법인의 검증 프로그램은 이 중 과세가격, 품목분류·세율, FTA 협정세율 등 관세감면 신고사항에 대한 수입신고 내역의
            사전 분석을 지원합니다. 환급, 내국세, 요건 구비, 납부보류 물품 관리 등은 별도 검토가 필요합니다.
          </p>

          <h3 className="sub-h">확인관세사 선임 시 유의사항</h3>
          <div className="legal-box">
            <p>
              자율심사 결과는 <b>2인 이상의 확인관세사</b>에게 검증·확인받아야 합니다. 확인관세사는 ① 자율심사업체에 소속된
              관세사로만 구성되거나, ② 해당 업체의 수출입 신고·환급청구 등을 수행하는 신고인 관세사 및 그와 동일한 사무소 또는
              관세법인에 소속된 관세사로만 구성된 경우, ③ 그 밖에 관세청장이 부적절하다고 지정하는 경우에 해당해서는 안 됩니다.
              (고시 제60조의5제1항)
            </p>
            <p>
              선임관세사를 변경하려는 경우에는 자율심사결과 확인관세사 선임변경신고서(별지 제18호의6서식)를 세관장에게
              제출해야 합니다. (고시 제60조의5제2항)
            </p>
            <p>
              자율심사 결과의 제출 등 승인 유지에 필요한 의무를 이행하지 않거나 관세청장이 정한 요건을 갖추지 못하게 되는 경우
              세관장은 승인을 취소할 수 있습니다. (고시 제60조의7)
            </p>
          </div>
          <p className="source">
            출처: 관세청 공고 제2026-168호 「자율심사업체 신청서 접수 공고」 · 제2026-166호 「자율심사업체 신청 요건 공고」(2026.11.25.) ·
            「납세업무 처리에 관한 고시」 제2조, 제60조의2~제60조의8. 승인업체에 제공되는 혜택(별표 3)과 세부 운영기준은 관세청 및
            관할 세관의 안내를 확인하시기 바랍니다.
          </p>
        </div>
      </section>

      <section id="process" className="section">
        <div className="section-inner">
          <h2>3. 관세 성실신고 확인 절차</h2>
          <p className="section-lede">
            관세 성실신고 확인제도는 대상 사업자 지정, 연간 수입신고 내역 검토, 성실신고 확인서 제출 등의 절차로 운영될
            예정입니다.
          </p>
          <p className="section-lede">
            JW관세법인의 검증 프로그램은 이 중 수입신고 내역의 사전 분석 및 검토대상 선별을 지원합니다.
          </p>
          <ol className="steps">
            {STEPS.map((step, i) => (
              <li key={step.title} className={step.ours ? "step ours" : "step"}>
                <span className="step-no">{i + 1}</span>
                <div>
                  <b>{step.title}</b>
                  {step.ours && <span className="badge">JW관세법인 검증 프로그램 지원 단계</span>}
                  <p>{step.desc}</p>
                  {step.ours && (
                    <p className="step-caveat">
                      이 프로그램의 자동 검증 결과만으로 법정 성실신고 확인절차가 완료되는 것은 아닙니다.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="checks" className="section alt">
        <div className="section-inner">
          <h2>4. 수입신고 주요 검증 항목</h2>
          <p className="section-lede">
            UNI-PASS 수입신고 데이터를 활용하여 신고항목별 정합성을 분석하고, 관세·통관 실무상 추가 검토가 필요한 신고내역을
            식별합니다.
          </p>
          <p className="section-lede">
            분석 결과는 신고번호 및 검토항목별로 구분하여 제공하며, 실제 신고 오류 여부는 관련 증빙자료와 법령에 대한 전문적인
            검토를 통해 판단해야 합니다.
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
                <p className="check-note">{check.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="results" className="section">
        <div className="section-inner">
          <h2>5. 검증 결과 및 보고서</h2>
          <p className="section-lede">
            검증 완료 후 신고내역별 분석 결과를 확인할 수 있으며, 주요 검토사항은 엑셀 보고서로 제공합니다.
          </p>
          <p className="section-lede">
            보고서는 신고번호를 기준으로 검토대상을 식별할 수 있도록 구성하여, 기업의 내부 검토 및 관세사의 후속 정밀검토에
            활용할 수 있도록 합니다.
          </p>
          <div className="output-grid">
            {OUTPUTS.map((o, i) => (
              <article className="output" key={o.title}>
                <span className="output-no">{String(i + 1).padStart(2, "0")}</span>
                <h3>{o.title}</h3>
                <p>{o.desc}</p>
              </article>
            ))}
          </div>
          <div className="legal-box">
            <p>
              본 검증 결과는 수입신고 데이터에 기반한 사전 분석자료로서, 신고내용의 법적 적정성에 대한 최종 확인 또는
              관세당국의 심사 결과를 의미하지 않습니다.
            </p>
            <p>
              성실신고 확인서 또는 자율심사 결과보고서 작성 및 제출을 위한 최종 검토는 관련 증빙자료와 관계 법령에 근거하여
              별도로 수행되어야 합니다.
            </p>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="section-inner">
          <h2>6. 성실신고 확인제도 도입에 따른 기대효과</h2>
          <p className="section-lede">
            관세 성실신고 확인제도는 기업의 자율적인 납세신고 검증을 기반으로 신고 정확성을 높이고 관세행정상 지원을 제공하는
            제도입니다.
          </p>
          <p className="section-lede">
            다음 사항은 관세청이 발표한 주요 지원 방향이며, 구체적인 적용 요건과 범위는 최종 시행기준을 확인해야 합니다.
          </p>
          <div className="benefit-grid">
            {BENEFITS.map((benefit) => (
              <article className="benefit" key={benefit.title}>
                <h3>{benefit.title}</h3>
                <p>{benefit.desc}</p>
                <p className="benefit-note">{benefit.note}</p>
              </article>
            ))}
          </div>
          <p className="source">
            검증 프로그램 자체의 도입만으로 관세청의 행정상 우대 또는 가산세 감면 혜택이 발생하는 것은 아닙니다.
          </p>
        </div>
      </section>

      <section id="service" className="section">
        <div className="section-inner service">
          <h2>7. JW관세법인의 관세신고 검증 서비스</h2>
          <p className="section-lede">수입신고 데이터의 정합성 검토는 관세 위험관리의 출발점입니다.</p>
          <p className="section-lede">
            JW관세법인은 수출입통관, 품목분류, 관세평가 및 FTA 분야의 실무 경험을 바탕으로 수입기업의 주요 신고사항을
            분석하고, 전문 검토가 필요한 사항에 대한 후속 자문을 지원합니다.
          </p>
          <p className="section-lede">
            자동화된 데이터 검증과 관세사의 전문적인 법령 검토를 연계하여 기업의 신고 정확성 제고와 관세 컴플라이언스
            관리체계 구축을 지원합니다.
          </p>
          <ul className="service-list">
            {SERVICES.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <div className="service-cta">
            <Link href="/verify" className="btn-primary solid">
              수입신고 검증 시작하기
            </Link>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <p>© 2026 JW Customs Audit System · 제이더블유 관세법인. All rights reserved.</p>
        <p className="footer-legal">
          본 서비스는 JW관세법인이 자체 개발하여 운영하는 검증 프로그램이며, 관세청이 인증하거나 운영하는 시스템이 아닙니다.
          관세 성실신고 확인제도에 관한 내용은 관세청의 도입 추진 및 발표 내용을, 자율심사업체 제도에 관한 내용은 관세청 공고
          제2026-166호·제2026-168호(2026.11.25.) 및 「납세업무 처리에 관한 고시」를 기준으로 하며, 향후 확정되는 법령 및
          세부 운영기준에 따라 달라질 수 있습니다.
        </p>
      </footer>
    </main>
  );
}
