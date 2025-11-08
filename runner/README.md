# OpenSchema Conformance Suite

This suite verifies that all OpenSchema validator implementations (C# and TypeScript) behave identically.

## Usage

```bash
# 1. Build validators
cd validators/typescript && npm run build
cd ../../validators/csharp && dotnet build -c Release

# 2. Run the test suite
cd ../../runner
npm ci
npm run test:conformance
```

Results are written to `runner/results/conformance-report.md`.
