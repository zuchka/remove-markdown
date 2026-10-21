# Compatibility checks

`npm run test:package` checks the npm tarball, including CommonJS and portable
ESM. Explicit output assertions cover replacement strings in existing options:
literal dollars, missing captures, whole-match substitutions, prefix/suffix
substitutions, and two-digit capture sequences. Some outputs reflect unusual
legacy behavior; these tests preserve that behavior intentionally.

The same command runs growing heading, paragraph, and list documents in fresh
child processes, with default, disabled, and enabled `throwError`. Each process
has a five-second timeout. Assertions check complete output and absence of errors;
these are completion checks rather than machine-specific speed benchmarks.

`npm run test:differential` compares both packed entry points with the pinned
published 0.6.4 implementation. It covers the existing corpus plus every pair of
20 complete block fragments with LF, CRLF, and CR endings, across 30 option sets.
It checks returned text and observable option normalization, accounting explicitly
for the already released `stripMdxImports: false` default added after 0.6.4. This
corpus targets behavior that parsing changes are intended to leave unaffected.

An intentional parsing change needs explicit input/expected-output regression
tests and a documented scope. If an existing comparison conflicts with such a
change, review that exact case; do not simply update the baseline version or
remove broad groups of comparisons to make the suite pass.

Both commands already run in CI and the publishing workflow. Package tests run
across the Node version matrix and on Linux, macOS, and Windows.
