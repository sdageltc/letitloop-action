const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[TEST] Starting LetItLoop GitHub Action Integrity Suite...');

// 1. Check action.yml exists and has valid branding
const actionYamlPath = path.resolve(__dirname, '../action.yml');
if (!fs.existsSync(actionYamlPath)) {
  console.error('FAIL: action.yml missing!');
  process.exit(1);
}
const actionYaml = fs.readFileSync(actionYamlPath, 'utf8');
if (!actionYaml.includes("icon: 'shield'") || !actionYaml.includes("color: 'blue'")) {
  console.error('FAIL: action.yml branding icon/color invalid!');
  process.exit(1);
}
if (!actionYaml.includes("using: 'node20'") || !actionYaml.includes("main: 'dist/index.js'")) {
  console.error('FAIL: action.yml runs configuration invalid!');
  process.exit(1);
}
console.log('PASS: action.yml metadata & Marketplace branding valid.');

// 2. Check compiled distribution bundle
const distPath = path.resolve(__dirname, '../dist/index.js');
if (!fs.existsSync(distPath)) {
  console.error('FAIL: dist/index.js missing!');
  process.exit(1);
}
const distStats = fs.statSync(distPath);
if (distStats.size < 500000) {
  console.error(`FAIL: dist/index.js is unexpectedly small (${distStats.size} bytes)!`);
  process.exit(1);
}
console.log(`PASS: dist/index.js bundled successfully (${(distStats.size / 1024 / 1024).toFixed(2)} MB, zero-runtime dependency).`);

// 3. Test verify_ast.py with sample AST comparisons
const verifyScript = path.resolve(__dirname, 'verify_ast.py');
const tempA = path.resolve(__dirname, 'temp_a.py');
const tempB = path.resolve(__dirname, 'temp_b.py');

try {
  // Test 1: Identical signatures -> PASS
  fs.writeFileSync(tempA, 'def add(x: int, y: int) -> int:\n    return x + y\n');
  fs.writeFileSync(tempB, 'def add(x: int, y: int) -> int:\n    # Refactored\n    return x + y\n');
  const res1 = execSync(`python "${verifyScript}" "${tempA}" "${tempB}"`, { encoding: 'utf8' });
  const parsed1 = JSON.parse(res1);
  if (parsed1.status !== 'PASS') {
    throw new Error(`Expected PASS, got ${parsed1.status}`);
  }
  console.log('PASS: AST invariant validator passed on matching signature.');

  // Test 2: Signature drift -> FAIL with exit code 1
  fs.writeFileSync(tempB, 'def add(x: int, y: str) -> int:\n    return x\n');
  let caughtDrift = false;
  try {
    execSync(`python "${verifyScript}" "${tempA}" "${tempB}"`, { encoding: 'utf8' });
  } catch (err) {
    caughtDrift = true;
    const parsedDrift = JSON.parse(err.stdout);
    if (parsedDrift.status !== 'FAIL' || parsedDrift.violation_count === 0) {
      throw new Error(`Expected violation count > 0, got ${JSON.stringify(parsedDrift)}`);
    }
  }
  if (!caughtDrift) {
    throw new Error('Expected AST verifier to exit with code 1 on signature drift!');
  }
  console.log('PASS: AST invariant validator correctly flagged signature drift.');
} finally {
  if (fs.existsSync(tempA)) fs.unlinkSync(tempA);
  if (fs.existsSync(tempB)) fs.unlinkSync(tempB);
}

console.log('ALL LETITLOOP-ACTION TESTS PASSED (100% GREEN)!');
process.exit(0);
