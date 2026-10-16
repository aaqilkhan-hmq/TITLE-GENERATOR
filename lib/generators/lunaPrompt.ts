import fs from "fs";
import path from "path";
import { callLuna } from "../openai";
import type { TitleGenerator } from "./types";

const prompt = fs.readFileSync(
  path.join(process.cwd(), "engine", "prompts", "luna-title.txt"),
  "utf8"
);

export const lunaPrompt: TitleGenerator = {
  id: "luna-prompt",
  label: "Luna prompt",
  async generate({ images }) {
    const result = await callLuna(
      prompt,
      "These photos are one item. Return only the JSON object from the system prompt.",
      images
    );
    const title = String(result.title || "").trim();
    if (!title) throw new Error("Luna prompt did not return a title");
    return { title, detail: lunaDetail(result) };
  },
};

function asLines(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function lunaDetail(result: Record<string, unknown>) {
  const fields = result.fields;
  const fieldLines =
    fields && typeof fields === "object" && !Array.isArray(fields)
      ? Object.entries(fields as Record<string, unknown>)
          .map(([key, value]) => [key, String(value ?? "").trim()] as const)
          .filter(([, value]) => value)
          .map(([key, value]) => `${key}: ${value}`)
      : [];
  const specifics = asLines(result.item_specifics);
  const dropped = asLines(result.dropped_for_length);
  const missing = asLines(result.missing_for_better_title);
  return [
    fieldLines.join("\n"),
    specifics.length ? `Item specifics:\n${specifics.join("\n")}` : "",
    dropped.length ? `Dropped for length: ${dropped.join(", ")}` : "",
    missing.length ? `Missing: ${missing.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
