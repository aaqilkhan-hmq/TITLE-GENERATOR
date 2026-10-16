import fs from "fs";
import path from "path";
import OpenAI from "openai";
import type { ImageInput } from "./types";

const MODEL = "gpt-6-luna";

function loadOpenAiKey() {
  if (process.env.OPENAI_KEY?.trim()) return process.env.OPENAI_KEY.trim();
  const envFile = path.join(process.cwd(), "..", "AI-Lite", ".env");
  if (!fs.existsSync(envFile)) {
    throw new Error("Set OPENAI_KEY in Title-Generator/.env.local");
  }
  const raw = fs.readFileSync(envFile, "utf8");
  const match = raw.match(/^OPENAI_KEY\s*=\s*"?([^"\n]+)"?/m);
  if (!match) throw new Error("OPENAI_KEY was not found");
  return match[1].trim();
}

let client: OpenAI | null = null;

function getClient() {
  if (!client) client = new OpenAI({ apiKey: loadOpenAiKey() });
  return client;
}

export async function callLuna(system: string, userText: string, images: ImageInput[]) {
  const response = await getClient().chat.completions.create(
    {
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            ...images.map((image) => ({
              type: "image_url" as const,
              image_url: { url: `data:${image.mime};base64,${image.base64}` },
            })),
          ],
        },
      ],
    },
    { timeout: 180000, maxRetries: 0 }
  );
  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty model response");
  return JSON.parse(raw) as Record<string, unknown>;
}
