import { readFileSync, writeFileSync } from "fs";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { analyze } from "../lib/analysis";
import { buildReport } from "../lib/report";
import ReportView from "../components/ReportView";
(globalThis as any).React = React;
(async () => {
  const a = analyze(readFileSync(process.argv[2]), "수입실적.xls");
  const css = readFileSync("app/globals.css", "utf8");
  const html = renderToStaticMarkup(React.createElement(ReportView, { a }));
  writeFileSync(process.argv[3] + "/report.html", `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${css}</style></head><body><main>${html}</main></body></html>`);
  writeFileSync(process.argv[3] + "/report.xlsx", await buildReport(a));
  console.log("ok");
})();
