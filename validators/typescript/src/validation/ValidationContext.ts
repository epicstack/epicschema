
import { ValidationError } from "./ValidationError";
export type JsonObject = Record<string, any>;
export class ValidationContext {
  public readonly types: Record<string, JsonObject> = {};
  public readonly errors: ValidationError[] = [];
  constructor(public readonly document: JsonObject) {
    if (document.types && typeof document.types === "object") {
      for (const [name, type] of Object.entries(document.types)) {
        if (type && typeof type === "object") this.types[name] = type;
      }
    }
  }
  error(path: string, code: string, message: string): void {
    this.errors.push(new ValidationError(path, code, message));
  }
}
