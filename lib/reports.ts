import fs from "fs";
import path from "path";
import type { Report, ReportSummary } from "./types";

const reportDir = path.join(process.cwd(), "data", "reports");

function ensure() {
  fs.mkdirSync(reportDir, { recursive: true });
}

export function reportFile(id: string) {
  if (!/^report-\d+$/.test(id)) throw new Error("Unknown report");
  return path.join(reportDir, `${id}.json`);
}

export function uploadDir(id: string) {
  if (!/^report-\d+$/.test(id)) throw new Error("Unknown report");
  const dir = path.join(process.cwd(), "data", "uploads", id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function summarize(report: Report): ReportSummary {
  return {
    id: report.id,
    number: report.number,
    name: report.name,
    createdAt: report.createdAt,
    source: report.source,
    sourceName: report.sourceName,
    status: report.status,
    progress: report.progress,
    rowCount: report.rows.length,
  };
}

export function listReports(): ReportSummary[] {
  ensure();
  return fs
    .readdirSync(reportDir)
    .filter((name) => /^report-\d+\.json$/.test(name))
    .map((name) => readReport(name.replace(/\.json$/, "")))
    .filter((report): report is Report => Boolean(report))
    .sort((a, b) => b.number - a.number)
    .map(summarize);
}

export function readReport(id: string): Report | null {
  const file = reportFile(id);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Report;
}

export function writeReport(report: Report) {
  ensure();
  const file = reportFile(report.id);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(report, null, 2));
  fs.renameSync(tmp, file);
}

export function nextReportNumber() {
  ensure();
  const numbers = fs
    .readdirSync(reportDir)
    .map((name) => Number(/^report-(\d+)\.json$/.exec(name)?.[1] || 0));
  const max = numbers.reduce((highest, value) => Math.max(highest, value), 0);
  return max + 1;
}

let queue: Promise<void> = Promise.resolve();

export function updateReport(id: string, change: (report: Report) => void) {
  const run = queue.then(() => {
    const report = readReport(id);
    if (!report) return;
    change(report);
    writeReport(report);
  });
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
