"use client";

import { useMemo, useState } from "react";

export type GeneratorOption = { id: string; label: string };

type Props = {
  generators: GeneratorOption[];
  busy: boolean;
  onStart: (form: FormData) => Promise<void>;
};

export function Composer({ generators, busy, onStart }: Props) {
  const [mode, setMode] = useState<"csv" | "product">("csv");
  const [paste, setPaste] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [originalTitle, setOriginalTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const chosen = selected.length ? selected : generators.map((item) => item.id);
  const hasInput = mode === "csv" ? Boolean(csvFile || csvText.trim()) : photos.length > 0;
  const canStart = hasInput && chosen.length > 0 && !busy && !submitting;
  const previews = useMemo(
    () => photos.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [photos]
  );

  function toggle(id: string) {
    setSelected((current) => {
      const base = current.length ? current : generators.map((item) => item.id);
      return base.includes(id) ? base.filter((item) => item !== id) : [...base, id];
    });
  }

  async function submit() {
    setError("");
    const form = new FormData();
    form.set("mode", mode);
    form.set("generators", chosen.join(","));
    if (mode === "csv") {
      if (csvFile) form.set("csv", csvFile);
      if (csvText.trim()) form.set("csvText", csvText);
    } else {
      photos.forEach((file) => form.append("images", file));
      form.set("originalTitle", originalTitle);
    }
    setSubmitting(true);
    try {
      await onStart(form);
      setCsvFile(null);
      setCsvText("");
      setPhotos([]);
      setOriginalTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-sm text-[var(--muted)]">Title Generator</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">What should we title?</h1>
      <p className="mt-3 max-w-lg text-[15px] leading-6 text-[var(--muted)]">
        Upload a Goodwill CSV, or drop the photos of one product. Each selected generator runs in order, and the result is saved as the next report.
      </p>

      <div className="mt-8 inline-flex rounded-full bg-white p-1">
        {(["csv", "product"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setMode(item);
              setError("");
            }}
            className={`rounded-full px-4 py-2 text-sm ${mode === item ? "bg-[var(--accent)] text-white" : ""}`}
          >
            {item === "csv" ? "CSV" : "One product"}
          </button>
        ))}
      </div>

      {mode === "csv" ? (
        <div className="mt-5">
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfcbc2] bg-white px-6 py-8 text-center">
            <span className="text-sm font-medium">{csvFile ? csvFile.name : "Drop a CSV here"}</span>
            <span className="mt-1 text-xs text-[var(--muted)]">Same columns as the Goodwill export</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => setCsvFile(event.target.files?.[0] || null)}
            />
          </label>
          <button type="button" className="mt-3 text-sm text-[var(--muted)] underline" onClick={() => setPaste((value) => !value)}>
            {paste ? "Hide pasted CSV" : "Paste CSV instead"}
          </button>
          {paste ? (
            <textarea
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              placeholder="item_id,store,title,price,currency,item_url,image_url,condition,scraped_at"
              className="mt-3 h-36 w-full resize-y rounded-2xl border border-[var(--line)] bg-white p-3 text-sm outline-none"
            />
          ) : null}
        </div>
      ) : (
        <div className="mt-5">
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfcbc2] bg-white px-6 py-8 text-center">
            <span className="text-sm font-medium">
              {photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"} selected` : "Drop product photos"}
            </span>
            <span className="mt-1 text-xs text-[var(--muted)]">All of these photos go into one request</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => setPhotos(Array.from(event.target.files || []))}
            />
          </label>
          {previews.length ? (
            <div className="mt-3 flex gap-2 overflow-auto">
              {previews.map((preview) => (
                // Local file previews are blob URLs, so they stay as plain images.
                // eslint-disable-next-line @next/next/no-img-element
                <img key={preview.url} src={preview.url} alt="" className="h-20 w-20 rounded-xl object-cover" />
              ))}
            </div>
          ) : null}
          <input
            value={originalTitle}
            onChange={(event) => setOriginalTitle(event.target.value)}
            placeholder="Original title, if you have one"
            className="mt-3 w-full rounded-2xl border border-[var(--line)] bg-white px-3 py-3 text-sm outline-none"
          />
        </div>
      )}

      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Generators</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {generators.map((generator) => {
            const on = chosen.includes(generator.id);
            return (
              <button
                key={generator.id}
                type="button"
                onClick={() => toggle(generator.id)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  on ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white"
                }`}
              >
                {generator.label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-[#9a3b2f]">{error}</p> : null}

      <button
        type="button"
        disabled={!canStart}
        onClick={submit}
        className={`mt-6 w-fit rounded-full px-5 py-2.5 text-sm font-medium ${
          canStart ? "bg-[#17803d] text-white" : "bg-[#d5d2ca] text-[#8d8a83]"
        }`}
      >
        {submitting ? "Starting…" : busy ? "A report is running" : "Generate titles"}
      </button>
    </div>
  );
}
