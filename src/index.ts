import * as core from '@actions/core';
import * as github from '@actions/github';
import * as exec from '@actions/exec';
import { ensureLetItLoopEngine } from './verifier';
import { formatEvidenceComment, VerificationEvidence } from './commenter';
import * as crypto from 'crypto';

import * as fs from 'fs';
import * as path from 'path';

async function run(): Promise<void> {
  const startTime = Date.now();
  try {
    const token = core.getInput('github-token', { required: true });
    const strictAst = core.getInput('strict-ast') === 'true';
    const testCommand = core.getInput('test-command') || 'pytest -q';
    const autoInstall = core.getInput('auto-install-engine') === 'true';
    const allowedScope = core.getInput('allowed-scope') || '';

    core.info('Starting LetItLoop PR Verification Gate...');

    // 1. Ensure engine presence
    await ensureLetItLoopEngine(autoInstall);

    // 2. Run Test Command
    let testExitCode = 0;
    try {
      testExitCode = await exec.exec(testCommand);
    } catch (e) {
      testExitCode = 1;
    }

    const elapsedMs = Date.now() - startTime;
    let sha = '';
    let scopeViolations: string[] = [];
    let astValid = true;

    // Check for physical proof receipts written by engine (.bench_wal/proof_receipt.json)
    const possibleEvidencePaths = [
      path.join(process.cwd(), '.bench_wal', 'proof_receipt.json'),
      path.join(process.cwd(), 'scratch', 'orchestrator_runs', 'proof_receipt.json'),
      path.join(process.cwd(), 'scratch', 'proof_receipt.json'),
      path.join(process.cwd(), 'proof_receipt.json'),
      path.join(process.cwd(), 'scratch', 'orchestrator_runs', 'verification_evidence.json'),
      path.join(process.cwd(), 'verification_evidence.json'),
    ];

    let foundEvidence = false;
    for (const ep of possibleEvidencePaths) {
      if (fs.existsSync(ep)) {
        try {
          const raw = fs.readFileSync(ep, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed.receiptSha256) {
            sha = parsed.receiptSha256;
          } else {
            sha = crypto.createHash('sha256').update(raw).digest('hex');
          }
          if (parsed.astInvariantsValid !== undefined) {
            astValid = Boolean(parsed.astInvariantsValid);
          } else if (parsed.all_passed !== undefined) {
            astValid = Boolean(parsed.all_passed);
          }
          if (parsed.scopeViolations && Array.isArray(parsed.scopeViolations)) {
            scopeViolations.push(...parsed.scopeViolations);
          }
          foundEvidence = true;
          core.info(`Ingested physical engine proof receipt from: ${ep}`);
          break;
        } catch (err) {
          core.debug(`Failed reading evidence from ${ep}: ${err}`);
        }
      }
    }

    // 3. Fallback AST verification script if no receipt was written
    if (!foundEvidence && strictAst) {
      try {
        const verifyScript = path.join(__dirname, '..', 'scripts', 'verify_ast.py');
        if (fs.existsSync(verifyScript)) {
          const astExit = await exec.exec(`python "${verifyScript}"`);
          astValid = (astExit === 0);
        } else {
          astValid = false;
        }
      } catch (e) {
        astValid = false;
      }
    }

    // 4. Scope Fence Diff Inspection
    if (allowedScope) {
      try {
        let gitDiffOutput = '';
        await exec.exec('git', ['diff', '--name-only', 'HEAD~1', 'HEAD'], {
          listeners: {
            stdout: (data: Buffer) => {
              gitDiffOutput += data.toString();
            },
          },
        });
        const modifiedFiles = gitDiffOutput.split('\n').map(f => f.trim()).filter(Boolean);
        const allowedPatterns = allowedScope.split(',').map(p => p.trim()).filter(Boolean);
        for (const file of modifiedFiles) {
          const isAllowed = allowedPatterns.some(pattern => file.startsWith(pattern.replace('/**', '')) || file.includes(pattern));
          if (!isAllowed && !scopeViolations.includes(file)) {
            scopeViolations.push(`File outside declared scope modified: ${file}`);
          }
        }
      } catch (diffErr) {
        core.debug(`Scope diff check error: ${diffErr}`);
      }
    }

    if (!sha) {
      const commitSha = process.env.GITHUB_SHA || 'local-head';
      sha = crypto.createHash('sha256').update(`${commitSha}:${testExitCode}:${elapsedMs}:${astValid}`).digest('hex');
    }

    const evidence: VerificationEvidence = {
      passed: testExitCode === 0 && astValid && scopeViolations.length === 0,
      astInvariantsValid: astValid,
      testExitCode: testExitCode,
      scopeViolations: scopeViolations,
      executionTimeMs: elapsedMs,
      receiptSha256: sha,
    };

    const commentBody = formatEvidenceComment(evidence);

    // 5. Output to GitHub Step Summary ($GITHUB_STEP_SUMMARY)
    try {
      await core.summary.addRaw(commentBody).write();
      core.info('Written verification receipt to GitHub Actions Step Summary.');
    } catch (summaryError) {
      core.debug(`Failed to write step summary: ${summaryError}`);
    }

    // 6. Post comment if in PR context with graceful token fallback
    const context = github.context;
    if (context.payload.pull_request) {
      try {
        const octokit = github.getOctokit(token);
        await octokit.rest.issues.createComment({
          ...context.repo,
          issue_number: context.payload.pull_request.number,
          body: commentBody,
        });
        core.info('Posted LetItLoop Proof Receipt to Pull Request.');
      } catch (commentError) {
        core.warning(
          `Unable to post comment to Pull Request (likely due to fork permissions or missing 'pull-requests: write'). Proof receipt recorded in Step Summary and stdout.`
        );
      }
    } else {
      core.info('Not in a pull_request event context. Outputting proof to console:');
      core.info(commentBody);
    }

    if (!evidence.passed) {
      if (testExitCode !== 0) {
        core.setFailed(`LetItLoop verification failed with test exit code ${testExitCode}`);
      } else if (!astValid) {
        core.setFailed('LetItLoop verification failed: AST invariants or syntax check failed.');
      } else if (scopeViolations.length > 0) {
        core.setFailed(`LetItLoop verification failed: Scope fencing violations detected: ${scopeViolations.join('; ')}`);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`LetItLoop Action error: ${error.message}`);
    }
  }
}

run();
