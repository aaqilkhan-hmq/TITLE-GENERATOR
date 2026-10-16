import type { ImageInput } from "../types";

export type GeneratorContext = {
  images: ImageInput[];
  specs: () => Promise<Record<string, unknown>>;
};

export type TitleGenerator = {
  id: string;
  label: string;
  generate: (context: GeneratorContext) => Promise<{ title: string; detail?: string }>;
};
