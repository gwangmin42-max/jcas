import { readFileSync } from "fs";
import { readLines, verifyLines } from "../lib/verify";

const file = process.argv[2];
if (!file) throw new Error("사용법: npm run check -- <엑셀 경로>");
const result = verifyLines(readLines(readFileSync(file)));
console.log(JSON.stringify(result.summary, null, 1));
console.log(result.skippedChecks);
const byRule: Record<string, number> = {};
for (const f of result.findings) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
console.log(byRule);
for (const rule of Object.keys(byRule)) {
  const sample = result.findings.filter((f) => f.rule === rule).slice(0, 2);
  console.log("\n##", rule);
  for (const s of sample) console.log(` ${s.declarationNo}-${s.lineNo} ${s.hsCode} ${s.itemName} :: ${s.message}`);
}
