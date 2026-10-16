# Title Generator

Local app for marketplace titles. Upload a Goodwill-style CSV, or the photos of one product. Each selected generator runs in order, and the result is saved as Report 1, Report 2, and so on.

```bash
cd Title-Generator
npm install
npm run dev
```

Open http://localhost:3000.

`OPENAI_KEY` is read from `.env.local` in this folder, or from `AI-Lite/.env` if that file is already present. Copy `.env.example` to `.env.local` to set a key here.

Reports are stored in `data/reports`. Uploaded photos are stored in `data/uploads`.

To add another title generator later, create a module in `lib/generators` and add it to the list in `lib/generators/registry.ts`. It shows up as the next title, with its name in brackets.
# TITLE-GENERATOR
# TITLE-GENERATOR
