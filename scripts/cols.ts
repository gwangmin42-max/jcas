import { readFileSync } from "fs";
import { readRaw } from "../lib/verify";
const raws = readRaw(readFileSync(process.argv[2]));
console.log(Object.keys(raws[0]).join(" | "));
const g = (k: string) => [...new Set(raws.map((r) => String((r as any)[k] ?? "")))].slice(0, 12);
for (const k of ["거래구분", "관세감면구분", "관세감면부호", "감면부호", "부가세감면부호", "부가세감면율구분", "신고구분", "수입종류", "징수형태", "세율구분"]) console.log(k, g(k));
const free = raws.filter((r: any) => ["87", "94"].includes(String(r["거래구분"])));
console.log(free.slice(0, 3).map((r: any) => ({ no: r["신고번호"], 거래구분: r["거래구분"], 금액: r["금액"], 품명: r["거래품명"], 결제방법: r["결제방법"], 과세가격: r["과세가격원화"] })));
