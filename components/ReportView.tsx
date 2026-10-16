import { overlapPercent, reportStats, titleOverlap } from "@/lib/overlap";
import type { Report } from "@/lib/types";

function overlapClass(value: number | null) {
  if (value == null) return "text-[var(--muted)]";
  if (value >= 0.5) return "text-[#1f6b4a]";
  if (value >= 0.3) return "text-[#8a5a12]";
  return "text-[#9a3b2f]";
}

export function ReportView({ report }: { report: Report }) {
  const running = report.status === "running";
  const stats = reportStats(report);
  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{report.sourceName}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{report.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-[var(--muted)]">
            {running
              ? `${report.progress.done} of ${report.progress.total}`
              : report.status === "error"
                ? "Stopped"
                : `${report.rows.length} shown`}
          </p>
          <a
            href={`/api/reports/${report.id}/pdf`}
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Download PDF
          </a>
        </div>
      </div>
      {running ? (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e7e4dc]">
          <div
            className="h-full bg-[var(--accent)]"
            style={{
              width: `${report.progress.total ? (report.progress.done / report.progress.total) * 100 : 0}%`,
            }}
          />
        </div>
      ) : null}
      {report.error ? <p className="mt-4 text-sm text-[#9a3b2f]">{report.error}</p> : null}

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--line)] bg-white px-3.5 py-3">
          <b className="block text-[22px]">{stats.compared}</b>
          <span className="text-[13px] text-[var(--muted)]">Compared</span>
        </div>
        {stats.generators.map((generator) => (
          <div key={generator.id} className="rounded-xl border border-[var(--line)] bg-white px-3.5 py-3">
            <b className="block text-[22px]">{overlapPercent(generator.average)}</b>
            <span className="text-[13px] text-[var(--muted)]">{generator.label} overlap</span>
          </div>
        ))}
        {stats.generators.map((generator) => (
          <div key={`${generator.id}-closer`} className="rounded-xl border border-[var(--line)] bg-white px-3.5 py-3">
            <b className="block text-[22px]">{generator.closer}</b>
            <span className="text-[13px] text-[var(--muted)]">{generator.label} closer</span>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3">
        {report.rows.map((row, index) => (
          <article key={`${report.id}-${index}`} className="grid grid-cols-2 gap-8 rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className={`grid content-start gap-3 ${row.imageUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {(row.imageUrls.length ? row.imageUrls : [""]).map((url) =>
                url ? (
                  // Listing photos come from arbitrary CSV URLs.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="w-full rounded-xl bg-[#efeae2] object-contain" />
                ) : (
                  <div key="empty" className="h-64 rounded-xl bg-[#efeae2]" />
                )
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[17px] font-semibold">ORIGINAL</p>
              {row.itemUrl ? (
                <a href={row.itemUrl} target="_blank" rel="noreferrer" className="mt-1 block text-[17px] font-semibold leading-snug">
                  {row.originalTitle || "Open listing"}
                </a>
              ) : (
                <p className="mt-1 text-[17px] font-semibold leading-snug">{row.originalTitle || "—"}</p>
              )}
              {report.generators.map((generator, titleIndex) => {
                const slot = row.titles.find((item) => item.generatorId === generator.id);
                const waiting = running && !slot && !row.error;
                const score = titleOverlap(row.originalTitle, slot?.title || "");
                return (
                  <div key={generator.id} className="mt-4">
                    <p className="text-[17px] font-semibold">
                      Title {titleIndex + 1} ({generator.label})
                    </p>
                    <p className="mt-1 text-[17px] font-semibold leading-snug">
                      {slot?.title || slot?.error || (waiting ? "Generating…" : row.error || "—")}
                    </p>
                    <p className={`mt-1 text-sm font-semibold ${overlapClass(score)}`}>
                      {score == null ? "Overlap —" : `Overlap ${overlapPercent(score)}`}
                    </p>
                  </div>
                );
              })}
              <details className="mt-5">
                <summary className="cursor-pointer text-sm text-[#1f6b4a]">Verified fields</summary>
                <div className="mt-2 grid gap-3">
                  {report.generators.map((generator, titleIndex) => {
                    const slot = row.titles.find((item) => item.generatorId === generator.id);
                    return (
                      <pre key={generator.id} className="whitespace-pre-wrap rounded-xl bg-[#f7f4ee] p-3 text-xs leading-5">
                        {`Title ${titleIndex + 1} (${generator.label})\n${slot?.detail || slot?.error || "No verified fields saved for this title."}`}
                      </pre>
                    );
                  })}
                </div>
              </details>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
