import { readFileSync, writeFileSync } from "fs";
import { analyze } from "../lib/analysis";
import { buildDocx } from "../lib/docxReport";
(async () => {
  const a = analyze(readFileSync(process.argv[2]), "수입실적.xls");
  writeFileSync(process.argv[3], await buildDocx(a));
  console.log("ok");
})();
