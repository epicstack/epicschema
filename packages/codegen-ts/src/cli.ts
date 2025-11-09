#!/usr/bin/env node
import { Command } from "commander"
import { promises as fs } from "node:fs"
import path from "node:path"
import { validateMeta } from "@openschema/core"
import { generate } from "./generate.js"

const program = new Command()
program
  .name("openschema-ts-codegen")
  .description("Generate TypeScript models from an OpenSchema file")
  .argument("<schema>", "Path to schema.os.json")
  .option("--out <dir>", "Output directory", "./generated")
  .option("--no-validate", "Skip meta-schema validation")
  .action(async (schemaPath, opts) => {
    const abs = path.resolve(schemaPath)
    const doc = JSON.parse(await fs.readFile(abs, "utf-8"))

    if (opts.validate) {
      const issues = validateMeta(doc)
      if (issues.length) {
        console.error("Meta-schema validation failed:")
        for (const i of issues) console.error(` - ${i.path} ${i.message}`)
        process.exit(1)
      }
    }

    const outDir = path.resolve(opts.out)
    await fs.mkdir(outDir, { recursive: true })
    await generate(doc, outDir)
    console.log(`Generated models to ${outDir}`)
  })

program.parse()
