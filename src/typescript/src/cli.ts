#!/usr/bin/env node

import { readFileSync } from "fs"
import { OpenSchemaValidator } from "./index"

const [, , cmd, file] = process.argv
if (cmd !== "validate" || !file) {
  console.error("Usage: openschema validate <file.os.json>")
  process.exit(2)
}

try {
  const text = readFileSync(file, "utf-8")
  const doc = JSON.parse(text)
  const validator = new OpenSchemaValidator()
  const errors = validator.validate(doc)

  if (errors.length === 0) {
    console.log("Valid ✅")
    process.exit(0)
  }

  console.error("Invalid ❌")
  for (const e of errors) console.error(" -", e.toString())
  process.exit(1)
} catch (err: any) {
  console.error("Error:", err.message ?? String(err))
  process.exit(2)
}
