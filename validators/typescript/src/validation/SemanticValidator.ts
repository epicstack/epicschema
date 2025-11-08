import type { JsonObject } from "./ValidationContext"
import { ValidationContext } from "./ValidationContext"

const isObj = (x: any): x is JsonObject => typeof x === "object" && x !== null
const kindOf = (t: JsonObject) =>
  typeof t.kind === "string" ? (t.kind as string) : undefined
const propsOf = (t: JsonObject): JsonObject =>
  isObj(t.properties) ? (t.properties as JsonObject) : {}
const deepEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b)

export class SemanticValidator {
  private readonly ctx: ValidationContext
  constructor(doc: JsonObject) {
    this.ctx = new ValidationContext(doc)
  }
  validate() {
    this.checkKinds()
    this.checkReferences()
    this.checkInheritance()
    this.checkInterfaces()
    this.checkDiscriminators()
    this.checkIdentity()
    this.checkEnums()
    this.checkAliases()
    return this.ctx.errors
  }
  private checkKinds() {
    for (const [name, t] of Object.entries(this.ctx.types)) {
      const k = kindOf(t)
      if (!k) {
        this.ctx.error(`/types/${name}`, "kind.missing", "Missing 'kind'.")
        continue
      }
      if (!["object", "interface", "enum", "alias"].includes(k)) {
        this.ctx.error(
          `/types/${name}/kind`,
          "kind.invalid",
          `Invalid kind '${k}'.`
        )
      }
    }
  }
  private checkReferences() {
    for (const [name, t] of Object.entries(this.ctx.types)) {
      const base = typeof t.extends === "string" ? t.extends : undefined
      if (base && !this.ctx.types[base])
        this.ctx.error(
          `/types/${name}/extends`,
          "ref.unknown",
          `Unknown base '${base}'.`
        )
      const props = propsOf(t)
      for (const [pn, pd] of Object.entries(props)) {
        if (!isObj(pd)) continue
        const ref = pd["$ref"]
        if (typeof ref === "string" && !this.ctx.types[ref])
          this.ctx.error(
            `/types/${name}/properties/${pn}/$ref`,
            "ref.unknown",
            `Unknown type '${ref}'.`
          )
        if (typeof pd.list === "string" && !this.ctx.types[pd.list])
          this.ctx.error(
            `/types/${name}/properties/${pn}/list`,
            "ref.unknown",
            `Unknown list element type '${pd.list}'.`
          )
        if (typeof pd.map === "string" && !this.ctx.types[pd.map])
          this.ctx.error(
            `/types/${name}/properties/${pn}/map`,
            "ref.unknown",
            `Unknown map value type '${pd.map}'.`
          )
      }
    }
  }
  private checkInheritance() {
    const parent: Record<string, string | undefined> = {}
    for (const [n, t] of Object.entries(this.ctx.types))
      parent[n] = typeof t.extends === "string" ? t.extends : undefined
    for (const name of Object.keys(this.ctx.types)) {
      const seen = new Set<string>()
      let cur = name
      while (parent[cur]) {
        const p = parent[cur]!
        if (seen.has(p)) {
          this.ctx.error(
            `/types/${name}/extends`,
            "inherit.cycle",
            "Inheritance cycle."
          )
          break
        }
        seen.add(p)
        cur = p
      }
    }
    for (const [name, t] of Object.entries(this.ctx.types)) {
      const p = parent[name]
      if (!p) continue
      const props = propsOf(t)
      const baseProps = this.collectProps(p)
      for (const [pn, pv] of Object.entries(props))
        if (pn in baseProps && !deepEqual(baseProps[pn], pv))
          this.ctx.error(
            `/types/${name}/properties/${pn}`,
            "inherit.prop.redefine",
            `Property '${pn}' redefined incompatibly.`
          )
      const baseType = this.ctx.types[p]
      if (baseType && baseType.valueObject === true)
        this.ctx.error(
          `/types/${name}/extends`,
          "inherit.valueObject",
          "Value objects cannot be extended."
        )
    }
  }
  private collectProps(name: string): Record<string, unknown> {
    const map: Record<string, unknown> = {}
    let cur: string | undefined = name

    while (cur && this.ctx.types[cur]) {
      const t: Record<string, unknown> = this.ctx.types[cur]
      const props = propsOf(t)
      for (const [k, v] of Object.entries(props)) {
        if (!(k in map)) map[k] = v
      }
      const ext: unknown = (t as any).extends
      cur = typeof ext === "string" ? ext : undefined
    }
    return map
  }
  private checkInterfaces() {
    for (const [name, t] of Object.entries(this.ctx.types)) {
      const impls = Array.isArray(t.implements)
        ? (t.implements as string[])
        : []
      for (const i of impls) {
        const iface = this.ctx.types[i]
        if (!iface || kindOf(iface) !== "interface") {
          this.ctx.error(
            `/types/${name}/implements`,
            "iface.unknown",
            `Unknown interface '${i}'.`
          )
          continue
        }
        const ifaceProps = propsOf(iface)
        const objProps = this.collectProps(name)
        for (const k of Object.keys(ifaceProps)) {
          if (!(k in objProps))
            this.ctx.error(
              `/types/${name}`,
              "iface.missing",
              `Missing property '${k}' from interface '${i}'.`
            )
          else if (!deepEqual(ifaceProps[k], objProps[k]))
            this.ctx.error(
              `/types/${name}/properties/${k}`,
              "iface.mismatch",
              `Property '${k}' does not match interface '${i}'.`
            )
        }
      }
    }
  }
  private checkDiscriminators() {
    for (const [name, t] of Object.entries(this.ctx.types)) {
      const disc = t.discriminator
      if (!isObj(disc)) continue
      const field = typeof disc.field === "string" ? disc.field : undefined
      if (field) {
        const fld = this.collectProps(name)[field]
        if (!isObj(fld) || fld.type !== "string")
          this.ctx.error(
            `/types/${name}/discriminator/field`,
            "disc.field",
            `Discriminator field '${field}' must be a string property on base.`
          )
      }
      const mapping = isObj(disc.mapping)
        ? (disc.mapping as Record<string, string>)
        : undefined
      if (mapping)
        for (const [value, target] of Object.entries(mapping)) {
          if (!this.ctx.types[target]) {
            this.ctx.error(
              `/types/${name}/discriminator/mapping/${value}`,
              "disc.mapping.unknown",
              `Unknown mapped type '${target}'.`
            )
            continue
          }
          const base = this.ctx.types[target].extends
          if (base !== name)
            this.ctx.error(
              `/types/${name}/discriminator/mapping/${value}`,
              "disc.mapping.extend",
              `'${target}' does not extend '${name}'.`
            )
        }
    }
    const siblings: Record<string, Record<string, string>> = {}
    for (const [name, t] of Object.entries(this.ctx.types)) {
      const baseName = typeof t.extends === "string" ? t.extends : undefined
      if (!baseName) continue
      const base = this.ctx.types[baseName]
      const baseDisc = isObj(base?.discriminator)
        ? (base!.discriminator as JsonObject)
        : undefined
      if (!baseDisc) continue
      const val = isObj(t.discriminator)
        ? (t.discriminator as JsonObject).value
        : undefined
      if (typeof val !== "string" || val.length === 0) {
        this.ctx.error(
          `/types/${name}/discriminator`,
          "disc.value.missing",
          `Derived type '${name}' must specify discriminator.value.`
        )
        continue
      }
      siblings[baseName] ??= {}
      if (siblings[baseName][val])
        this.ctx.error(
          `/types/${name}/discriminator/value`,
          "disc.value.duplicate",
          `Discriminator value '${val}' already used by '${siblings[baseName][val]}'.`
        )
      else siblings[baseName][val] = name
      const map = isObj(baseDisc.mapping)
        ? (baseDisc.mapping as Record<string, any>)
        : undefined
      if (map && !(val in map))
        this.ctx.error(
          `/types/${name}/discriminator/value`,
          "disc.value.mapping",
          `Value '${val}' not declared in base mapping.`
        )
    }
  }
  private checkIdentity() {
    for (const [name, t] of Object.entries(this.ctx.types)) {
      const ids = Array.isArray(t.identity)
        ? (t.identity as string[])
        : undefined
      if (!ids || ids.length === 0) continue
      if (kindOf(t) !== "object") {
        this.ctx.error(
          `/types/${name}/identity`,
          "identity.kind",
          "Only object types may define identity."
        )
        continue
      }
      const props = this.collectProps(name)
      for (const f of ids)
        if (!(f in props))
          this.ctx.error(
            `/types/${name}/identity`,
            "identity.missing",
            `Identity field '${f}' does not exist.`
          )
      const baseName = typeof t.extends === "string" ? t.extends : undefined
      if (baseName) {
        const base = this.ctx.types[baseName]
        if (
          Array.isArray(base.identity) &&
          JSON.stringify(base.identity) !== JSON.stringify(ids)
        )
          this.ctx.error(
            `/types/${name}/identity`,
            "identity.override",
            "Derived types cannot redefine identity."
          )
      }
    }
  }
  private checkEnums() {
    for (const [n, t] of Object.entries(this.ctx.types))
      if (kindOf(t) === "enum" && isObj(t.properties))
        this.ctx.error(
          `/types/${n}`,
          "enum.invalid",
          "Enum must not have properties."
        )
  }
  private checkAliases() {
    for (const [n, t] of Object.entries(this.ctx.types))
      if (kindOf(t) === "alias" && !("type" in t))
        this.ctx.error(
          `/types/${n}`,
          "alias.invalid",
          "Alias must define 'type'."
        )
  }
}
