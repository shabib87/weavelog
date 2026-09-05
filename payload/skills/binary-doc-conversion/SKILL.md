---
name: binary-doc-conversion
description: >-
  Ingest binary documents (PDF, DOCX, PPTX, XLSX, EPub, ZIP of documents,
  images, audio) as clean markdown for reading or quoting. Use when a dispatch
  mentions attachments or documents, when a source file is not source code or
  plain text/config, or when `file(1)` reports `data` — convert through
  markitdown instead of reading raw binary bytes.
license: Apache-2.0 (from v0.1.0; MIT pre-v0.1.0)
metadata:
  author: github:@shabib87
  version: "1.0.0"
---
upstream: none — harness-original

# Binary Document Conversion (markitdown)

Route raw binary documents through Microsoft markitdown so agents never read
token-expensive, unparseable bytes. The mechanics live in the `mdconvert`
wrapper (`bun ~/.agents/bin/src/mdconvert.ts`); this skill is the operating
guide for using its output well.

## When to convert

- Attachments or documents in a dispatch: `.pdf`, `.docx`, `.pptx`, `.xlsx`/`.xls`, `.epub`
- Any file whose extension is NOT in the plain-text allowlist — `.md .txt .csv .json .yaml .yml .xml .html .htm .log .py .ts .js`
- Anything `file(1)` reports as `data` (unknown/absent extension, sniffed binary)

Plain-text files are passed through as-is by mdconvert; do not run markitdown on them.

## Operating discipline (convert → locate → quote → compress)

1. Convert: `bun ~/.agents/bin/src/mdconvert.ts <file>` — never read the raw binary.
   - Only SUCCESSFUL conversions are cached, at `state/mdconvert/converted/<sha1(path+mtime)>-<name>.md`; the cache holds the FULL markdown so a large document can still be located with grep/offset-read, and an unchanged file reuses the cache (re-dispatches are free).
   - Printed output is capped at ~2000 lines with a truncation notice naming the total count.
   - Unsupported/failed conversions print an `# mdconvert: UNSUPPORTED` stub and are NOT cached. Re-dispatch re-attempts; do not retry the raw bytes.
   - Remote binaries: download them first, then mdconvert the local copy.
2. Locate: if the converted output is large, use grep/offset-read to find the relevant
   section — do NOT paste the whole document into context.
3. Quote: reproduce at most ~40 lines verbatim in your response or note.
4. Compress: compress the remainder; cite the ORIGINAL source file, not the cache artifact.

On any UNSUPPORTED stub (`# mdconvert: UNSUPPORTED`), report that the document
could not be converted and move on — never attempt to read the raw bytes.

## Per-format gotchas

- **PDF**: good text-and-table extraction (~60-70% token reduction vs raw).
  Two-column journal layouts often interleave columns incorrectly — note if the
  reading order looks scrambled and fall back to a vision-capable pass if detail matters.
  Scanned (image-only) PDFs need OCR; a plain `markitdown` install returns `# mdconvert: EMPTY`
  for a successful-but-textless result — treat that as "no readable text", not a failure,
  and use the vision agents for the page content.
- **DOCX / PPTX**: headlines, bullets, and tables come through cleanly. PPTX images
  appear as markdown image links, not descriptions, unless an LLM client is configured.
- **XLSX/XLS**: each sheet becomes a markdown table. Very wide sheets produce very long
  lines — cap your quoting to the columns you need.
- **EPub / ZIP**: converting a `.zip` converts every supported file inside it recursively.
- **Audio**: transcript requires the optional speech-to-text extra; without it you'll
  get metadata only — say so, do not improvise a transcript.

## When mdconvert is the wrong tool

- Already-plain-text sources (markdown, HTML you can webfetch, CSV the model can read): skip it.
- Password-protected or encrypted documents: markitdown will not decrypt them.
- Huge structured datasets: prefer targeted grep/query over a full convert-then-read.
- A vision-checks matter case (diagram-heavy slide, scanned figure): the vision agents,
  not markitdown, are the right pass.

## Reference

- Wrapper contract: `bun ~/.agents/bin/src/mdconvert.ts --help`
- Converter: Microsoft markitdown (installed at `~/.local/bin/markitdown`, tracked in
  `~/.agents/stack-versions.json` as the `markitdown` key)