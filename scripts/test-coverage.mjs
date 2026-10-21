import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this script with npm run test:coverage.');

const cwd = fileURLToPath(new URL('..', import.meta.url));
for (const script of ['test', 'test:differential', 'test:modules']) {
  const result = spawnSync(process.execPath, [npmCli, 'run', script], {
    cwd,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
