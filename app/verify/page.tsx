"use client";

import { useRef, useState } from "react";
import type { Category } from "@/lib/verify";
import type { Analysis } from "@/lib/analysis";
import ReportView from "@/components/ReportView";

const CATEGORIES: Category[] = ["품목분류", "세율·세액", "FTA·원산지", "수입요건", "과세가격"];

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [view, setView] = useState<"list" | "report">("list");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [category, setCategory] = useState<Category | "전체">("전체");

  async function verify(selected: File) {
    if (selected.size > 4 * 1024 * 1024) {
      setError("파일이 4MB를 넘습니다. 기간을 나누어 올려 주세요.");
      return;
    }
    setFile(selected);
    setResult(null);
    setView("list");
    setError("");
    setLoading(true);
    const body = new FormData();
    body.append("file", selected);
    try {
      const res = await fetch("/api/verify", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "검증에 실패했습니다");
      else setResult(data);
    } catch {
      setError("서버에 연결할 수 없습니다");
    }
    setLoading(false);
  }

  async function download() {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/report", { method: "POST", body });
    if (!res.ok) {
      setError((await res.json()).error ?? "리포트 생성에 실패했습니다");
      return;
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = "성실신고_검증결과.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  const findings = result?.findings.filter((f) => category === "전체" || f.category === category) ?? [];

  return (
    <main>
      <h1>수입신고 적정성 검증</h1>
      <p className="sub">UNI-PASS 수입신고 내역(란 단위) 파일을 업로드하면 품목분류, 관세율, FTA 협정세율 및 과세가격의 정합성을 분석하여 전문 검토가 필요한 신고건을 선별합니다.</p>

      <div className="card">
        <div
          className={`drop${over ? " over" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const dropped = e.dataTransfer.files[0];
            if (dropped) verify(dropped);
          }}
        >
          {loading ? "분석 중..." : file ? `${file.name} (다른 파일을 선택하려면 클릭)` : "분석할 수입신고 내역 파일(엑셀)을 이곳에 끌어다 놓거나 클릭하여 선택해 주십시오"}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xls,.xlsx"
          hidden
          onChange={(e) => { const picked = e.target.files?.[0]; if (picked) verify(picked); e.target.value = ""; }}
        />
        {error && <div className="err">{error}</div>}
        <p className="foot">업로드 자료는 검증 목적으로만 처리하며 서버에 별도로 보관하지 않습니다. (최대 4MB)</p>
      </div>

      {result && (
        <>
          <div className="card">
            <div className="stats">
              <div className="stat"><b>{result.summary.declarationCount.toLocaleString()}건</b><span>신고 ({result.summary.lineCount.toLocaleString()}란)</span></div>
              <div className="stat"><b>{result.summary.dateFrom} ~ {result.summary.dateTo}</b><span>신고 기간</span></div>
              <div className="stat"><b>{(result.summary.totalTaxBaseKrw / 100000000).toFixed(1)}억원</b><span>과세가격 합계</span></div>
              <div className="stat"><b>{result.summary.findingCount.toLocaleString()}건</b><span>검토 필요 (우선 검토 {result.summary.bySeverity.높음})</span></div>
            </div>
            {result.skipped.map((note) => <div className="note" key={note}>{note}</div>)}
          </div>

          <div className="tabs no-print">
            <button className={`chip${view === "list" ? " on" : ""}`} onClick={() => setView("list")}>검토대상 목록</button>
            <button className={`chip${view === "report" ? " on" : ""}`} onClick={() => setView("report")}>상세 보고서</button>
          </div>

          {view === "report" && (
            <>
              <div className="card no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span>관세조사 대비 상세 보고서입니다. PDF로 저장하려면 인쇄 창에서 대상을 'PDF로 저장'으로 선택해 주십시오.</span>
                <span style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => window.print()}>PDF로 저장 / 인쇄</button>
                  <button onClick={download}>엑셀 다운로드</button>
                </span>
              </div>
              <ReportView a={result} />
            </>
          )}

          {view === "list" && <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <b>검토대상 목록</b>
              <button onClick={download}>검증 보고서(엑셀) 다운로드</button>
            </div>
            <div className="filters">
              {(["전체", ...CATEGORIES] as const).map((c) => (
                <button key={c} className={`chip${category === c ? " on" : ""}`} onClick={() => setCategory(c)}>
                  {c} {c === "전체" ? result.summary.findingCount : result.summary.byCategory[c]}
                </button>
              ))}
            </div>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr><th>구분</th><th>검토항목</th><th>신고번호-란</th><th>HS CODE</th><th>품명</th><th>주요 확인사항</th></tr>
                </thead>
                <tbody>
                  {findings.map((f, i) => (
                    <tr key={i}>
                      <td><span className={`sev ${f.severity}`}>{f.severity}</span></td>
                      <td>{f.rule}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{f.declarationNo ? `${f.declarationNo}-${f.lineNo}` : "-"}</td>
                      <td>{f.hsCode}</td>
                      <td>{f.itemName}</td>
                      <td>{f.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {findings.length === 0 && <p style={{ padding: 16, color: "var(--muted)" }}>해당 분야에서 검토가 필요한 항목이 확인되지 않았습니다.</p>}
            </div>
            <p className="foot">본 검증 결과는 수입신고 데이터에 기반한 사전 분석자료로서 신고내용의 법적 적정성에 대한 최종 확인을 의미하지 않으며, 관련 증빙자료와 관계 법령에 근거한 전문가의 검토가 필요합니다.</p>
          </div>}
        </>
      )}
    </main>
  );
}
