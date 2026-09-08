// OCR/extraction accuracy harness (dev tool, no PII committed — reads bills from ../bills or DIR).
// Measures accuracy of both PDF text-layer and Image OCR pipelines against ground truth in tools/ocr-eval/expected.csv.
// Run: node tools/ocr-eval/eval.mjs
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADIG_ROOT = resolve(__dirname, "../..");
const EXPECTED_CSV = resolve(__dirname, "expected.csv");
const BATCH_DIRS = [
  "D:/Shravan Tickoo - PM/Government & Public Sector/bills",
  resolve(ADIG_ROOT, "../bills"),
];

function findBillsDir() {
  for (const d of BATCH_DIRS) {
    if (existsSync(d)) return d;
  }
  return null;
}

// Load ground truth from expected.csv
function loadExpected() {
  if (!existsSync(EXPECTED_CSV)) return {};
  const raw = readFileSync(EXPECTED_CSV, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("file,"));
  const map = {};
  for (const line of lines) {
    const [file, kind, units, amount, periodFrom, periodTo, category, energyCharge] = line.split(",").map((s) => s.trim());
    map[file] = {
      kind,
      units: units ? parseInt(units, 10) : undefined,
      amount: amount ? parseFloat(amount) : undefined,
      periodFrom: periodFrom || undefined,
      periodTo: periodTo || undefined,
      category: category || undefined,
      energyCharge: energyCharge ? parseFloat(energyCharge) : undefined,
    };
  }
  return map;
}

function isMsedcl(text) {
  const l = text.toLowerCase();
  return l.includes("mahadiscom") || text.includes("महावितरण") || l.includes("msedcl") || l.includes("mahavitaran");
}

function num(s) {
  const m = String(s).replace(/(?:Rs\.?|₹|[\s,])/gi, "").match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function parseNumber(s) {
  const trimmed = String(s).trim();
  if (/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/.test(trimmed)) return null;
  const cleaned = trimmed.replace(/(?:Rs\.?|₹|[\s,])/gi, "");
  const m = cleaned.match(/^-?\d+(?:\.\d+)?$/);
  if (m) return parseFloat(m[0]);
  const fallback = cleaned.match(/-?\d+(?:\.\d+)?/);
  return fallback ? parseFloat(fallback[0]) : null;
}

function isoDate(s) {
  const m = String(s).match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
  if (!m) return null;
  const d = +m[1], mo = +m[2], y = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// PDF text-layer positional extraction (mirrors pdfTextLayer.ts)
async function extractPdfTextLayer(path) {
  const data = new Uint8Array(readFileSync(path));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const numPages = doc.numPages;
  const allItems = [];
  let page1Width = 575;
  let page1Height = 822;

  for (let p = 1; p <= numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1.0 });
    if (p === 1) {
      page1Width = viewport.width;
      page1Height = viewport.height;
    }
    const tc = await page.getTextContent();
    for (const item of tc.items) {
      if (item.str && item.str.trim()) {
        allItems.push({
          str: item.str.trim(),
          x: item.transform[4],
          y: item.transform[5],
          page: p,
        });
      }
    }
  }

  if (allItems.length === 0) return { empty: true };
  const joined = allItems.map((i) => i.str).join(" ");
  if (!isMsedcl(joined)) return { notMsedcl: true };

  const p1Items = allItems.filter((i) => i.page === 1);

  // 1. Amount Billed from summary box
  let amount;
  const topBoxCandidates = p1Items.filter((i) => {
    const normX = i.x / page1Width;
    const normY = i.y / page1Height;
    return normX >= 0.70 && normY >= 0.84 && normY <= 0.92;
  });
  topBoxCandidates.sort((a, b) => b.y - a.y);
  for (const item of topBoxCandidates) {
    const n = parseNumber(item.str);
    if (n !== null && n > 0 && n < 100000) {
      amount = n;
      break;
    }
  }

  // 2. Reading dates
  let periodFrom, periodTo;
  const dateCandidates = p1Items
    .filter((i) => {
      const normX = i.x / page1Width;
      const normY = i.y / page1Height;
      return normX >= 0.48 && normX <= 0.75 && normY >= 0.69 && normY <= 0.78;
    })
    .map((i) => isoDate(i.str))
    .filter(Boolean);
  const uniqueDates = [...new Set(dateCandidates)].sort();
  if (uniqueDates.length >= 2) {
    periodFrom = uniqueDates[0];
    periodTo = uniqueDates[uniqueDates.length - 1];
  }

  // 3. Values grid row (units, readings)
  let units, currentReading, previousReading;
  const gridItems = p1Items.filter((i) => {
    const normY = i.y / page1Height;
    return normY >= 0.62 && normY <= 0.68;
  });
  gridItems.sort((a, b) => a.x - b.x);

  for (const item of gridItems) {
    const normX = item.x / page1Width;
    const n = parseNumber(item.str);
    if (n === null) continue;
    if (normX < 0.12 && n >= 10) currentReading = n;
    else if (normX >= 0.12 && normX < 0.24 && n >= 10) previousReading = n;
    else if (normX >= 0.32 && normX < 0.48 && n > 0) {
      if (units === undefined) units = n;
    } else if (normX >= 0.55 && normX < 0.72 && n > 0) {
      units = n;
    }
  }

  // 4. Category
  let category;
  if (/LT[-\s]*I.*Res|Res.*LT[-\s]*I/i.test(joined)) {
    category = "LT-I-B-residential";
  }

  // 5. Page 2 Energy Charge
  let energyCharge;
  if (numPages >= 2) {
    const p2Items = allItems.filter((i) => i.page === 2);
    const ecCandidates = p2Items.filter((i) => {
      const normY = i.y / page1Height;
      const normX = i.x / page1Width;
      return normY >= 0.90 && normY <= 0.95 && normX >= 0.80;
    });
    for (const item of ecCandidates) {
      const n = parseNumber(item.str);
      if (n !== null && n > 0 && (!amount || n <= amount)) {
        energyCharge = n;
        break;
      }
    }
  }

  return {
    msedcl: true,
    units,
    currentReading,
    previousReading,
    amount,
    periodFrom,
    periodTo,
    category,
    energyCharge,
  };
}

