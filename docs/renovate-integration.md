# Proof-Carrying Dependency Verification 🛡️

Automate machine-verifiable proof generation for automated dependency bots (Dependabot, Renovate, Snyk).

## GitHub Actions Workflow

Create `.github/workflows/verify-dependencies.yml`:

```yaml
name: Auto-Verify Dependency PRs

on:
  pull_request_target:
    types: [opened, synchronize]

jobs:
  verify-dependency:
    if: github.actor == 'dependabot[bot]' || github.actor == 'renovate[bot]'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout PR branch
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.ref }}

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Run LetItLoop Proof Gate
        uses: sdageltc/letitloop-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          strict-ast: 'true'
          test-command: 'pytest -q'
```

---

## How it Works

1. **Deterministic Execution**: The action runs the repository test suite inside an isolated sandbox.
2. **AST Invariant Check**: Proves that the dependency update did not inadvertently alter public API signatures or function signatures.
3. **Signed Proof Receipt**: Injects a verifiable SHA-256 evidence bundle into the PR discussion.
