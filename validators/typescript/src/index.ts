
import { MetaSchemaValidator } from "./validation/MetaSchemaValidator";
import { SemanticValidator } from "./validation/SemanticValidator";
import { ValidationError } from "./validation/ValidationError";

export class OpenSchemaValidator {
  private readonly meta = new MetaSchemaValidator();
  validate(doc: unknown): ValidationError[] {
    const metaErrors = this.meta.validate(doc);
    if (metaErrors.length) return metaErrors;
    const sem = new SemanticValidator(doc as any);
    return sem.validate();
  }
}
export { MetaSchemaValidator, SemanticValidator, ValidationError };
