
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";

const validators = {
  ts: "node ../packages/validator-ts/dist/cli.js"
};

const baseDir = path.resolve("../tests/schemas");
const expected = JSON.parse(readFileSync("../tests/expected.json", "utf8"));

type Status = "valid" | "invalid" | "error";
const results: { validator: string; file: string; status: Status; output: string }[] = [];

for (const folder of ["valid", "invalid"]) {
  const dir = path.join(baseDir, folder);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const rel = `${folder}/${file}`;
    const expectedResult: Status = expected[rel];
    for (const [name, cmd] of Object.entries(validators)) {
      const fullPath = path.join(dir, file);
      let status: Status;
      let output = "";
      try {
        execSync(`${cmd} ${fullPath}`, { stdio: "pipe" });
        status = "valid";
      } catch (e: any) {
        output = e.stdout?.toString() || e.message;
        status = output.includes("Invalid") ? "invalid" : "error";
      }
      results.push({ validator: name, file: rel, status, output });
      const ok = status === expectedResult;
      console.log(`${ok ? chalk.green("✓") : chalk.red("✗")} [${name}] ${rel} => ${status}`);
    }
  }
}

const lines = [
  "| Schema | TS | Expected | Status |",
  "|--------|----|----------|--------|",
];
const files = [...new Set(results.map((r) => r.file))];
for (const file of files) {
  const exp = expected[file];
  const ts = results.find((r) => r.file === file && r.validator === "ts")?.status || "-";
  const ok = ts === exp ? "✅" : "❌";
  lines.push(`| ${file} | ${ts} | ${exp} | ${ok} |`);
}
mkdirSync("./results", { recursive: true });
writeFileSync("./results/conformance-report.md", lines.join("\n"));

const failed = results.some(r => r.status !== expected[r.file]);
if (failed) {
  console.error(chalk.red.bold("\n❌ Conformance check failed.\n"));
  process.exit(1);
} else {
  console.log(chalk.green.bold("\n✅ All conformance tests passed.\n"));
}
