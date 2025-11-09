function toDocComment(text?: string): string {
  if (!text) return ""
  const lines = text.split(/\r?\n/).map((l) => ` * ${l}`)
  return ["/**", ...lines, " */"].join("\n")
}

const PRIMS: Record<string, string> = {
  string: "string",
  int: "number",
  long: "number",
  float: "number",
  double: "number",
  bool: "boolean",
  bytes: "Uint8Array",
  date: "Date",
  datetime: "Date",
}

function tsType(prop: any): string {
  if (!prop) return "any"
  if (typeof prop === "string") return PRIMS[prop] ?? prop
  if (prop.$ref) return prop.$ref
  if (prop.type) return PRIMS[prop.type] ?? prop.type
  if (prop.list) {
    const t =
      typeof prop.list === "string" ? PRIMS[prop.list] ?? prop.list : "any"
    return `${t}[]`
  }
  if (prop.map) {
    const v = typeof prop.map === "string" ? PRIMS[prop.map] ?? prop.map : "any"
    return `{ [key: string]: ${v} }`
  }
  return "any"
}

function required(def: any, name: string): boolean {
  const req: string[] = def.required ?? []
  return req.includes(name)
}

function emitEnum(name: string, def: any): string {
  const doc = toDocComment(def.description)
  const members = (def.values ?? [])
    .map((v: string) => `  ${v} = "${v}",`)
    .join("\n")
  return `${doc}
export enum ${name} {
${members}
}
`.trimStart()
}

function emitAlias(name: string, def: any): string {
  const doc = toDocComment(def.description)
  const t = tsType({ type: def.type })
  return `${doc}
export type ${name} = ${t};
`.trimStart()
}

function emitInterface(name: string, def: any): string {
  const doc = toDocComment(def.description)
  const props = def.properties ?? {}
  const lines: string[] = []
  for (const [pn, pd] of Object.entries(props)) {
    const t = tsType(pd)
    const pdDoc = toDocComment((pd as any).description)
    lines.push(
      `${pdDoc}
  ${pn}${required(def, pn) ? "" : "?"}: ${t};`.trimStart()
    )
  }
  return `${doc}
export interface ${name} {
${lines.join("\n")}
}
`.trimStart()
}

function emitObject(name: string, def: any): string {
  const doc = toDocComment(def.description)
  const isAbs = def.abstract === true
  const base = typeof def.extends === "string" ? def.extends : undefined
  const impls: string[] = Array.isArray(def.implements) ? def.implements : []
  const header = `export ${isAbs ? "abstract " : ""}class ${name}${
    base ? ` extends ${base}` : ""
  }${impls.length ? ` implements ${impls.join(", ")}` : ""} {`

  const props = def.properties ?? {}
  const lines: string[] = [doc, header]
  if (Array.isArray(def.identity) && def.identity.length) {
    lines.push(`  /** @identity ${def.identity.join(", ")} */`)
  }
  for (const [pn, pd] of Object.entries(props)) {
    const t = tsType(pd)
    const pdDoc = toDocComment((pd as any).description)
    lines.push(
      `${pdDoc}
  ${pn}${required(def, pn) ? "!" : "?"}: ${t};`.trimStart()
    )
  }
  const deriv = (def.discriminator?.value as string | undefined) ?? undefined
  if (deriv) lines.push(`  static readonly discriminator = "${deriv}";`)
  lines.push("}")
  return lines.join("\n") + "\n"
}

export function emitType(name: string, def: any, _doc: any): string {
  const kind = def.kind
  if (kind === "enum") return emitEnum(name, def)
  if (kind === "alias") return emitAlias(name, def)
  if (kind === "interface") return emitInterface(name, def)
  if (kind === "object") return emitObject(name, def)
  throw new Error(`Unsupported kind '${kind}' for ${name}`)
}
