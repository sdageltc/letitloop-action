"""Standalone zero-dependency AST invariant validator for letitloop-action."""

import ast
import json
import sys
from pathlib import Path


def extract_signatures(code: str) -> dict[str, str]:
    tree = ast.parse(code)
    sigs = {}
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            args = [
                f"{a.arg}: {ast.unparse(a.annotation)}" if a.annotation else a.arg
                for a in node.args.args
            ]
            ret = ast.unparse(node.returns) if getattr(node, "returns", None) else "None"
            sigs[node.name] = f"({', '.join(args)}) -> {ret}"
        elif isinstance(node, ast.ClassDef):
            sigs[node.name] = f"class({', '.join(b.id for b in node.bases if isinstance(b, ast.Name))})"
    return sigs


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
    if len(sys.argv) == 3:
        # Comparison mode between two files (e.g. baseline vs PR version)
        path_a = Path(sys.argv[1])
        path_b = Path(sys.argv[2])
        try:
            code_a = path_a.read_text(encoding="utf-8", errors="replace")
            code_b = path_b.read_text(encoding="utf-8", errors="replace")
            sigs_a = extract_signatures(code_a)
            sigs_b = extract_signatures(code_b)
            if sigs_a == sigs_b:
                print(json.dumps({"status": "PASS", "signatures": sigs_a}))
                sys.exit(0)
            else:
                diff = {"before": sigs_a, "after": sigs_b}
                print(json.dumps({"status": "FAIL", "reason": "signature_drift", "diff": diff}))
                sys.exit(1)
        except Exception as exc:
            print(json.dumps({"status": "FAIL", "reason": str(exc)}))
            sys.exit(1)

    # Repository scan mode
    root = Path.cwd()
    py_files = list(root.rglob("*.py"))
    py_files = [
        p
        for p in py_files
        if not any(part.startswith(".") or part in ("venv", "node_modules", "dist", "build") for part in p.parts)
    ]

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