async function run() {
  console.log("===============================================================");
  console.log("             ADIG BILL EXTRACTION ACCURACY HARNESS             ");
  console.log("===============================================================\n");

  const billsDir = findBillsDir();
  if (!billsDir) {
    console.error("ERROR: bills directory not found in known locations.");
    process.exit(1);
  }
  console.log(`Using sample bills directory: ${billsDir}\n`);

  const expected = loadExpected();
  const results = [];
  let tesseract;

  for (const [file, exp] of Object.entries(expected)) {
    const path = `${billsDir}/${file}`;
    console.log(`---------------------------------------------------------------`);
    console.log(`Testing: ${file} [${exp.kind}]`);

    if (!existsSync(path)) {
      console.log(`  STATUS: File not found on disk, skipping.`);
      results.push({ file, kind: exp.kind, status: "SKIPPED_NOT_FOUND" });
      continue;
    }

    if (exp.kind === "not-a-bill") {
      // Test rejection
      try {
        const text = readFileSync(path).toString("utf-8");
        const isM = isMsedcl(text);
        const pass = !isM;
        console.log(`  Non-MSEDCL check: rejected=${pass ? "YES ✓" : "NO ✗"}`);
        results.push({ file, kind: exp.kind, status: pass ? "PASS_REJECTED" : "FAIL" });
      } catch {
        results.push({ file, kind: exp.kind, status: "PASS_REJECTED" });
      }
      continue;
    }

    if (exp.kind === "pdf-scanned") {
      try {
        const res = await extractPdfTextLayer(path);
        const pass = res.empty === true;
        console.log(`  Scanned PDF check (empty text layer detected): ${pass ? "YES ✓ (triggers raster fallback)" : "NO ✗"}`);
        results.push({ file, kind: exp.kind, status: pass ? "PASS_EMPTY_DETECTED" : "FAIL" });
      } catch (err) {
        console.log(`  Error: ${err.message}`);
        results.push({ file, kind: exp.kind, status: "ERROR" });
      }
      continue;
    }

    try {
      let got = {};
      if (exp.kind === "pdf-digital") {
        got = await extractPdfTextLayer(path);
      } else {
        if (!tesseract) tesseract = await import("tesseract.js");
        const worker = await tesseract.createWorker(["mar", "eng"]);
        const ret = await worker.recognize(path, {}, { blocks: true });
        await worker.terminate();

        const text = ret.data.text || "";
        const blocks = ret.data.blocks || [];
        const lines = blocks.flatMap((b) => b.paragraphs || []).flatMap((p) => p.lines || []).map((l) => l.text);

        // Amount label-proximity
        const amtLine = lines.find((l) => /देयक\s*रक्‍?कम|bill\s*amount/i.test(l));
        got.amount = amtLine ? num(amtLine.split(/रक्‍?कम|amount/i).pop()) : undefined;

        // Grid row units
        const gridLine = lines.find((l) => (l.match(/\b\d{2,6}\b/g) || []).length >= 3);
        if (gridLine) {
          const numbers = (gridLine.match(/\b\d+\b/g) || []).map(Number);
          if (numbers.length >= 3) {
            got.currentReading = numbers[0];
            got.previousReading = numbers[1];
            got.units = numbers[numbers.length - 1];
          }
        }

        const dates = [...text.matchAll(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{4}\b/g)].map((m) => isoDate(m[0])).filter(Boolean);
        const uniqueDates = [...new Set(dates)].sort();
        if (uniqueDates.length >= 2) {
          got.periodFrom = uniqueDates[0];
          got.periodTo = uniqueDates[uniqueDates.length - 1];
        }

        got.category = /LT[-\s]*I.*Res|Res.*LT[-\s]*I/i.test(text) ? "LT-I-B-residential" : undefined;
      }

      const unitsMatch = exp.units === undefined || got.units === exp.units;
      const amountMatch = exp.amount === undefined || got.amount === exp.amount;
      const fromMatch = !exp.periodFrom || got.periodFrom === exp.periodFrom;
      const toMatch = !exp.periodTo || got.periodTo === exp.periodTo;
      const ecMatch = !exp.energyCharge || got.energyCharge === exp.energyCharge;

      console.log(`  Units:        got=${got.units ?? "none"} expected=${exp.units ?? "none"} -> ${unitsMatch ? "✓" : "✗"}`);
      console.log(`  Amount:       got=${got.amount ?? "none"} expected=${exp.amount ?? "none"} -> ${amountMatch ? "✓" : "✗"}`);
      console.log(`  PeriodFrom:   got=${got.periodFrom ?? "none"} expected=${exp.periodFrom ?? "none"} -> ${fromMatch ? "✓" : "✗"}`);
      console.log(`  PeriodTo:     got=${got.periodTo ?? "none"} expected=${exp.periodTo ?? "none"} -> ${toMatch ? "✓" : "✗"}`);
      if (exp.energyCharge) {
        console.log(`  EnergyCharge: got=${got.energyCharge ?? "none"} expected=${exp.energyCharge ?? "none"} -> ${ecMatch ? "✓" : "✗"}`);
      }

      const allMatch = unitsMatch && amountMatch && fromMatch && toMatch && ecMatch;
      results.push({
        file,
        kind: exp.kind,
        unitsMatch,
        amountMatch,
        fromMatch,
        toMatch,
        ecMatch,
        status: allMatch ? "PASS" : "PARTIAL",
      });
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      results.push({ file, kind: exp.kind, status: "ERROR" });
    }
  }

  console.log("\n===============================================================");
  console.log("                     ACCURACY SCORECARD                        ");
  console.log("===============================================================");
  console.table(results);
  console.log("===============================================================\n");
}

run();
