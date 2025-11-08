import { execSync } from "child_process"
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import path from "path"
import chalk from "chalk"

const validators = {
  ts: "node ../validators/typescript/dist/cli.js validate",
  cs: "dotnet ../validators/csharp/OpenSchema.Cli/bin/Release/net8.0/OpenSchema.Cli.dll validate",
}

const baseDir = path.resolve("../tests/schemas")
const expected = JSON.parse(readFileSync("../tests/expected.json", "utf8"))

interface Result {
  validator: string
  file: string
  status: "valid" | "invalid" | "error"
  output: string
}

const results: Result[] = []

for (const folder of ["valid", "invalid"]) {
  const dir = path.join(baseDir, folder)
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const rel = `${folder}/${file}`
    const expectedResult = expected[rel]
    for (const [name, cmd] of Object.entries(validators)) {
      const fullPath = path.join(dir, file)
      let status: Result["status"]
      let output = ""
      try {
        execSync(`${cmd} ${fullPath}`, { stdio: "pipe" })
        status = "valid"
      } catch (e: any) {
        output = e.stdout?.toString() || e.message
        status = output.includes("Invalid") ? "invalid" : "error"
      }
      results.push({ validator: name, file: rel, status, output })
      const ok = status === expectedResult
      console.log(
        `${
          ok ? chalk.green("✓") : chalk.red("✗")
        } [${name}] ${rel} => ${status}`
      )
    }
  }
}

const reportLines = [
  "| Schema | C# | TypeScript | Expected | Status |",
  "|--------|----|-------------|----------|--------|",
]
const files = [...new Set(results.map((r) => r.file))]
for (const file of files) {
  const exp = expected[file]
  const cs =
    results.find((r) => r.file === file && r.validator === "cs")?.status || "-"
  const ts =
    results.find((r) => r.file === file && r.validator === "ts")?.status || "-"
  const ok = cs === exp && ts === exp ? "✅" : "❌"
  reportLines.push(`| ${file} | ${cs} | ${ts} | ${exp} | ${ok} |`)
}
mkdirSync("./results", { recursive: true })
writeFileSync("./results/conformance-report.md", reportLines.join("\n"))
console.log(
  chalk.bold("\nConformance report written to results/conformance-report.md")
)
