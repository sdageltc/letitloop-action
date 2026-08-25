# Contributing to letitloop-action 🛡️

Thank you for contributing to `letitloop-action`, the proof-carrying GitHub Action for AI pull request verification.

---

## 🛠️ Development Setup

This Action is written in TypeScript and compiled into a single zero-dependency bundle using `@vercel/ncc`.

### Prerequisites
- Node.js 20+
- npm 9+

### Installation & Build Commands

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests
npm test

# 3. Compile TypeScript & bundle into dist/index.js
npm run build
```

---

## 📦 Bundling Invariant (Crucial)

GitHub Actions runs directly against `dist/index.js` in the repository without running `npm install` on the runner.
- When you modify any code in `src/`, you **MUST** run `npm run build` to update `dist/index.js`.
- Always commit both `src/` and the updated `dist/index.js` bundle.

---

## 🧪 Testing

We use Jest for unit testing AST invariants, commenters, and verifiers:

```bash
npm test
```

---

## 📜 Pull Request Guidelines

1. Ensure all tests pass (`npm test`).
2. Verify that `dist/index.js` is updated if source files changed (`npm run build`).
3. Maintain clear, conventional commit messages (`feat:`, `fix:`, `docs:`).
