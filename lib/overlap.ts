import type { Report } from "./types";

export function titleWords(text: string) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

export function overlap(leftText: string, rightText: string) {
  const left = new Set(titleWords(leftText));
  const right = new Set(titleWords(rightText));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / new Set([...left, ...right]).size;
}

export function titleOverlap(original: string, title: string) {
  if (!original.trim() || !title.trim()) return null;
  return overlap(original, title);
}

export function overlapPercent(value: number | null) {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}

export type GeneratorStat = {
  id: string;
  label: string;
  average: number | null;
  closer: number;
};

export function reportStats(report: Report) {
  const totals = new Map<string, { sum: number; count: number; closer: number }>();
  for (const generator of report.generators) {
    totals.set(generator.id, { sum: 0, count: 0, closer: 0 });
  }

  let compared = 0;
  for (const row of report.rows) {
    const scored = report.generators
      .map((generator) => {
        const slot = row.titles.find((item) => item.generatorId === generator.id);
        const score = titleOverlap(row.originalTitle, slot?.title || "");
        return { id: generator.id, score };
      })
      .filter((item): item is { id: string; score: number } => item.score != null);

    if (!scored.length) continue;
    compared += 1;
    for (const item of scored) {
      const bucket = totals.get(item.id);
      if (!bucket) continue;
      bucket.sum += item.score;
      bucket.count += 1;
    }
    const best = Math.max(...scored.map((item) => item.score));
    const winners = scored.filter((item) => item.score === best);
    if (winners.length === 1) {
      const bucket = totals.get(winners[0].id);
      if (bucket) bucket.closer += 1;
    }
  }

  return {
    compared,
    generators: report.generators.map((generator) => {
      const bucket = totals.get(generator.id) || { sum: 0, count: 0, closer: 0 };
      return {
        id: generator.id,
        label: generator.label,
        average: bucket.count ? bucket.sum / bucket.count : null,
        closer: bucket.closer,
      };
    }),
  };
}
