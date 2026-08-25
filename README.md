<div align="center">

# letitloop-action 🛡️

**Zero-Config GitHub Action for Proof-Carrying Verification on AI Pull Requests**

[![CI](https://github.com/sdageltc/letitloop-action/actions/workflows/ci.yml/badge.svg)](https://github.com/sdageltc/letitloop-action/actions/workflows/ci.yml)
[![Action](https://img.shields.io/badge/GitHub%20Action-v1-orange.svg)](https://github.com/sdageltc/letitloop-action)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Zero Runtime Dep](https://img.shields.io/badge/Runtime-Zero%20Node%20Modules-brightgreen.svg)](dist/index.js)

**[Durability Benchmark](https://github.com/sdageltc/agent-durability-bench)** • **[PR Verification Action](https://github.com/sdageltc/letitloop-action)** • **[Engine Core](https://github.com/sdageltc/letitloop)**

</div>

---

## Why Proof-Carrying CI?

Standard CI runs unit tests, but fails to prevent subtle AI coding agent regressions:
- **Parameter and Signature Drift**: An agent alters a function signature or drops default values without breaking local tests.
- **Decorator Stripping**: Whole-file code rewrites silently remove critical decorators like `@property`, `@dataclass`, or `@override`.
- **Scope Boundary Leakage**: An agent tasked with editing `src/auth.py` modifies unrelated configuration files or test fixtures.

`letitloop-action` runs inside GitHub Actions, verifies structural AST invariants, fences scope boundaries, and posts a signed evidence receipt directly to the Pull Request.

---

## Quickstart (1-Minute Setup)

Add `.github/workflows/letitloop-verify.yml` to your repository:

```yaml
name: Verify AI Pull Request

on:
  pull_request:
    branches: [ main ]

permissions:
  contents: read
  pull-requests: write

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Run LetItLoop Verification Gate
        uses: sdageltc/letitloop-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          strict-ast: 'true'
          test-command: 'pytest -q'
```

---

## Two-Tier Verification Engine

`letitloop-action` automatically adapts its verification pipeline to your repository language:

| Capability Tier | Scope | What It Enforces |
|---|---|---|
| **Tier 1: Universal (Any Language)** | Python, TypeScript, Go, Rust, Java | • **Scope Boundary Lease**: Confirms only allowed files are modified.<br>• **Subprocess Test Gate**: Captures test stdout and asserts exit code `0`.<br>• **Proof Receipt**: Generates signed SHA-256 evidence bundle. |
| **Tier 2: Python Advanced (3.10+)** | Python Codebases | • **AST Signature Integrity**: Detects unapproved parameter or type changes.<br>• **Decorator Retention**: Ensures zero decorator stripping.<br>• **Comment Preservation**: Guarantees zero comment erasure from AST unparsing. |

---

## Example Pull Request Evidence Bundle

When `letitloop-action` runs on a Pull Request, it evaluates structural invariants and leaves a clean status report:

```markdown
### 🛡️ LetItLoop Verification Receipt

| Verification Gate | Result | Empirical Details |
|---|:---:|---|
| **AST Invariant Integrity** | 🟢 PASS | Zero parameter drift, 0 decorators stripped |
| **Test Suite Execution** | 🟢 PASS | Command `pytest -q` completed with exit code `0` |
| **Scope Fencing Boundary** | 🟢 PASS | 2/2 changed files within declared scope lease |

```json
{
  "proof_receipt": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "engine_latency_ms": 138.4,
  "deterministic_gates": "PASS"
}
```
```

---

## Action Configuration Reference

| Input Parameter | Type | Default | Description |
|---|---|---|---|
| `github-token` | String | Required | GitHub token (`${{ secrets.GITHUB_TOKEN }}`) for posting comments. |
| `strict-ast` | Boolean | `'true'` | When enabled, runs AST signature checks on Python files. |
| `test-command` | String | `''` | Optional test command to execute before issuing receipt (e.g. `npm test`, `pytest`). |
| `scope-fence` | String | `''` | Optional comma-separated glob patterns restricting allowed file modifications. |
| `post-comment` | Boolean | `'true'` | Whether to post or update the evidence table on the Pull Request. |

---

## Standalone Bundle (`@vercel/ncc`)

`letitloop-action` compiles into a standalone bundle at `dist/index.js` (~1.08MB). It requires **zero `node_modules` installation at runtime**, ensuring execution starts in under 2 seconds.

---

## License

MIT License. Copyright (c) 2026 sdageltc.
