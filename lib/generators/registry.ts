import { aiLiteSearch } from "./aiLiteSearch";
import { gwEngine } from "./gwEngine";
import { lunaPrompt } from "./lunaPrompt";
import type { TitleGenerator } from "./types";

// Add the next generator to this list. Reports label them Title 1, Title 2, Title 3
// in this order. GW engine and AI-Lite search share one Luna specs request.
export const generators: TitleGenerator[] = [lunaPrompt, gwEngine, aiLiteSearch];

export function listGeneratorOptions() {
  return generators.map((generator) => ({ id: generator.id, label: generator.label }));
}

export function selectGenerators(ids: string[]) {
  if (!ids.length) return generators;
  const wanted = new Set(ids);
  return generators.filter((generator) => wanted.has(generator.id));
}
