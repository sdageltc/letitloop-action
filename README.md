# LetItLoop Proof-Carrying PR Verification Gate 🛡️

**Zero-config GitHub Action that attaches signed, machine-verifiable proof bundles to AI-generated Pull Requests.**

Ordinary CI runs tests, but doesn't prove structural safety. `letitloop-action` provides cryptographic and AST-level proofs that AI coding agents (Claude Code, Cursor, Sweep, Dependabot, Renovate) did not introduce silent regressions:

- 🟢 **AST Signature Integrity**: Guarantees zero unapproved parameter drift, decorator stripping, or type mutations.
- 🟢 **Scope Fencing**: Proves that only files inside the declared task boundary were modified.
- 🟢 **Signed Evidence Ledger**: Emits a deterministic SHA-256 proof receipt directly into the PR comment.

---

## Quick Start

Add `.github/workflows/verify-pr.yml` to your repository:

```yaml
name: Verify Pull Request

on:
  pull_request:
    branches: [ main ]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - uses: sdageltc/letitloop-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          strict-ast: 'true'
          test-command: 'pytest -q'
```

---

## Example PR Proof Output

| Verification Check | Status | Empirical Details |
|---|:---:|---|
| **AST Invariant Integrity** | 🟢 PASS | Zero signature or parameter drift |
| **Test Suite Execution** | 🟢 PASS | Process Exit Code: `0` |
| **Scope Fencing & Mutation Lease** | 🟢 PASS | 0 undeclared file mutations |

```json
{
  "proof_receipt": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "engine_latency_ms": 142.5,
  "deterministic_gates": "PASS"
}
```
