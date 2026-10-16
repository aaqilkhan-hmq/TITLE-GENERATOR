import type { TitleGenerator } from "./types";

function searchPart(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text || text.length >= 80) return "";
  return text;
}

// Same string AI-Lite sends to eBay Browse: brand, Product Name, type, then size.
// See AI-Lite/utils/ebayBrowse.js buildQuery, after applyAiListingToRetail.
export function aiLiteSearchTitle(specs: Record<string, unknown>) {
  return [specs.Brand, specs["Product Name"], specs.Type, specs.Size]
    .map(searchPart)
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchDetail(specs: Record<string, unknown>) {
  return ["Brand", "Product Name", "Type", "Size"]
    .map((key) => `${key}: ${searchPart(specs[key]) || "—"}`)
    .join("\n");
}

export const aiLiteSearch: TitleGenerator = {
  id: "ai-lite-search",
  label: "AI-Lite search",
  async generate({ specs }) {
    const extracted = await specs();
    const title = aiLiteSearchTitle(extracted);
    if (title.length < 3) throw new Error("Not enough title or brand for an eBay search");
    return { title, detail: searchDetail(extracted) };
  },
};
