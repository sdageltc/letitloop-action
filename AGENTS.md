# Agent Execution Guidelines for letitloop-action

## ⚡ Fast Test & Build Protocol

### 1. Test Invariants (< 2s)
```bash
npm test
```

### 2. Fast Build & Bundle
```bash
npm run build
```

### 🔒 Invariants
- **Deterministic Validator**: `letitloop-action` is strictly a zero-dependency deterministic proof validator and GitHub Actions gate (no live LLM repair loops inside CI).
- **Proof Schema Invariance**: Validates HMAC-SHA256 signatures, contract step hashes, and AST syntax.
- **Attribution**: Commits must use `sdageltc <sdageltc@users.noreply.github.com>`.
