// Real pipeline accuracy harness (dev tool, no PII committed — reads bills from ../bills or DIR).
// Measures accuracy of real extractFromPdfBuffer and extractFromCanvas against ground truth in tools/ocr-eval/expected.csv.
// Run: npm run eval
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  extractFromPdfBuffer,
  extractFromCanvas,
  type ExtractedBill,
} from "../../src/lib/billExtract/index";
import { validateFile } from "../../src/lib/billExtract/validateFile";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADIG_ROOT = resolve(__dirname, "../..");
const EXPECTED_CSV = resolve(__dirname, "expected.csv");
const BATCH_DIRS = [
  "D:/Shravan Tickoo - PM/Government & Public Sector/bills",
  resolve(ADIG_ROOT, "../bills"),
];

function findBillsDir(): string | null {
  for (const d of BATCH_DIRS) {
    if (existsSync(d)) return d;
  }
  return null;
}

interface ExpectedRow {
  file: string;
  kind: string;
  units?: number;
  amount?: number;
  periodFrom?: string;
  periodTo?: string;
  category?: string;
  energyCharge?: number;
}

function loadExpected(): Record<string, ExpectedRow> {
  if (!existsSync(EXPECTED_CSV)) return {};
  const raw = readFileSync(EXPECTED_CSV, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("file,"));
  const map: Record<string, ExpectedRow> = {};
  for (const line of lines) {
    const [file, kind, units, amount, periodFrom, periodTo, category, energyCharge] = line
      .split(",")
      .map((s) => s.trim());
    map[file] = {
      file,
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

type Outcome = "correct" | "blank" | "wrong" | "n/a";

function evaluateField(
  expectedVal: number | string | undefined,
  extractedVal: number | string | undefined,
  isNumeric = false
): Outcome {
  const hasExpected = expectedVal !== undefined && expectedVal !== null && expectedVal !== "";
  const hasExtracted = extractedVal !== undefined && extractedVal !== null && extractedVal !== "";

  if (hasExpected) {
    if (!hasExtracted) {
      return "blank"; // Safe omission
    }
    if (isNumeric) {
      return Math.abs(Number(extractedVal) - Number(expectedVal)) < 0.01 ? "correct" : "wrong";
    }
    return String(extractedVal).trim().toLowerCase() === String(expectedVal).trim().toLowerCase()
      ? "correct"
      : "wrong";
  }

  // If no expected value specified in CSV
  if (!hasExtracted) {
    return "correct"; // Both blank
  }
  return "wrong"; // Extracted unexpected value where ground truth expects none
}

interface BillScorecard {
  file: string;
  kind: string;
  status: string;
  units: Outcome;
  amount: Outcome;
  periodFrom: Outcome;
  periodTo: Outcome;
  category: Outcome;
  energyCharge: Outcome;
  extractedValues: {
    units?: number;
    amount?: number;
    periodFrom?: string;
    periodTo?: string;
    category?: string;
    energyCharge?: number;
  };
}

async function run() {
  console.log("========================================================================");
  console.log("               ADIG REAL PIPELINE BILL EXTRACTION HARNESS                ");
  console.log("========================================================================\n");

  const billsDir = findBillsDir();
  if (!billsDir) {
    console.error("ERROR: bills directory not found in known locations.");
    process.exit(1);
  }
  console.log(`Using sample bills directory: ${billsDir}\n`);

  const expected = loadExpected();
  const scorecard: BillScorecard[] = [];
  let totalWrongCount = 0;

  for (const [file, exp] of Object.entries(expected)) {
    const filePath = `${billsDir}/${file}`;
    console.log(`------------------------------------------------------------------------`);
    console.log(`Testing: ${file} [${exp.kind}]`);

    if (!existsSync(filePath)) {
      console.log(`  STATUS: File not found on disk, skipping.`);
      continue;
    }

    // Special test 1: Non-bill rejection check
    if (exp.kind === "not-a-bill") {
      const fileBytes = readFileSync(filePath);
      const fakeFile = new File([fileBytes], file);
      const val = await validateFile(fakeFile);
      const rejected = !val.valid;
      console.log(`  Non-bill rejection check: ${rejected ? "PASS ✓ (correctly rejected by validation)" : "FAIL ✗"}`);
      scorecard.push({
        file,
        kind: exp.kind,
        status: rejected ? "PASS_REJECTED" : "FAIL",
        units: "correct",
        amount: "correct",
        periodFrom: "correct",
        periodTo: "correct",
        category: "correct",
        energyCharge: "correct",
        extractedValues: {},
      });
      continue;
    }

    // Special test 2: Scanned PDF text-layer empty check (triggering raster fallback)
    if (exp.kind === "pdf-scanned") {
      const buffer = new Uint8Array(readFileSync(filePath));
      const res = await extractFromPdfBuffer(buffer);
      const pass = res.empty === true;
      console.log(`  Scanned PDF check (empty text layer detected): ${pass ? "PASS ✓ (triggers raster fallback)" : "FAIL ✗"}`);
      scorecard.push({
        file,
        kind: exp.kind,
        status: pass ? "PASS_EMPTY_DETECTED" : "FAIL",
        units: "correct",
        amount: "correct",
        periodFrom: "correct",
        periodTo: "correct",
        category: "correct",
        energyCharge: "correct",
        extractedValues: {},
      });
      continue;
    }

    let extracted: ExtractedBill | undefined;
    let runStatus = "OK";

    try {
      const isPdf = file.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        const buffer = new Uint8Array(readFileSync(filePath));
        const pdfResult = await extractFromPdfBuffer(buffer);

        if (!pdfResult.empty && pdfResult.extracted) {
          extracted = pdfResult.extracted;
          console.log(`  Source: PDF Text Layer`);
        } else {
          runStatus = "empty_text_layer";
        }
      } else {
        // Image path
        const img = await loadImage(filePath);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        extracted = await extractFromCanvas(canvas, "image");
        console.log(`  Source: Image Canvas OCR`);
      }
    } catch (err: any) {
      runStatus = err?.message || "error";
      console.log(`  Pipeline result: Error (${runStatus})`);
    }

    const unitsOutcome = evaluateField(exp.units, extracted?.unitsBilled, true);
    const amountOutcome = evaluateField(exp.amount, extracted?.amountBilled, true);
    const periodFromOutcome = evaluateField(exp.periodFrom, extracted?.periodFrom);
    const periodToOutcome = evaluateField(exp.periodTo, extracted?.periodTo);
    const categoryOutcome = evaluateField(exp.category, extracted?.category);
    const ecOutcome = evaluateField(exp.energyCharge, extracted?.energyChargeBilled, true);

    const outcomes = [
      unitsOutcome,
      amountOutcome,
      periodFromOutcome,
      periodToOutcome,
      categoryOutcome,
      ecOutcome,
    ];

    const wrongInBill = outcomes.filter((o) => o === "wrong").length;
    totalWrongCount += wrongInBill;

    scorecard.push({
      file,
      kind: exp.kind,
      status: runStatus,
      units: unitsOutcome,
      amount: amountOutcome,
      periodFrom: periodFromOutcome,
      periodTo: periodToOutcome,
      category: categoryOutcome,
      energyCharge: ecOutcome,
      extractedValues: {
        units: extracted?.unitsBilled,
        amount: extracted?.amountBilled,
        periodFrom: extracted?.periodFrom,
        periodTo: extracted?.periodTo,
        category: extracted?.category,
        energyCharge: extracted?.energyChargeBilled,
      },
    });

    console.log(
      `  Extracted values: ${JSON.stringify(
        {
          units: extracted?.unitsBilled,
          amount: extracted?.amountBilled,
          periodFrom: extracted?.periodFrom,
          periodTo: extracted?.periodTo,
          category: extracted?.category,
          energyCharge: extracted?.energyChargeBilled,
        },
        null,
        0
      )}`
    );
    console.log(
      `  Field outcomes: units=${unitsOutcome}, amount=${amountOutcome}, periodFrom=${periodFromOutcome}, periodTo=${periodToOutcome}, category=${categoryOutcome}, energyCharge=${ecOutcome}`
    );
  }

  console.log("\n========================================================================");
  console.log("                           SCORECARD SUMMARY                            ");
  console.log("========================================================================");

  const tableRows = scorecard.map((r) => ({
    File: r.file,
    Kind: r.kind,
    Units: r.units,
    Amount: r.amount,
    PeriodFrom: r.periodFrom,
    PeriodTo: r.periodTo,
    Category: r.category,
    EnergyCharge: r.energyCharge,
  }));
  console.table(tableRows);

  console.log("------------------------------------------------------------------------");
  console.log(`Total Wrong Values (Safety Failures): ${totalWrongCount}`);
  console.log("========================================================================\n");

  if (totalWrongCount > 0) {
    console.log(`[ATTENTION] ${totalWrongCount} wrong values detected.`);
  } else {
    console.log(`[SUCCESS] 0 wrong values across all sample bills. Safe omissions allowed.`);
  }
}

run().catch((e) => {
  console.error("Harness error:", e);
  process.exit(1);
});
