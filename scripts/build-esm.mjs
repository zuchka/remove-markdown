import { readFileSync, writeFileSync } from 'node:fs';

const commonJsEntry = new URL('../index.js', import.meta.url);
const esmEntry = new URL('../index.mjs', import.meta.url);
const assignment = 'module.exports = function(md, options) {';
const declaration = 'export default function removeMarkdown(md, options) {';
const generatedNotice =
  '// Generated from index.js by scripts/build-esm.mjs. Do not edit directly.\n\n';

const commonJsSource = readFileSync(commonJsEntry, 'utf8');
const assignmentCount = commonJsSource.split(assignment).length - 1;

if (assignmentCount !== 1) {
  throw new Error(
    `Expected exactly one CommonJS export assignment, found ${assignmentCount}`,
  );
}

const expectedEsmSource =
  generatedNotice + commonJsSource.replace(assignment, declaration);

if (process.argv.includes('--check')) {
  const actualEsmSource = readFileSync(esmEntry, 'utf8');

  if (actualEsmSource !== expectedEsmSource) {
    throw new Error(
      'index.mjs is out of date. Run `npm run build:esm` and commit the result.',
    );
  }
} else {
  writeFileSync(esmEntry, expectedEsmSource);
}
