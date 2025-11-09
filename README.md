# 🧩 OpenSchema Monorepo

[![Build & Test](https://github.com/epicstack/epicschema/actions/workflows/build.yml/badge.svg)](https://github.com/epicstack/epicschema/actions/workflows/build.yml)
[![Conformance](https://github.com/epicstack/epicschema/actions/workflows/conformance.yml/badge.svg)](https://github.com/epicstack/epicschema/actions/workflows/conformance.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

> **OpenSchema** is an open-source initiative for defining, validating, and generating **domain models** in a language- and vendor-agnostic way — similar in spirit to **OpenAPI** and **OpenTelemetry**, but focused on **business schema interoperability**.

## 📘 Overview

OpenSchema provides a unified, open format for:

| Concept                 | Description                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| **Open Schema**         | Define and share domain/business models in a structured, language-neutral format (`.os.json`). |
| **Open DB** _(planned)_ | Abstract database implementations using OpenSchema definitions.                                |
| **Open Q** _(planned)_  | Define and model async communication contracts between services.                               |

The monorepo includes the **core spec**, **TypeScript SDKs**, a **.NET SDK**, **CLI tools**, and a **cross-language conformance test suite**.

## 🏗️ Repository Structure

```
epicschema/
├─ spec/
├─ packages/
├─ sdks/
├─ runner/
├─ tests/
└─ .github/workflows/
```

## ⚙️ Setup

### Prerequisites

- Node.js 20+
- PNPM 9.x (via Corepack)
- Optional: .NET 8 SDK (for C# CLI)

### Install dependencies

```bash
corepack enable
corepack prepare pnpm@9.12.1 --activate
pnpm install
```

### Build everything

```bash
pnpm -r build
```

### Validate a schema

```bash
node packages/validator-ts/dist/cli.js examples/example.os.json
```

### Run conformance tests

```bash
pnpm --filter @openschema/runner test:conformance
```

## 🧪 Continuous Integration

| Workflow     | Description                                          | Status |
| ------------ | ---------------------------------------------------- | ------ |
| Build & Test | Installs deps, builds all packages, runs smoke tests | ✅     |
| Conformance  | Runs validator and codegen conformance suite         | ✅     |

## 📦 Package Summary

| Package                    | Description                      | Language   | Status          |
| -------------------------- | -------------------------------- | ---------- | --------------- |
| `@openschema/core`         | Shared AJV-based validation core | TypeScript | ✅ Stable       |
| `@openschema/validator-ts` | TypeScript validator CLI         | TypeScript | ✅ Stable       |
| `@openschema/codegen-ts`   | TypeScript model code generator  | TypeScript | 🚧 Experimental |
| `.NET SDK`                 | Schema validator CLI for .NET    | C#         | 🚧 In Progress  |
| `runner`                   | Conformance test runner          | TypeScript | ✅ Working      |

## 🧭 Development Guidelines

### For all TypeScript packages

```bash
pnpm install
pnpm -r build
pnpm -r lint
```

### For .NET SDK

```bash
cd sdks/dotnet/OpenSchema.Cli
dotnet build -c Release
dotnet run validate ../../examples/example.os.json
```

## 🧰 Tech Stack

- PNPM workspaces (monorepo management)
- TypeScript (NodeNext) with strict typing
- AJV 2020-12 for JSON Schema validation
- Commander.js for CLI tools
- GitHub Actions for CI/CD
- .NET 8 for cross-language SDKs

## 🧱 Roadmap

- [x] TypeScript validator CLI
- [x] Conformance suite
- [x] Monorepo migration
- [ ] TypeScript code generator
- [ ] .NET SDK parity
- [ ] Open DB specification
- [ ] Open Q specification

## 🤝 Contributing

Contributions are welcome!
Please check `CONTRIBUTING.md` and open a PR targeting the `main` branch.

Before submitting:

```bash
pnpm -r lint
pnpm -r test
```

## 📜 License

Licensed under the Apache 2.0 License.
See `LICENSE` for details.

_Developed with ❤️ by the EpicStack community — building open tools for transparent software architecture._
