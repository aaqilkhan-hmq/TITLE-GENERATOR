export type TitleSlot = {
  generatorId: string;
  label: string;
  title: string;
  error?: string;
  detail?: string;
};

export type ReportRow = {
  originalTitle: string;
  itemUrl?: string;
  imageUrls: string[];
  localFiles?: { name: string; mime: string }[];
  titles: TitleSlot[];
  error?: string;
};

export type ReportStatus = "running" | "complete" | "error";

export type Report = {
  id: string;
  number: number;
  name: string;
  createdAt: string;
  source: "csv" | "product";
  sourceName: string;
  status: ReportStatus;
  error?: string;
  progress: { done: number; total: number };
  generators: { id: string; label: string }[];
  rows: ReportRow[];
};

export type ReportSummary = {
  id: string;
  number: number;
  name: string;
  createdAt: string;
  source: Report["source"];
  sourceName: string;
  status: ReportStatus;
  progress: { done: number; total: number };
  rowCount: number;
};

export type ImageInput = {
  mime: string;
  base64: string;
};
