import type { ReportSummary } from "@/lib/types";

type Props = {
  reports: ReportSummary[];
  activeId: string | null;
  onNew: () => void;
  onOpen: (id: string) => void;
};

function detail(report: ReportSummary) {
  if (report.status === "running") {
    return `${report.progress.done} of ${report.progress.total}`;
  }
  if (report.source === "product") return "1 product";
  return `${report.rowCount} rows`;
}

export function Sidebar({ reports, activeId, onNew, onOpen }: Props) {
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--panel)]">
      <div className="px-4 pb-3 pt-5">
        <p className="text-[15px] font-semibold tracking-tight">Title Generator</p>
        <button
          type="button"
          onClick={onNew}
          className="mt-4 flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
        >
          New run
        </button>
      </div>
      <div className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        Reports
      </div>
      <div className="flex-1 overflow-auto px-2 pb-4">
        {reports.length === 0 ? (
          <p className="px-2 text-sm text-[var(--muted)]">Saved reports will appear here.</p>
        ) : (
          reports.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => onOpen(report.id)}
              className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left ${
                activeId === report.id ? "bg-white" : "hover:bg-white/70"
              }`}
            >
              <span className="block text-sm font-medium">{report.name}</span>
              <span className="mt-0.5 block text-xs text-[var(--muted)]">
                {detail(report)}
                {report.status === "error" ? " · stopped" : ""}
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
