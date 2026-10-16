import fs from "fs";
import path from "path";
import { callLuna } from "../openai";
import type { ImageInput } from "../types";

const prompt = fs.readFileSync(path.join(process.cwd(), "engine", "prompts", "luna-specs.txt"), "utf8");

const userText =
  "Analyze these product images and extract all eBay listing details and market pricing as JSON. Use eBay sold comps in the USA. Identify the model number. Return Minimum Price, Maximum Price, Average Selling Price, and one Recommended Price that beats competition for a fast sell.";

export function extractSpecs(images: ImageInput[]) {
  return callLuna(prompt, userText, images);
}
