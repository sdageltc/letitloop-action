#!/usr/bin/env python3
"""
verify_ast.py — Pure standard-library AST signature and invariant validator.
Runs without third-party dependencies in any Python 3.10+ environment.
"""
import ast
import sys
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

def extract_signature(func_node: ast.FunctionDef | ast.AsyncFunctionDef) -> Dict[str, Any]:
    args = func_node.args
    pos_args = [a.arg for a in getattr(args, "posonlyargs", [])] + [a.arg for a in args.args]
    pos_types = [ast.unparse(a.annotation) if a.annotation else None for a in getattr(args, "posonlyargs", []) + args.args]
    kwonly_args = [a.arg for a in args.kwonlyargs]
    kwonly_types = [ast.unparse(a.annotation) if a.annotation else None for a in args.kwonlyargs]
    decorators = [ast.unparse(d) for d in func_node.decorator_list]
    returns = ast.unparse(func_node.returns) if func_node.returns else None
    
    return {
        "pos_args": pos_args,
        "pos_types": pos_types,
        "kwonly_args": kwonly_args,
        "kwonly_types": kwonly_types,
        "num_defaults": len(args.defaults),
        "num_kw_defaults": len([d for d in args.kw_defaults if d is not None]),
        "has_vararg": bool(args.vararg),
        "has_kwarg": bool(args.kwarg),
        "decorators": decorators,
        "returns": returns,
        "is_async": isinstance(func_node, ast.AsyncFunctionDef),
    }

def find_all_functions(tree: ast.AST) -> Dict[str, ast.FunctionDef | ast.AsyncFunctionDef]:
    funcs = {}
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            funcs[node.name] = node
    return funcs

def compare_modules(orig_source: str, new_source: str) -> List[Dict[str, Any]]:
    try:
        orig_tree = ast.parse(orig_source)
    except SyntaxError as e:
        return [{"symbol": "MODULE", "type": "SYNTAX_ERROR_ORIGINAL", "message": str(e)}]
        
    try:
        new_tree = ast.parse(new_source)
    except SyntaxError as e:
        return [{"symbol": "MODULE", "type": "SYNTAX_ERROR_MODIFIED", "message": str(e)}]
    
    orig_funcs = find_all_functions(orig_tree)
    new_funcs = find_all_functions(new_tree)
    
    violations = []
    for name, orig_node in orig_funcs.items():
        if name in new_funcs:
            orig_sig = extract_signature(orig_node)
            new_sig = extract_signature(new_funcs[name])
            if orig_sig != new_sig:
                violations.append({
                    "symbol": name,
                    "original": orig_sig,
                    "modified": new_sig,
                    "type": "SIGNATURE_DRIFT"
                })
    return violations

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"status": "ERROR", "message": "Usage: verify_ast.py <orig_file> <new_file>"}))
        sys.exit(1)
    
    orig_path = Path(sys.argv[1])
    new_path = Path(sys.argv[2])
    
    if not orig_path.exists() or not new_path.exists():
        print(json.dumps({"status": "ERROR", "message": f"Files not found: {orig_path} or {new_path}"}))
        sys.exit(1)
        
    violations = compare_modules(orig_path.read_text(encoding="utf-8"), new_path.read_text(encoding="utf-8"))
    result = {
        "status": "PASS" if len(violations) == 0 else "FAIL",
        "violations": violations,
        "violation_count": len(violations)
    }
    print(json.dumps(result, indent=2))
    sys.exit(0 if len(violations) == 0 else 1)

if __name__ == "__main__":
    main()
