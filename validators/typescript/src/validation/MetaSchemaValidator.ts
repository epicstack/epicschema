import Ajv2020 from "ajv/dist/2020"
import type { ErrorObject } from "ajv"
import metaSchema from "../meta-schema.json"
import { ValidationError } from "./ValidationError"

export class MetaSchemaValidator {
  private readonly ajv: Ajv2020
  private readonly validateFn: (data: unknown) => boolean

  constructor() {
    this.ajv = new Ajv2020({
      allErrors: true,
      strict: false,
    })
    this.validateFn = this.ajv.compile(metaSchema)
  }

  validate(doc: unknown): ValidationError[] {
    const ok = this.validateFn(doc)
    if (ok) return []

    const errs = (this.validateFn as any).errors as
      | ErrorObject[]
      | null
      | undefined
    const list = errs ?? []
    return list.map(
      (e) =>
        new ValidationError(
          e.instancePath || "/",
          "meta",
          e.message ?? `${e.keyword} failed`
        )
    )
  }
}
