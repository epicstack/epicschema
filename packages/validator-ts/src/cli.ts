#!/usr/bin/env node
import { Command } from "commander"
import { readFileSync } from "node:fs"
import path from "node:path"
import { validateMeta } from "@openschema/core"

const program = new Command()
program
  .name("openschema-ts")
  .description("Validate OpenSchema files")
  .argument("<file>", "Path to .os.json file")
  .action((file) => {
    const abs = path.resolve(file)
    const doc = JSON.parse(readFileSync(abs, "utf-8"))
    const issues = validateMeta(doc)
    if (issues.length === 0) {
      console.log("Valid ✅")
      return
    }
    console.error("Invalid ❌")
    for (const i of issues) console.error(` - ${i.path} ${i.message}`)
    process.exit(1)
  })

program.parse()
