import { readFileSync } from "node:fs"
import path from "node:path"
import url from "node:url"

export function loadMetaSchema(): unknown {
  const thisDir = path.dirname(url.fileURLToPath(import.meta.url))
  const repoRoot = path.resolve(thisDir, "../../..")
  const metaPath = path.join(repoRoot, "spec/0.1/meta-schema.json")
  const raw = readFileSync(metaPath, "utf-8")
  return JSON.parse(raw)
}
