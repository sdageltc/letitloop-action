"""Standalone zero-dependency AST invariant validator for letitloop-action."""

import ast
import sys
from pathlib import Path

def verify_file_ast(file_path: Path) -> tuple[bool, str]:
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            code = f.read()
        ast.parse(code, filename=str(file_path))
        return True, "OK"
    except SyntaxError as exc:
        return False, f"SyntaxError line {exc.lineno}: {exc.msg}"
    except Exception as exc:
        return False, f"AST parse failed: {exc}"

def main():
    root = Path.cwd()
    py_files = list(root.rglob("*.py"))
    # Filter out hidden or venv directories
    py_files = [p for p in py_files if not any(part.startswith(".") or part in ("venv", "node_modules", "dist", "build") for part in p.parts)]

    violations = []
    for p in py_files:
        ok, msg = verify_file_ast(p)
        if not ok:
            violations.append((str(p.relative_to(root)), msg))

    if violations:
        print(f"[letitloop-action] Found {len(violations)} AST invariant violation(s):", file=sys.stderr)
        for path_str, msg in violations:
            print(f"  - {path_str}: {msg}", file=sys.stderr)
        sys.exit(1)
    print(f"[letitloop-action] All {len(py_files)} Python files passed AST invariant verification.")
    sys.exit(0)

if __name__ == "__main__":
    main()
