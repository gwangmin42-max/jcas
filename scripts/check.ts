import { readFileSync } from "fs";
import { analyze } from "../lib/analysis";
const a = analyze(readFileSync(process.argv[2]), "sample");
console.log(a.summary, a.grade, a.exposure);
console.log(a.ruleSummary);
console.log("json KB", Math.round(JSON.stringify(a).length / 1024));
console.log(a.price.flags[0]);
