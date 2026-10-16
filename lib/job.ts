import fs from "fs";
import path from "path";
import { extractSpecs } from "./generators/extractSpecs";
import { selectGenerators } from "./generators/registry";
import { downloadImage } from "./images";
import { listReports, readReport, updateReport, uploadDir } from "./reports";
import type { ImageInput, Report, ReportRow, TitleSlot } from "./types";

const globalState = globalThis as {
  __titleRecovered?: boolean;
  __titleActive?: Set<string>;
};

if (!globalState.__titleActive) globalState.__titleActive = new Set();

function activeJobs() {
  return globalState.__titleActive as Set<string>;
}

function recoverInterrupted() {
  for (const summary of listReports()) {
    if (summary.status !== "running") continue;
    updateReport(summary.id, (report) => {
      report.status = "error";
      report.error = "This run stopped before it finished. Start a new report to try again.";
    });
  }
}

if (!globalState.__titleRecovered) {
  globalState.__titleRecovered = true;
  recoverInterrupted();
}

export function isBusy() {
  return activeJobs().size > 0;
}

async function imagesForRow(report: Report, row: ReportRow): Promise<ImageInput[]> {
  if (row.localFiles?.length) {
    const dir = uploadDir(report.id);
    return row.localFiles.map((file) => ({
      mime: file.mime,
      base64: fs.readFileSync(path.join(dir, file.name)).toString("base64"),
    }));
  }
  const images: ImageInput[] = [];
  for (const url of row.imageUrls) {
    images.push(await downloadImage(url));
  }
  return images;
}

export function startReport(id: string, generatorIds: string[]) {
  if (activeJobs().has(id)) return;
  activeJobs().add(id);
  void runReport(id, generatorIds).finally(() => {
    activeJobs().delete(id);
  });
}

async function runReport(id: string, generatorIds: string[]) {
  const selected = selectGenerators(generatorIds);
  try {
    const report = readReport(id);
    if (!report) return;
    for (let index = 0; index < report.rows.length; index += 1) {
      const current = readReport(id);
      const row = current?.rows[index];
      if (!row) continue;
      if (row.error) {
        await updateReport(id, (draft) => {
          draft.progress.done = index + 1;
        });
        continue;
      }
      try {
        const images = await imagesForRow(current as Report, row);
        if (!images.length) throw new Error("No images for this row");
        let specsPromise: Promise<Record<string, unknown>> | undefined;
        const specs = () => {
          if (!specsPromise) specsPromise = extractSpecs(images);
          return specsPromise;
        };
        const titles: TitleSlot[] = [];
        for (const generator of selected) {
          try {
            const result = await generator.generate({ images, specs });
            titles.push({
              generatorId: generator.id,
              label: generator.label,
              title: result.title,
              detail: result.detail,
            });
          } catch (error) {
            titles.push({
              generatorId: generator.id,
              label: generator.label,
              title: "",
              error: error instanceof Error ? error.message : "Generator failed",
            });
          }
          await updateReport(id, (draft) => {
            draft.rows[index].titles = titles.slice();
          });
        }
      } catch (error) {
        await updateReport(id, (draft) => {
          draft.rows[index].error = error instanceof Error ? error.message : "Row failed";
        });
      }
      await updateReport(id, (draft) => {
        draft.progress.done = index + 1;
      });
    }
    await updateReport(id, (draft) => {
      draft.status = "complete";
    });
  } catch (error) {
    await updateReport(id, (draft) => {
      draft.status = "error";
      draft.error = error instanceof Error ? error.message : "Run failed";
    });
  }
}
