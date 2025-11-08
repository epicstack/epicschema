
export class ValidationError {
  constructor(
    public path: string,
    public code: string,
    public message: string
  ) {}
  toString(): string { return `${this.path} [${this.code}] ${this.message}`; }
}
