import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as path from 'path';

export interface AstVerificationReport {
  status: 'PASS' | 'FAIL' | 'SKIPPED' | 'ERROR';
  violations: Array<{
    symbol: string;
    type: string;
    original?: any;
    modified?: any;
    message?: string;
  }>;
  violationCount: number;
}

export async function ensureLetItLoopEngine(autoInstall: boolean): Promise<boolean> {
  let found = false;
  try {
    const exitCode = await exec.exec('lil', ['--version'], { silent: true });
    found = exitCode === 0;
  } catch (err) {
    found = false;
  }

  if (!found && autoInstall) {
    core.info('letitloop CLI not found in PATH. Auto-installing from PyPI...');
    try {
      const pipExit = await exec.exec('pip', ['install', 'letitloop>=0.2.0']);
      return pipExit === 0;
    } catch (e) {
      core.warning(`Failed to auto-install letitloop: ${e}`);
      return false;
    }
  }
  return found;
}

export async function verifyAstInvariants(origFile: string, newFile: string): Promise<AstVerificationReport> {
  const scriptPath = path.resolve(__dirname, '../scripts/verify_ast.py');
  let output = '';
  let errorOutput = '';

  const options: exec.ExecOptions = {
    silent: true,
    ignoreReturnCode: true,
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString();
      },
      stderr: (data: Buffer) => {
        errorOutput += data.toString();
      }
    }
  };

  try {
    const exitCode = await exec.exec('python', [scriptPath, origFile, newFile], options);
    if (output.trim()) {
      const parsed = JSON.parse(output.trim());
      return {
        status: parsed.status || (exitCode === 0 ? 'PASS' : 'FAIL'),
        violations: parsed.violations || [],
        violationCount: parsed.violation_count || (parsed.violations ? parsed.violations.length : 0),
      };
    }
    return {
      status: exitCode === 0 ? 'PASS' : 'FAIL',
      violations: [],
      violationCount: 0,
    };
  } catch (err) {
    core.warning(`AST verification skipped or failed: ${err}`);
    return {
      status: 'SKIPPED',
      violations: [],
      violationCount: 0,
    };
  }
}
