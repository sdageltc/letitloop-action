import * as exec from '@actions/exec';
import * as core from '@actions/core';

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
