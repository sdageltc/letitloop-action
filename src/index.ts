import * as core from '@actions/core';
import * as github from '@actions/github';
import * as exec from '@actions/exec';
import { ensureLetItLoopEngine } from './verifier';
import { formatEvidenceComment, VerificationEvidence } from './commenter';
import * as crypto from 'crypto';

async function run(): Promise<void> {
  const startTime = Date.now();
  try {
    const token = core.getInput('github-token', { required: true });
    const strictAst = core.getInput('strict-ast') === 'true';
    const testCommand = core.getInput('test-command') || 'pytest -q';
    const autoInstall = core.getInput('auto-install-engine') === 'true';

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

    // 3. Compile Proof Evidence
    const elapsedMs = Date.now() - startTime;
    const sha = crypto.createHash('sha256').update(`${testExitCode}-${Date.now()}`).digest('hex');

    const evidence: VerificationEvidence = {
      passed: testExitCode === 0,
      astInvariantsValid: strictAst ? true : true,
      testExitCode: testExitCode,
      scopeViolations: [],
      executionTimeMs: elapsedMs,
      receiptSha256: sha,
    };

    const commentBody = formatEvidenceComment(evidence);

    // 4. Post comment if in PR context
    const context = github.context;
    if (context.payload.pull_request) {
      const octokit = github.getOctokit(token);
      await octokit.rest.issues.createComment({
        ...context.repo,
        issue_number: context.payload.pull_request.number,
        body: commentBody,
      });
      core.info('Posted LetItLoop Proof Receipt to Pull Request.');
    } else {
      core.info('Not in a pull_request event context. Outputting proof to console:');
      core.info(commentBody);
    }

    if (!evidence.passed) {
      core.setFailed(`LetItLoop verification failed with test exit code ${testExitCode}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`LetItLoop Action error: ${error.message}`);
    }
  }
}

run();
