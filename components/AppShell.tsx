"use client";

import { useCallback, useEffect, useState } from "react";
import { Composer, type GeneratorOption } from "./Composer";
import { ReportView } from "./ReportView";
import { Sidebar } from "./Sidebar";
import type { Report, ReportSummary } from "@/lib/types";

export function AppShell() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [generators, setGenerators] = useState<GeneratorOption[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [composing, setComposing] = useState(true);

  const refreshList = useCallback(async () => {
    const response = await fetch("/api/reports", { cache: "no-store" });
    if (!response.ok) return;
    setReports(await response.json());
  }, []);

  useEffect(() => {
    // Load saved reports once the shell is on screen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshList();
    void fetch("/api/generators", { cache: "no-store" })
      .then((response) => response.json())
      .then((items: GeneratorOption[]) => setGenerators(items))
      .catch(() => setGenerators([]));
  }, [refreshList]);

  useEffect(() => {
    if (!activeId || composing) return;
    let timer = 0;
    let cancelled = false;

    async function load() {
      const response = await fetch(`/api/reports/${activeId}`, { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const next = (await response.json()) as Report;
      setReport(next);
      if (next.status === "running") {
        timer = window.setTimeout(load, 1500);
      } else {
        void refreshList();
      }
    }

    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeId, composing, refreshList]);

  async function start(form: FormData) {
    const response = await fetch("/api/runs", { method: "POST", body: form });
    const payload = (await response.json()) as { id?: string; error?: string };
    if (!response.ok || !payload.id) throw new Error(payload.error || "Could not start");
    setActiveId(payload.id);
    setComposing(false);
    setReport(null);
    await refreshList();
  }

  const busy = reports.some((item) => item.status === "running");

  return (
    <div className="flex h-screen min-h-0">
      <Sidebar
        reports={reports}
        activeId={composing ? null : activeId}
        onNew={() => setComposing(true)}
        onOpen={(id) => {
          setActiveId(id);
          setReport(null);
          setComposing(false);
        }}
      />
      <main className="min-w-0 flex-1 overflow-auto">
        {composing ? (
          <Composer generators={generators} busy={busy} onStart={start} />
        ) : report ? (
          <ReportView report={report} />
        ) : (
          <p className="px-8 py-10 text-sm text-[var(--muted)]">Loading report…</p>
        )}
      </main>
    </div>
  );
}
