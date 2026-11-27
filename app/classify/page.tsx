"use client";

import { useState } from "react";
import HsLookup from "@/components/HsLookup";
import type { Analysis, ClassifyInput, Enriched, Opinion } from "@/lib/classify";

type Result = { input: ClassifyInput; analysis: Analysis; enriched: Enriched[] };
const CONF = { high: "높음", medium: "보통", low: "낮음" } as const;
const EMPTY: ClassifyInput = { name: "", usage: "", material: "", structure: "", spec: "", extra: "" };

export default function ClassifyPage() {
  const [form, setForm] = useState<ClassifyInput>(EMPTY);
  const [res, setRes] = useState<Result | null>(null);
  const [chosen, setChosen] = useState(0);
  const [opinion, setOpinion] = useState<Opinion | null>(null);
  const [loading, setLoading] = useState(false);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof ClassifyInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setRes(null);
    setOpinion(null);
    setChosen(0);
    try {
      const r = await fetch("/api/classify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "분석에 실패했습니다.");
      setRes(j);
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function makeOpinion() {
    if (!res) return;
    setWriting(true);
    setError("");
    try {
      const r = await fetch("/api/classify/opinion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...res, chosen }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "의견서 작성에 실패했습니다.");
      setOpinion(j.opinion);
      setTimeout(() => document.getElementById("opinion")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "의견서 작성에 실패했습니다.");
    } finally {
      setWriting(false);
    }
  }

  async function download() {
    const r = await fetch("/api/classify/docx", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opinion }) });
    if (!r.ok) {
      setError("파일 생성에 실패했습니다.");
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await r.blob());
    a.download = "품목분류_분류의견서.docx";
    a.click();
  }

  const c = res?.analysis.candidates[chosen];
  const en = res?.enriched[chosen];

  return (
    <main className="cls">
      <h1>품목분류 검토</h1>
      <p className="sub">HS코드·품명을 입력하면 관세율, 수입요건, 한국 분류사례를 바로 조회합니다. 아래 AI 검토는 품명·용도로 판단 근거와 한국·미국(CBP) 사례를 정리하고 사전심사용 분류의견서 초안을 작성합니다.</p>

      <section className="cls-card">
        <h2>HS·세율·사례 조회</h2>
        <HsLookup
          onPick={(hs) => {
            setForm((f) => ({ ...f, extra: `검토 대상 HS: ${hs.replace(/^(\d{4})(\d{2})(\d{4})$/, "$1.$2-$3")}${f.extra ? " / " + f.extra : ""}` }));
            document.getElementById("ai-form")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      </section>

      <h2 className="cls-h2" id="ai-form">AI 품목분류 검토</h2>

      <form className="cls-form" onSubmit={run}>
        <label>
          품명 *
          <input value={form.name} onChange={set("name")} placeholder="예: 무선 블루투스 이어폰" required />
        </label>
        <label>
          용도 *
          <input value={form.usage} onChange={set("usage")} placeholder="예: 스마트폰과 연결하여 음악 청취·통화" required />
        </label>
        <label>
          재질·성분
          <input value={form.material} onChange={set("material")} placeholder="예: ABS 수지 케이스, 리튬폴리머 배터리" />
        </label>
        <label>
          구조·기능·작동원리
          <textarea rows={3} value={form.structure} onChange={set("structure")} placeholder="예: 블루투스 5.3 수신, 마이크 내장, 충전 케이스 포함" />
        </label>
        <div className="cls-row">
          <label>
            규격·형태
            <input value={form.spec} onChange={set("spec")} placeholder="모델명, 크기, 전압 등" />
          </label>
          <label>
            기타 참고사항
            <input value={form.extra} onChange={set("extra")} placeholder="세트 구성, 수입 형태(부품/완제품) 등" />
          </label>
        </div>
        <button className="cls-btn" disabled={loading}>
          {loading ? "분석 중… (1~2분 소요)" : "품목분류 검토"}
        </button>
      </form>
      {error && <p className="cls-err">{error}</p>}

      {res && (
        <section className="cls-res">
          <div className="cls-card">
            <h2>검토 결과</h2>
            <p>{res.analysis.summary}</p>
            {res.analysis.missingInfo.length > 0 && (
              <div className="cls-warn">
                <b>판단에 더 필요한 정보</b>
                <ul>
                  {res.analysis.missingInfo.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="cls-tabs">
            {res.analysis.candidates.map((k, i) => (
              <button key={i} className={i === chosen ? "on" : ""} onClick={() => setChosen(i)}>
                {k.hs6} <small>{k.nameKo}</small>
              </button>
            ))}
          </div>

          {c && (
            <div className="cls-card">
              <h2>
                {c.hs6} {c.nameKo} <span className={`cls-conf ${c.confidence}`}>확신도 {CONF[c.confidence]}</span>
              </h2>
              <h3>판단 근거</h3>
              <ul>
                {c.reasoning.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
              {c.gri.length > 0 && <p className="cls-meta">적용 통칙: {c.gri.join(", ")}</p>}
              {c.excluded && (
                <>
                  <h3>경합 호 비교·유의점</h3>
                  <p>{c.excluded}</p>
                </>
              )}

              <h3>관세율·수입요건 (관세청 UNI-PASS)</h3>
              {en?.verified ? (
                <>
                  <p>
                    <b>{en.verified.hs.replace(/^(\d{4})(\d{2})(\d{4})$/, "$1.$2-$3")}</b> {en.verified.name} · 기본 {en.verified.basic ?? "-"}%
                    {en.verified.wto && ` · WTO ${en.verified.wto}%`}
                  </p>
                  {en.verified.fta.length > 0 && (
                    <details>
                      <summary>협정세율 {en.verified.fta.length}건</summary>
                      <p className="cls-meta">{en.verified.fta.map((f) => `${f.label} ${f.rate}%`).join(" · ")}</p>
                    </details>
                  )}
                  {en.requirements ? (
                    en.requirements.length ? (
                      <ul>
                        {en.requirements.map((r, i) => (
                          <li key={i}>
                            <b>{r.law}</b> · {r.agency} · {r.doc}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="cls-meta">세관장확인 대상 요건 없음</p>
                    )
                  ) : (
                    <p className="cls-meta">{en.requirementsNote}</p>
                  )}
                </>
              ) : (
                <p className="cls-meta">{en?.requirementsNote}</p>
              )}
              {res.analysis.requirementsNote.length > 0 && (
                <>
                  <h3>수입요건 검토 참고</h3>
                  <ul>
                    {res.analysis.requirementsNote.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          <div className="cls-card">
            <h2>유사 분류사례</h2>
            <h3>한국</h3>
            {res.analysis.koreaCases.length === 0 && (en?.domesticCases.length ?? 0) === 0 && <p className="cls-meta">확인된 사례가 없습니다.</p>}
            <ul>
              {res.analysis.koreaCases.map((x, i) => (
                <li key={`a${i}`}>
                  <CaseItem c={x} />
                </li>
              ))}
              {en?.domesticCases.map((d, i) => (
                <li key={`d${i}`}>
                  {d.title}{" "}
                  <span className="cls-meta">{[d.set, d.no, d.date].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
            <h3>미국 (CBP Rulings)</h3>
            {res.analysis.usCases.length === 0 ? (
              <p className="cls-meta">확인된 사례가 없습니다.</p>
            ) : (
              <ul>
                {res.analysis.usCases.map((x, i) => (
                  <li key={i}>
                    <CaseItem c={x} />
                  </li>
                ))}
              </ul>
            )}
            <p className="cls-meta">※ 사례는 AI 웹검색과 HS BOX 색인으로 수집한 것으로, 인용 전에 원문 확인이 필요합니다.</p>
          </div>

          <div className="cls-card cls-cta">
            <div>
              <b>품목분류 사전심사 대비 분류의견서</b>
              <p className="cls-meta">
                선택한 분류({c?.hs6} {c?.nameKo})를 근거로 의견서 초안을 작성합니다.
              </p>
            </div>
            <button className="cls-btn" onClick={makeOpinion} disabled={writing}>
              {writing ? "작성 중…" : "분류의견서 작성"}
            </button>
          </div>

          {res.analysis.caveats.length > 0 && <p className="cls-meta">※ {res.analysis.caveats.join(" / ")}</p>}
        </section>
      )}

      {opinion && (
        <section id="opinion" className="cls-card cls-op">
          <div className="cls-op-head">
            <h2>{opinion.title}</h2>
            <button className="cls-btn" onClick={download}>
              Word 다운로드
            </button>
          </div>
          <p className="cls-meta">AI 초안입니다. 관세사 검토·수정 후 사용하세요. “(신청인 기재 필요)” 항목은 직접 채워야 합니다.</p>
          <table className="cls-tbl">
            <tbody>
              {opinion.goods.map((g, i) => (
                <tr key={i}>
                  <th>{g.label}</th>
                  <td>{g.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <b>
              신청 세번: {opinion.proposedHs} {opinion.proposedName}
            </b>
          </p>
          {opinion.sections.map((s, i) => (
            <div key={i}>
              <h3>{s.heading}</h3>
              {s.paragraphs.map((x, j) => (
                <p key={j}>{x}</p>
              ))}
            </div>
          ))}
          {opinion.comparison?.length > 0 && (
            <>
              <h3>경합 호 비교</h3>
              <table className="cls-tbl">
                <tbody>
                  {opinion.comparison.map((x, i) => (
                    <tr key={i}>
                      <th>
                        {x.hs} {x.name}
                      </th>
                      <td>
                        <b>{x.verdict}</b> — {x.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {opinion.cases?.length > 0 && (
            <>
              <h3>관련 사례</h3>
              <ul>
                {opinion.cases.map((x, i) => (
                  <li key={i}>
                    [{x.kind}] {x.title} ({x.ref}) — {x.point}
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3>결론</h3>
          <p>{opinion.conclusion}</p>
          {opinion.attachments?.length > 0 && (
            <>
              <h3>첨부 권장 자료</h3>
              <ul>
                {opinion.attachments.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </main>
  );
}

function CaseItem({ c }: { c: { title: string; ref?: string; url?: string; summary: string; relevance?: string } }) {
  return (
    <>
      {c.url ? (
        <a href={c.url} target="_blank" rel="noreferrer">
          {c.title}
        </a>
      ) : (
        <b>{c.title}</b>
      )}{" "}
      {c.ref && <span className="cls-meta">{c.ref}</span>}
      <div>
        {c.summary}
        {c.relevance && <span className="cls-meta"> — {c.relevance}</span>}
      </div>
    </>
  );
}
