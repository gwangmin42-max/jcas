"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    setError((await res.json().catch(() => ({}))).error ?? "로그인에 실패했습니다");
    setLoading(false);
  }

  return (
    <main className="login">
      <form className="card login-card" onSubmit={submit}>
        <h1>JW CUSTOMS AUDIT SYSTEM</h1>
        <p className="sub">수입신고 적정성 검증 서비스입니다. 발급받은 접속 비밀번호를 입력해 주십시오.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoFocus
          required
        />
        {error && <div className="err">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? "확인 중..." : "접속"}
        </button>
      </form>
    </main>
  );
}
