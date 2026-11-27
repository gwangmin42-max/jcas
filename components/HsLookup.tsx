"use client";

// HS·세율·수입요건·분류사례 즉시 조회 (AI 없이 동작)
import { useState } from "react";

type Head = { id: string; title: string; no?: string; date?: string; org?: string };
type HsRate = { code: string; label: string; rate: string };
type HsItem = { hs: string; name: string; unit: string; rates: HsRate[] };
type Req = { law: string; agency: string; doc: string };
type Group = { key: string; label: string; total: number; top: Head[] };
type ClipCase = { rrdcNo: string; hs: string; name: string; desc: string; reason: string; org: string; date: string; url: string };
type Clip = { total: number; items: ClipCase[] } | string;
type Result = { clip: Clip; query: string; isHs: boolean; digits: string; hsItems: HsItem[]; hsTotal: number; hsNote?: string; groups: Group[] };

const SETS = [
  { key: "cgm", label: "관세청 법령해석" },
  { key: "tt", label: "조세심판원 결정(관세)" },
  { key: "prec", label: "판례" },
];
const EXAMPLES = ["8517.13", "8517.13-0000", "리튬이온 배터리", "스테인리스 볼트"];

const setCache: Record<string, Head[]> = {};
async function loadSet(key: string): Promise<Head[]> {
  if (!setCache[key]) setCache[key] = (await (await fetch(`/case-data/${key}.json`)).json()).items;
  return setCache[key];
}
let hsIndex: Record<string, string[]> | null = null;
async function loadIdx() {
  if (!hsIndex) hsIndex = await (await fetch("/case-data/hsindex.json")).json();
  return hsIndex!;
}

const fmt = (h: string) => h.replace(/^(\d{4})(\d{2})(\d{4})$/, "$1.$2-$3");

