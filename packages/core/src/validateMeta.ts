import { Ajv, type AnySchema } from "ajv"
import addFormats from "ajv-formats"
import type { ErrorObject } from "ajv"
import { loadMetaSchema } from "./meta.js"
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"

export interface ValidationIssue {
  path: string
  message: string
}

function addDraft2020Meta(ajv: Ajv) {
  const require = createRequire(import.meta.url)
  const refs = [
    "ajv/dist/refs/json-schema-2020-12/schema.json",
    "ajv/dist/refs/json-schema-2020-12/meta/core.json",
    "ajv/dist/refs/json-schema-2020-12/meta/applicator.json",
    "ajv/dist/refs/json-schema-2020-12/meta/unevaluated.json",
    "ajv/dist/refs/json-schema-2020-12/meta/content.json",
    "ajv/dist/refs/json-schema-2020-12/meta/meta-data.json",
    "ajv/dist/refs/json-schema-2020-12/meta/format-annotation.json",
  ]
  for (const r of refs) {
    const p = require.resolve(r)
    const json = JSON.parse(readFileSync(p, "utf-8"))
    ajv.addMetaSchema(json)
  }
}

export function validateMeta(doc: unknown): ValidationIssue[] {
  const ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true })
  addDraft2020Meta(ajv)
  ;(addFormats as unknown as { default: (ajv: Ajv) => void }).default(ajv)

  // Cast explicitly since we know loadMetaSchema() returns a valid JSON Schema object
  const meta = loadMetaSchema() as AnySchema

  const validate = ajv.compile(meta)
  const ok = validate(doc)
  if (ok) return []
  const errs = (validate.errors ?? []) as ErrorObject[]
  return errs.map((e) => ({
    path: e.instancePath || "/",
    message: e.message ?? e.keyword,
  }))
}
