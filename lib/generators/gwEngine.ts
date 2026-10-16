import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { specsToFields } from "./fields";
import type { TitleGenerator } from "./types";

function pythonBin() {
  const venv = path.join(process.cwd(), "..", "gw-title-testing", ".venv", "bin", "python");
  return fs.existsSync(venv) ? venv : "python3";
}

function buildTitle(fieldText: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(pythonBin(), [path.join(process.cwd(), "engine", "build_title.py")]);
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(err.trim() || `GW engine exited ${code}`));
        return;
      }
      try {
        const parsed = JSON.parse(out) as { title?: string };
        const title = String(parsed.title || "").trim();
        if (!title) reject(new Error("GW engine returned an empty title"));
        else resolve(title);
      } catch (error) {
        reject(error);
      }
    });
    child.stdin.write(fieldText);
    child.stdin.end();
  });
}

export const gwEngine: TitleGenerator = {
  id: "gw-engine",
  label: "GW engine",
  async generate({ specs: loadSpecs }) {
    const specs = await loadSpecs();
    const fields = specsToFields(specs);
    if (!fields.trim()) throw new Error("No verified fields for the GW engine");
    return { title: await buildTitle(fields), detail: fields };
  },
};