export default function HsLookup({ onPick }: { onPick?: (hs: string) => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [reqs, setReqs] = useState<Record<string, Req[] | string>>({});

  async function run(raw: string) {
    const query = raw.trim();
    if (!query) return;
    setLoading(true);
    setReqs({});
    const digits = query.replace(/[\s.\-]/g, "");
    const isHs = /^\d{4,10}$/.test(digits);

    const refs = new Set<string>();
    if (isHs) {
      try {
        const idx = await loadIdx();
        for (const len of [10, 6, 4])
          if (digits.length >= len) for (const r of idx[digits.slice(0, len)] ?? []) refs.add(r);
      } catch { /* 색인 실패 시 사례 없음 */ }
    }
    const groups = await Promise.all(
      SETS.map(async (s) => {
        try {
          const items = await loadSet(s.key);
          const hit = items.filter((h) => (isHs ? refs.has(`${s.key}:${h.id}`) : h.title.includes(query)));
          return { key: s.key, label: s.label, total: hit.length, top: hit.slice(0, 8) };
        } catch {
          return { key: s.key, label: s.label, total: 0, top: [] };
        }
      })
    );

    let clip: Clip = "조회 중…";
    try {
      const cj = await (await fetch(`/api/clip?q=${encodeURIComponent(query)}`)).json();
      clip = cj.ok ? { total: cj.total, items: cj.items } : cj.error;
    } catch {
      clip = "관세청 품목분류사례 조회에 실패했습니다.";
    }

    let hsItems: HsItem[] = [];
    let hsTotal = 0;
    let hsNote: string | undefined;
    if (!isHs || digits.length === 10) {
      try {
        const j = await (await fetch(isHs ? `/api/hs?hs=${digits}` : `/api/hs?name=${encodeURIComponent(query)}`)).json();
        if (j.ok) { hsItems = j.items; hsTotal = j.total; } else hsNote = /not set/.test(j.error ?? "") ? "UNIPASS_HS_KEY 환경변수가 설정되지 않아 HS·세율을 조회할 수 없습니다." : j.error;
      } catch { hsNote = "HS·세율 조회에 실패했습니다."; }
    } else {
      hsNote = "HS 10자리를 입력하면 관세율이 조회됩니다. 품명으로 검색하면 HS 목록이 나옵니다.";
    }
    setRes({ clip, query, isHs, digits, hsItems, hsTotal, hsNote, groups });
    setLoading(false);
  }

  async function loadReq(hs: string) {
    setReqs((r) => ({ ...r, [hs]: "조회 중…" }));
    try {
      const j = await (await fetch(`/api/requirements?hs=${hs}&type=2`)).json();
      setReqs((r) => ({ ...r, [hs]: j.ok ? j.items : (/not set/.test(j.error ?? "") ? "DATA_GO_KR_KEY 환경변수가 필요합니다." : j.error) }));
    } catch {
      setReqs((r) => ({ ...r, [hs]: "수입요건 조회에 실패했습니다." }));
    }
  }

  return (
    <div className="lk">
      <form className="lk-form" onSubmit={(e) => { e.preventDefault(); run(text); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="HS코드(세번) 또는 품명 입력 (예: 8517.13, 리튬이온 배터리)" />
        <button className="cls-btn" disabled={loading}>{loading ? "조회 중…" : "조회"}</button>
      </form>
      <div className="lk-ex">
        예시
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => { setText(ex); run(ex); }}>{ex}</button>
        ))}
      </div>

      {res && (
        <div className="lk-res">
          <h3>“{res.query}” 조회 결과</h3>

          <h4>HS코드·관세율 (관세청 UNI-PASS){res.hsTotal > res.hsItems.length && ` · 상위 ${res.hsItems.length}건 / 전체 ${res.hsTotal.toLocaleString()}건`}</h4>
          {res.hsItems.length ? (
            <ul className="lk-list">
              {res.hsItems.map((t) => {
                const basic = t.rates.find((r) => r.code === "A");
                const wto = t.rates.find((r) => r.code === "C");
                const fta = t.rates.filter((r) => r.code.startsWith("F"));
                const rq = reqs[t.hs];
                return (
                  <li key={t.hs}>
                    <div>
                      <b className="mono">{fmt(t.hs)}</b> {t.name} <span className="cls-meta">단위 {t.unit}</span>
                      <span className="lk-rate">기본 {basic ? basic.rate + "%" : "-"}</span>
                      {wto && <span className="cls-meta"> WTO {wto.rate}%</span>}
                    </div>
                    {fta.length > 0 && (
                      <details>
                        <summary>협정세율 {fta.length}건</summary>
                        <div className="lk-fta">{fta.map((r) => <span key={r.code}>{r.label} {r.rate}%</span>)}</div>
                      </details>
                    )}
                    <div className="lk-acts">
                      <button type="button" onClick={() => loadReq(t.hs)}>수입요건 보기</button>
                      {onPick && <button type="button" onClick={() => onPick(t.hs)}>이 HS로 AI 검토 시작</button>}
                    </div>
                    {rq && (typeof rq === "string" ? <p className="cls-meta">{rq}</p> : rq.length ? (
                      <ul className="lk-req">{rq.map((r, i) => <li key={i}><b>{r.law}</b> · {r.agency} · {r.doc}</li>)}</ul>
                    ) : <p className="cls-meta">세관장확인 대상 요건이 없습니다.</p>)}
                  </li>
                );
              })}
            </ul>
          ) : <p className="cls-meta">{res.hsNote ?? "검색 결과가 없습니다."}</p>}

          <h4>관세청 품목분류 사례 (UNI-PASS 공식){typeof res.clip !== "string" && ` · 전체 ${res.clip.total.toLocaleString()}건${res.clip.total > res.clip.items.length ? ` 중 상위 ${res.clip.items.length}건` : ""}`}</h4>
          {typeof res.clip === "string" ? (
            <p className="cls-meta">{res.clip}</p>
          ) : res.clip.items.length === 0 ? (
            <p className="cls-meta">해당 조건의 품목분류 사례가 없습니다. (4자리·6자리로 넓혀 보세요)</p>
          ) : (
            <ul className="lk-list">
              {res.clip.items.map((c) => (
                <li key={c.rrdcNo}>
                  <div>
                    <b className="mono">{c.hs}</b> {c.name}
                  </div>
                  <div className="cls-meta">{[c.org, c.date, c.rrdcNo].filter(Boolean).join(" · ")}</div>
                  <details>
                    <summary>물품설명·결정사유 보기</summary>
                    {c.desc && <p className="lk-txt"><b>물품설명</b>{"\n"}{c.desc}</p>}
                    {c.reason && <p className="lk-txt"><b>결정사유</b>{"\n"}{c.reason}</p>}
                    <a href={c.url} target="_blank" rel="noreferrer">UNI-PASS 원문 보기</a>
                  </details>
                </li>
              ))}
            </ul>
          )}

          <h4>미국 관세청(CBP) 사례</h4>
          <p className="cls-meta">
            <a href={`https://rulings.cbp.gov/search?term=${encodeURIComponent(res.isHs ? res.digits.slice(0, 4) + (res.digits.length >= 6 ? "." + res.digits.slice(4, 6) : "") : res.query)}&collection=ALL&sortBy=RELEVANCE&pageSize=30&page=1`} target="_blank" rel="noreferrer">
              CBP CROSS에서 “{res.isHs ? res.digits.slice(0, 4) + (res.digits.length >= 6 ? "." + res.digits.slice(4, 6) : "") : res.query}” 검색 ↗
            </a>{" "}
            · 미국 사례는 영문 품명 또는 HTS 번호로 검색하면 정확합니다.
          </p>

          <h4>관련 법령해석·심판·판례 (한국)</h4>
          {res.groups.map((g) => (
            <div key={g.key} className="lk-grp">
              <b>{g.label}</b> <span className="cls-meta">{g.total.toLocaleString()}건{g.total > g.top.length && ` · 상위 ${g.top.length}건`}</span>
              <ul>{g.top.map((h) => <li key={h.id}>{h.title} <span className="cls-meta">{[h.no, h.date, h.org].filter(Boolean).join(" · ")}</span></li>)}</ul>
            </div>
          ))}
          {res.isHs && <p className="cls-meta">※ 세율은 관세청 UNI-PASS 기준 참고용입니다. 사례·판례는 제목·본문에 해당 호(4자리)·소호(6자리)가 언급된 자료이며, 같은 호의 다른 소호 자료가 함께 나올 수 있습니다.</p>}
        </div>
      )}
    </div>
  );
}
