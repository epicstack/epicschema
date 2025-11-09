import { promises as fs } from "node:fs"
import path from "node:path"
import { emitType } from "./emitter.js"

export async function generate(doc: any, outDir: string) {
  const types = doc.types ?? {}
  const modelsDir = path.join(outDir, "models")
  await fs.mkdir(modelsDir, { recursive: true })

  const names = Object.keys(types).sort((a, b) => a.localeCompare(b))
  const exports: string[] = []
  for (const name of names) {
    const code = emitType(name, types[name], doc)
    await fs.writeFile(path.join(modelsDir, `${name}.ts`), code, "utf-8")
    exports.push(`export * from "./models/${name}";`)
  }
  await fs.writeFile(
    path.join(outDir, "index.ts"),
    exports.join("\n") + "\n",
    "utf-8"
  )
}
