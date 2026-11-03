import { readFileSync } from "fs";
import { analyze, countByArea } from "../lib/analysis";

const file = process.argv[2];
const a = analyze(readFileSync(file), file);
console.log(JSON.stringify(a.meta, null, 1));
console.log("areas", countByArea(a));
console.log("hs top", a.hs.top.slice(0, 3));
console.log("req", a.req.candidates.length, a.req.docCountFilled, a.req.attachedDocValues);
console.log("fobNoIns", a.price.fobNoInsurance.length, "fobNoFreight", a.price.fobNoFreight.length, "addOns", a.price.addOns.length, "priceDeclN", a.price.priceDeclNoCount);
console.log("groups", a.price.groupsAnalyzed, a.price.groupsEligible, a.price.coveragePct.toFixed(1) + "%", "flags", a.price.flagTotal);
console.log(a.price.flags.slice(0, 3));
console.log("gaps", a.price.supplierGaps.slice(0, 2));
console.log(a.price.incotermDist, a.price.tradeTypeDist, a.price.payMethodDist);
