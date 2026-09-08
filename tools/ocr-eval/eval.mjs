// Runner for tools/ocr-eval/eval.ts using tsx
import { execFileSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsxCli = resolve(__dirname, "../../node_modules/tsx/dist/cli.mjs");
const evalTs = resolve(__dirname, "eval.ts");

execFileSync(process.execPath, [tsxCli, evalTs, ...process.argv.slice(2)], {
  stdio: "inherit",
});
