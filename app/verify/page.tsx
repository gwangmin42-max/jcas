"use client";

import { useRef, useState } from "react";
import type { VerifyResult, Category } from "@/lib/verify";

const CATEGORIES: Category[] = ["품목분류", "세율·세액", "FTA·원산지", "과세가격"];

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
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
      <h1>수입신고 검증</h1>
      <p className="sub">UNI-PASS 수입신고 내역(란 단위) 엑셀을 올리면, 성실신고 확인 때 다시 볼 의심 건을 찾아 줍니다.</p>

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
          {loading ? "검증 중..." : file ? `${file.name} (다른 파일을 올리려면 클릭)` : "여기에 엑셀 파일을 끌어다 놓거나 클릭해서 선택하세요"}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xls,.xlsx"
          hidden
          onChange={(e) => { const picked = e.target.files?.[0]; if (picked) verify(picked); e.target.value = ""; }}
        />
        {error && <div className="err">{error}</div>}
        <p className="foot">파일은 검증에만 사용되며 서버에 저장되지 않습니다. (최대 4MB)</p>
      </div>

      {result && (
        <>
          <div className="card">
            <div className="stats">
              <div className="stat"><b>{result.summary.declarationCount.toLocaleString()}건</b><span>신고 ({result.summary.lineCount.toLocaleString()}란)</span></div>
              <div className="stat"><b>{result.summary.dateFrom} ~ {result.summary.dateTo}</b><span>신고 기간</span></div>
              <div className="stat"><b>{(result.summary.totalTaxBaseKrw / 100000000).toFixed(1)}억원</b><span>과세가격 합계</span></div>
              <div className="stat"><b>{result.summary.findingCount.toLocaleString()}건</b><span>확인 필요 (높음 {result.summary.bySeverity.높음})</span></div>
            </div>
            {result.skippedChecks.map((note) => <div className="note" key={note}>{note}</div>)}
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <b>확인 필요 목록</b>
              <button onClick={download}>리포트 엑셀 다운로드</button>
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
                  <tr><th>중요도</th><th>검사 항목</th><th>신고번호-란</th><th>세번</th><th>품명</th><th>내용</th></tr>
                </thead>
                <tbody>
                  {findings.map((f, i) => (
                    <tr key={i}>
                      <td><span className={`sev ${f.severity}`}>{f.severity}</span></td>
                      <td>{f.rule}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{f.declarationNo}-{f.lineNo}</td>
                      <td>{f.hsCode}</td>
                      <td>{f.itemName}</td>
                      <td>{f.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {findings.length === 0 && <p style={{ padding: 16, color: "var(--muted)" }}>해당 분야에서 확인 필요 항목이 없습니다.</p>}
            </div>
            <p className="foot">오류 확정이 아니라 확인 대상을 좁힌 결과입니다. 최종 판단은 전문가가 합니다.</p>
          </div>
        </>
      )}
    </main>
  );
}
