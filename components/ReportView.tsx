import type { ReactNode } from "react";
import type { Analysis, Dist } from "@/lib/analysis";
import type { Category, Finding } from "@/lib/verify";
import { GENERAL_READINESS, GUIDE } from "@/lib/guidance";

const n = (v: number) => Math.round(v).toLocaleString();
const eok = (v: number) => (v >= 100000000 ? `${(v / 100000000).toFixed(1)}억원` : `${n(v)}원`);
const fp = (v: number) => (v >= 100 ? n(v) : String(Number(v.toPrecision(4))));
const ymd = (s: string) => (s.length === 8 ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6)}` : s);

function Sev({ s }: { s: string }) {
  return <span className={`sev ${s}`}>{s}</span>;
}

function Bars({ items, limit = 8, unit = "과세가격" }: { items: Dist[]; limit?: number; unit?: string }) {
  const rows = items.slice(0, limit);
  const total = items.reduce((a, d) => a + d.taxBaseKrw, 0) || 1;
  const max = Math.max(...rows.map((d) => d.taxBaseKrw), 1);
  return (
    <div className="rp-bars">
      {rows.map((d) => (
        <div className="rp-bar" key={d.label}>
          <span className="rp-bar-label">{d.label}</span>
          <span className="rp-bar-track"><i style={{ width: `${(d.taxBaseKrw / max) * 100}%` }} /></span>
          <span className="rp-bar-val">{d.count}건 · {eok(d.taxBaseKrw)} ({((d.taxBaseKrw / total) * 100).toFixed(1)}%)</span>
        </div>
      ))}
      {items.length > limit && <div className="rp-more">외 {items.length - limit}개 ({unit} 기준 상위 {limit}개 표시)</div>}
    </div>
  );
}

function FindingTable({ rows, cap = 40 }: { rows: Finding[]; cap?: number }) {
  if (rows.length === 0) return <p className="rp-empty">해당 항목에서 검토가 필요한 건이 확인되지 않았습니다.</p>;
  return (
    <>
      <table className="rp-table">
        <thead><tr><th>구분</th><th>검토항목</th><th>신고번호-란</th><th>HS CODE</th><th>품명</th><th>확인사항</th></tr></thead>
        <tbody>
          {rows.slice(0, cap).map((f, i) => (
            <tr key={i}>
              <td><Sev s={f.severity} /></td>
              <td>{f.rule}</td>
              <td className="nw">{f.declarationNo ? `${f.declarationNo}-${f.lineNo}` : "-"}</td>
              <td className="nw">{f.hsCode}</td>
              <td>{f.itemName}</td>
              <td>{f.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > cap && <p className="rp-more">외 {rows.length - cap}건은 엑셀 보고서의 '검토대상 상세내역'에서 확인할 수 있습니다.</p>}
    </>
  );
}

function Section({ no, title, children, newPage = true }: { no: string; title: string; children: ReactNode; newPage?: boolean }) {
  return (
    <section className={`rp-section${newPage ? " rp-break" : ""}`}>
      <h2><span>{no}</span> {title}</h2>
      {children}
    </section>
  );
}

function GuideBlock({ rules }: { rules: string[] }) {
  const shown = rules.filter((r) => GUIDE[r]);
  if (shown.length === 0) return null;
  return (
    <div className="rp-guides">
      <h4>조사 대응 포인트</h4>
      {shown.map((r) => (
        <div className="rp-guide" key={r}>
          <b>{r}</b>
          <dl>
            <dt>확인 방법</dt><dd>{GUIDE[r].check}</dd>
            <dt>준비 증빙</dt><dd>{GUIDE[r].evidence.join(" · ")}</dd>
            <dt>권고 조치</dt><dd>{GUIDE[r].action}</dd>
            <dt>관련 법령</dt><dd>{GUIDE[r].basis}</dd>
          </dl>
        </div>
      ))}
    </div>
  );
}

export default function ReportView({ a }: { a: Analysis }) {
  const inCat = (...cats: Category[]) => a.findings.filter((f) => cats.includes(f.category));
  const hsFindings = inCat("품목분류", "세율·세액", "FTA·원산지");
  const priceFindings = inCat("과세가격");
  const rulesIn = (list: Finding[]) => [...new Set(list.map((f) => f.rule))];
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const cats: Category[] = ["품목분류", "세율·세액", "FTA·원산지", "수입요건", "과세가격"];
  const maxMonthly = Math.max(...a.price.monthly.map((m) => m.taxBaseKrw), 1);

  return (
    <article className="report">
      {/* 표지 */}
      <header className="rp-cover">
        <p className="rp-brand">JW CUSTOMS AUDIT SYSTEM</p>
        <h1>수입신고 적정성 검증 보고서</h1>
        <p className="rp-sub">과세가격 분야 · 품목분류(HS CODE) / 수입요건 / 수입단가의 적정성</p>
        <table className="rp-info">
          <tbody>
            <tr><th>검증 대상 자료</th><td>{a.meta.sourceName}</td></tr>
            <tr><th>신고 기간</th><td>{ymd(a.meta.dateFrom)} ~ {ymd(a.meta.dateTo)}</td></tr>
            <tr><th>검증 대상</th><td>수입신고 {n(a.meta.declCount)}건 · {n(a.meta.lineCount)}란 · 공급자 {n(a.meta.supplierCount)}곳</td></tr>
            <tr><th>과세가격 / 관세</th><td>{eok(a.meta.totalTaxBaseKrw)} / {eok(a.meta.totalDutyKrw)}</td></tr>
            <tr><th>작성일</th><td>{today}</td></tr>
            <tr><th>보고서 성격</th><td>관세조사 대비 사전 점검 자료 (검토 관세사의 확인 후 활용)</td></tr>
          </tbody>
        </table>
        <p className="rp-disclaimer">
          본 보고서는 수입신고 데이터에 기반한 사전 분석자료로서, 신고내용의 법적 적정성에 대한 최종 확인 또는 관세당국의 심사 결과를 의미하지 않습니다.
          검토 결과는 관련 증빙자료와 관계 법령에 근거하여 별도로 확인되어야 합니다.
        </p>
      </header>

      {/* 1. 종합 의견 */}
      <Section no="1." title="종합 의견">
        <div className="rp-kpis">
          <div><b>{a.grade.label}</b><span>검토 우선도</span></div>
          <div><b>{n(a.summary.findingCount)}건</b><span>검토 필요 항목</span></div>
          <div><b>{n(a.summary.bySeverity.높음)}건</b><span>우선 검토 (높음)</span></div>
          <div><b>{eok(a.exposure.taxBaseKrw)}</b><span>단가 저가 가능성 추정 과세가격 차이</span></div>
        </div>
        <p className="rp-lead">{a.grade.note} 검토 우선도는 전체 란 대비 '높음' 항목의 비중으로 산정한 참고 지표이며, 법적 위험도를 의미하지 않습니다.</p>

        <h3>1.1 분야별 검토 현황</h3>
        <table className="rp-table">
          <thead><tr><th>분야</th><th>검토 필요</th><th>높음</th><th>중간</th><th>참고</th></tr></thead>
          <tbody>
            {cats.map((c) => {
              const list = a.findings.filter((f) => f.category === c);
              const by = (s: string) => list.filter((f) => f.severity === s).length;
              return <tr key={c}><td>{c}</td><td>{list.length}건</td><td>{by("높음")}</td><td>{by("중간")}</td><td>{by("참고")}</td></tr>;
            })}
          </tbody>
        </table>

        <h3>1.2 핵심 검토사항</h3>
        <table className="rp-table">
          <thead><tr><th>구분</th><th>검토항목</th><th>분야</th><th>건수</th><th>해당 란 과세가격</th><th>권고 조치</th></tr></thead>
          <tbody>
            {a.ruleSummary.map((r) => (
              <tr key={r.rule}>
                <td><Sev s={r.severity} /></td>
                <td>{r.rule}</td>
                <td>{r.category}</td>
                <td>{n(r.count)}건</td>
                <td>{r.taxBaseKrw ? eok(r.taxBaseKrw) : "-"}</td>
                <td>{GUIDE[r.rule]?.action ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>1.3 추정 노출 규모 (참고)</h3>
        <p>
          동일 세번·규격·단위 품목의 중앙값보다 단가가 낮은 {n(a.exposure.lines)}개 란을 중앙값 단가로 환산하면, 과세가격이 약 <b>{eok(a.exposure.taxBaseKrw)}</b> 늘어나고
          관세는 약 <b>{eok(a.exposure.dutyKrw)}</b>(해당 란 적용세율 기준, 부가가치세 별도)에 해당합니다.
          이는 저가 신고 여부를 확정한 금액이 아니며, 규격·수량단위가 다른 물품이 같은 그룹으로 묶였을 가능성을 배제하지 못하는 단순 추정입니다.
          단가 폭이 50배를 넘는 그룹은 추정에서 제외했습니다.
        </p>
      </Section>

      {/* 2. 검증 범위 및 방법 */}
      <Section no="2." title="검증 범위 및 방법">
        <h3>2.1 대상 자료</h3>
        <p>
          UNI-PASS에서 내려받은 수입신고 내역(란 단위) 엑셀 {n(a.meta.specCount)}행을 신고번호·란번호 기준으로 정리하여
          {" "}{n(a.meta.declCount)}건 {n(a.meta.lineCount)}란을 분석했습니다. 수입단가 분석은 송장 품목(규격) 행 단위로 수행했습니다.
        </p>
        <h3>2.2 검증 항목 및 기준</h3>
        <table className="rp-table">
          <thead><tr><th>분야</th><th>검증 항목</th><th>판단 기준</th></tr></thead>
          <tbody>
            <tr><td rowSpan={3}>품목분류 · 세율</td><td>동일 품명 세번 일치</td><td>정규화한 품명이 같은데 세번이 다르면 지적 (4단위가 다르면 '높음')</td></tr>
            <tr><td>동일 세번 세율 일치</td><td>세번·원산지·세율구분이 같은데 적용세율이 다르면 지적</td></tr>
            <tr><td>관세액 재계산</td><td>과세가격 × 세율과 신고 관세액이 10원을 넘게 다르면 지적 (감면 건 제외)</td></tr>
            <tr><td rowSpan={2}>FTA · 원산지</td><td>증명 유무·상대국·증명서 번호</td><td>FTA 세율구분 대비 원산지증명 'N', 원산지 불일치, 증명서 번호 누락</td></tr>
            <tr><td>FTA 적용 혼재</td><td>같은 세번·원산지가 FTA와 일반세율로 섞여 신고되면 협정세율 누락 가능성 검토</td></tr>
            <tr><td>수입요건</td><td>요건확인 대상 후보</td><td>세번 앞자리 기준 후보 목록과 대조 (확정 목록 아님, 통합공고 대조 필요)</td></tr>
            <tr><td rowSpan={4}>과세가격</td><td>운임·보험료 가산</td><td>FOB·EXW·FCA·FAS 인도조건에서 운임(또는 보험료)이 0원이면 검토</td></tr>
            <tr><td>수입단가 적정성</td><td>동일 세번·규격·단위·통화 그룹(3건 이상, 2개 신고 이상)의 중앙값 대비 2배 이상(또는 1/2 이하)이면 지적, 3배 이상은 '높음'</td></tr>
            <tr><td>공급자 간 단가 차이</td><td>같은 규격에서 공급자별 중앙값이 1.5배 이상 차이나면 참고</td></tr>
            <tr><td>단가·수량·금액 산식</td><td>신고 단가 × 수량이 금액과 2% 넘게 다르면 참고, 란 금액 합계가 신고서 합계와 다르면 지적</td></tr>
          </tbody>
        </table>
        <h3>2.3 한계 및 제외 사항</h3>
        <ul className="rp-list">
          <li>단가 비교 그룹의 표본이 3건 미만이거나 한 신고서에만 있는 품목은 비교하지 못했습니다. 비교 가능 그룹이 전체 금액에서 차지하는 비중은 {a.price.coveragePct.toFixed(1)}%입니다.</li>
          <li>품목분류의 정확성은 물품의 성상·기능·용도에 대한 별도 검토가 필요하며, 본 보고서는 신고 간 일관성만 확인했습니다.</li>
          <li>FTA 적용의 적정성은 원산지증명서·원산지결정기준·직접운송 증빙 검토가 필요합니다.</li>
          <li>실제 거래가격, 가산·공제요소, 특수관계 영향은 계약·회계자료와 대조해야 확인됩니다.</li>
          {a.skipped.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </Section>

      {/* 3. 품목분류 */}
      <Section no="3." title="품목분류(HS CODE) 및 세율">
        <h3>3.1 세번 현황 (과세가격 상위)</h3>
        <p>신고된 세번은 총 {n(a.hs.distinctCodes)}개입니다.</p>
        <table className="rp-table">
          <thead><tr><th>HS CODE</th><th>대표 품명</th><th>란 수</th><th>과세가격</th><th>적용 세율</th><th>원산지</th></tr></thead>
          <tbody>
            {a.hs.top.slice(0, 15).map((h) => (
              <tr key={h.hsCode}><td className="nw">{h.hsCode}</td><td>{h.name}</td><td>{n(h.lines)}</td><td>{eok(h.taxBaseKrw)}</td><td>{h.rates}</td><td>{h.origins}</td></tr>
            ))}
          </tbody>
        </table>
        <h3>3.2 적용 세율구분 · 원산지 분포</h3>
        <div className="rp-two">
          <div><h4>세율구분</h4><Bars items={a.hs.rateTypeDist} /></div>
          <div><h4>원산지</h4><Bars items={a.hs.originDist} /></div>
        </div>
        <h3>3.3 검토대상</h3>
        <FindingTable rows={hsFindings} />
        <GuideBlock rules={rulesIn(hsFindings)} />
      </Section>

      {/* 4. 수입요건 */}
      <Section no="4." title="수입요건(세관장확인)">
        <p>
          세번 기준으로 요건확인 대상일 가능성이 있는 품목을 후보로 제시합니다. 확정 목록이 아니므로 품목 사양과 수출입공고·통합공고를 대조하여 대상 여부를 판단해야 합니다.
        </p>
        {a.req.candidates.length === 0 ? (
          <p className="rp-empty">후보 목록에 해당하는 세번이 확인되지 않았습니다.</p>
        ) : (
          <table className="rp-table">
            <thead><tr><th>HS CODE</th><th>품명</th><th>품목 구분</th><th>관련 법령</th><th>란 수</th><th>과세가격</th></tr></thead>
            <tbody>
              {a.req.candidates.map((c) => (
                <tr key={c.hsCode}><td className="nw">{c.hsCode}</td><td>{c.names}</td><td>{c.product}</td><td>{c.basis}</td><td>{c.lines}</td><td>{eok(c.taxBaseKrw)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="rp-note">
          요건확인서류 수가 입력된 신고 {n(a.req.docCountFilled)}건, 서류첨부 'Y' {n(a.req.docAttachedYes)}건입니다.
          {a.req.docCountFilled === 0 && " 해당 항목이 모두 비어 있어 요건확인서류의 실제 구비 여부는 판정하지 못했습니다. KC 인증서 등 요건 구비 증빙을 별도로 확인해야 합니다."}
        </p>
        <GuideBlock rules={a.req.candidates.length ? ["수입요건 확인 후보"] : []} />
      </Section>

      {/* 5. 과세가격 */}
      <Section no="5." title="과세가격 (수입단가의 적정성)">
        <h3>5.1 거래조건 현황</h3>
        <div className="rp-two">
          <div><h4>인도조건</h4><Bars items={a.price.incotermDist} /></div>
          <div><h4>결제방법</h4><Bars items={a.price.payMethodDist} /></div>
        </div>
        <div className="rp-two">
          <div><h4>거래구분</h4><Bars items={a.price.tradeTypeDist} /></div>
          <div><h4>공급자별 (상위)</h4><Bars items={a.price.supplierDist} limit={6} /></div>
        </div>

        <h3>5.2 가산요소 점검</h3>
        <table className="rp-table">
          <thead><tr><th>점검 내용</th><th>해당 신고</th><th>비고</th></tr></thead>
          <tbody>
            <tr><td>FOB 계열 인도조건인데 운임 0원</td><td>{n(a.price.fobNoFreight.length)}건</td><td>구매자 운임 부담 시 과세가격에 가산 필요</td></tr>
            <tr><td>FOB 계열 인도조건인데 보험료 0원</td><td>{n(a.price.fobNoInsurance.length)}건</td><td>무보험이면 문제 없음. 부보 여부 확인</td></tr>
            <tr><td>가산금(로열티 등) 신고</td><td>{n(a.price.addOns.length)}건</td><td>가산 근거와 계산 내역 보관</td></tr>
            <tr><td>가격신고서 'N'</td><td>{n(a.price.priceDeclNoCount)}건 ({eok(a.price.priceDeclNoTaxBase)})</td><td>가격신고 대상 여부 확인</td></tr>
          </tbody>
        </table>

        <h3>5.3 수입단가 적정성</h3>
        <p>
          송장 규격 단위로 금액 ÷ 수량을 단가로 계산하고, 동일 세번·규격·수량단위·통화 그룹 {n(a.price.groupsAnalyzed)}개 중 비교 가능한 {n(a.price.groupsEligible)}개 그룹(전체 금액의 {a.price.coveragePct.toFixed(1)}%)에서
          그룹 중앙값(작은 순으로 세웠을 때 가운데 값)과 비교했습니다. 중앙값의 2배 이상 또는 1/2 이하인 {n(a.price.flagTotal)}건이 확인되었습니다.
          {a.price.microLines > 0 && ` 금액이 1 미만인 샘플·무상 성격의 ${n(a.price.microLines)}행은 비교에서 제외했습니다.`}
        </p>
        {a.price.flags.length === 0 ? (
          <p className="rp-empty">중앙값에서 크게 벗어난 단가가 확인되지 않았습니다.</p>
        ) : (
          <table className="rp-table">
            <thead><tr><th>구분</th><th>신고번호-란</th><th>규격</th><th>단가</th><th>중앙값</th><th>배율</th><th>비교 건수 (범위)</th><th>수량</th><th>추정 차이(과세가격)</th></tr></thead>
            <tbody>
              {a.price.flags.slice(0, 30).map((f, i) => (
                <tr key={i}>
                  <td><Sev s={f.severity} /></td>
                  <td className="nw">{f.declarationNo}-{f.lineNo}</td>
                  <td>{f.name}<br /><small>{f.hsCode} · {f.supplier}</small></td>
                  <td className="nw">{fp(f.unitPrice)} {f.currency}/{f.unit}</td>
                  <td className="nw">{fp(f.median)}</td>
                  <td>{f.ratio.toFixed(2)}배</td>
                  <td>{f.samples}건 ({fp(f.min)}~{fp(f.max)})</td>
                  <td>{n(f.qty)}</td>
                  <td>{f.exposureTaxBaseKrw > 0 ? eok(f.exposureTaxBaseKrw) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {a.price.flagTotal > 30 && <p className="rp-more">상위 30건만 표시했습니다. 전체 {n(a.price.flagTotal)}건은 엑셀 보고서의 '단가 적정성' 시트에 있습니다.</p>}

        <h3>5.4 공급자 간 단가 차이</h3>
        {a.price.supplierGaps.length === 0 ? (
          <p className="rp-empty">같은 규격에서 공급자 간 단가 차이가 큰 품목이 확인되지 않았습니다.</p>
        ) : (
          <table className="rp-table">
            <thead><tr><th>규격</th><th>HS CODE</th><th>낮은 공급자(중앙값)</th><th>높은 공급자(중앙값)</th><th>배율</th></tr></thead>
            <tbody>
              {a.price.supplierGaps.slice(0, 12).map((g, i) => (
                <tr key={i}>
                  <td>{g.name}</td><td className="nw">{g.hsCode}</td>
                  <td>{g.low.supplier} ({fp(g.low.median)} {g.currency}/{g.unit}, {g.low.n}건)</td>
                  <td>{g.high.supplier} ({fp(g.high.median)}, {g.high.n}건)</td>
                  <td>{g.ratio.toFixed(1)}배</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3>5.5 단가·수량·금액 산식 불일치</h3>
        <p>신고 단가 × 수량이 금액과 2% 넘게 다른 행이 {n(a.price.calcMismatchTotal)}건 확인되었습니다. 단가 표시 단위 차이 또는 입력 오류일 수 있으며, 본 보고서의 단가 비교는 금액 ÷ 수량 기준입니다.</p>
        {a.price.calcMismatch.length > 0 && (
          <table className="rp-table">
            <thead><tr><th>신고번호-란</th><th>규격</th><th>신고 단가</th><th>수량</th><th>금액</th><th>금액÷수량</th><th>차이</th></tr></thead>
            <tbody>
              {a.price.calcMismatch.slice(0, 10).map((m, i) => (
                <tr key={i}>
                  <td className="nw">{m.declarationNo}-{m.lineNo}</td><td>{m.name}</td><td>{fp(m.declaredUnitPrice)}</td>
                  <td>{n(m.qty)} {m.unit}</td><td>{n(m.amount)} {m.currency}</td><td>{fp(m.impliedUnitPrice)}</td><td>{m.diffPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3>5.6 월별 신고 추이</h3>
        <div className="rp-bars">
          {a.price.monthly.map((m) => (
            <div className="rp-bar" key={m.label}>
              <span className="rp-bar-label">{m.label.slice(0, 4)}.{m.label.slice(4)}</span>
              <span className="rp-bar-track"><i style={{ width: `${(m.taxBaseKrw / maxMonthly) * 100}%` }} /></span>
              <span className="rp-bar-val">{m.count}건 · {eok(m.taxBaseKrw)}</span>
            </div>
          ))}
        </div>

        <h3>5.7 기타 검토대상</h3>
        <FindingTable rows={priceFindings.filter((f) => !["단가 적정성 검토", "단가·수량·금액 산식 불일치"].includes(f.rule))} />
        <GuideBlock rules={rulesIn(priceFindings)} />
      </Section>

      {/* 6. 조사 대응 */}
      <Section no="6." title="관세조사 대응 준비 사항">
        <h3>6.1 상시 보관 서류</h3>
        <ul className="rp-check">
          {GENERAL_READINESS.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <h3>6.2 대응 절차 제안</h3>
        <ol className="rp-list">
          <li>'높음' 항목부터 신고서·송장·결제 증빙과 대조하여 사유를 확인합니다.</li>
          <li>사유가 정당하면 설명 자료를 정리하고, 오류이면 수정신고 또는 경정청구 여부를 판단합니다.</li>
          <li>조사 통지 이전에 자진 수정신고하는 경우 가산세 감면 여부를 관세사와 검토합니다.</li>
          <li>품목분류가 불명확한 물품은 사전심사 신청을 검토하고, 이후 신고에 일관되게 반영합니다.</li>
          <li>검토 결과와 조치 내용을 신고건별로 기록하여 보관합니다.</li>
        </ol>
      </Section>

      {/* 7. 외환요소 */}
      <Section no="7." title="외환요소 (본 보고서 제외)" newPage={false}>
        <p>
          수입대금 지급과 수출대금 영수 등 외환거래 관련 사항은 ERP·원장·은행 거래 자료와의 대조가 필요하여 본 보고서에서 다루지 않았습니다. 해당 자료를 제공받으면 신고 금액과 실제 지급 내역의 일치 여부를 별도 분야로 검증합니다.
        </p>
      </Section>

      <footer className="rp-sign">
        <div><span>작성</span><i /></div>
        <div><span>검토 관세사</span><i /></div>
        <div><span>검토일</span><i /></div>
      </footer>
      <p className="rp-disclaimer">
        ※ 본 보고서의 법령 인용은 참고용이며, 활용 전 현행 법령과 관세청 고시를 확인해야 합니다. 본 보고서는 관세사의 확인 또는 법적 의견을 대체하지 않습니다.
      </p>
    </article>
  );
}
