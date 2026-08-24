import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const projectRoot = fileURLToPath(new URL('../..', import.meta.url));

export const expectedPackageFiles = [
  'LICENSE',
  'README.md',
  'index.d.mts',
  'index.d.ts',
  'index.js',
  'index.mjs',
  'package.json',
];

export function packProject(destination) {
  const output = runNpm(
    ['pack', '--json', '--pack-destination', destination],
    projectRoot,
    { encoding: 'utf8' },
  );
  const [packResult] = JSON.parse(output);

  return {
    files: packResult.files.map(({ path }) => path).sort(),
    tarball: join(destination, packResult.filename),
  };
}

export function installPackedPackage(parent, name, tarball, type) {
  const consumer = join(parent, name);
  mkdirSync(consumer, { recursive: true });
  writeJson(join(consumer, 'package.json'), {
    name,
    private: true,
    type,
  });
  runNpm(
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball],
    consumer,
  );
  return consumer;
}

export function installRegistryPackage(consumer, specifier) {
  runNpm(
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', specifier],
    consumer,
  );
}

export function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: 'pipe' });
}

export function runNode(filename, cwd) {
  run(process.execPath, [filename], cwd);
}

function runNpm(args, cwd, options = {}) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath
    ? [process.execPath, [npmExecPath, ...args]]
    : [process.platform === 'win32' ? 'npm.cmd' : 'npm', args];

  return execFileSync(command[0], command[1], {
    cwd,
    stdio: options.encoding ? ['ignore', 'pipe', 'pipe'] : 'pipe',
    ...options,
  });
}

export function runTypeScript(configFile, cwd) {
  const typescriptRoot = dirname(require.resolve('typescript/package.json'));
  run(
    process.execPath,
    [join(typescriptRoot, 'bin', 'tsc'), '--project', configFile],
    cwd,
  );
}

export function writeJson(filename, value) {
  writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeText(filename, value) {
  writeFileSync(filename, value);
}
