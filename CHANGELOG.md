# Changelog

All notable changes to this project will be documented in this file.

## [0.7.0] - 2026-08-31

### Added

- Added a native ES module entry point while preserving the existing CommonJS API.
- Added Deno 2.x support through the npm package.
- Added module-specific TypeScript declarations and package-level compatibility tests.

### Changed

- Added conditional package exports for CommonJS, ES modules, and their matching type declarations.

### Fixed

- Made the ES module entry self-contained so it works when loaded directly by browsers and URL-based module loaders without CommonJS interop.

ESM and Deno support was originally proposed in [#116](https://github.com/zuchka/remove-markdown/pull/116) by [@tukkek](https://github.com/tukkek).

## [0.6.3] - 2026-01-14

### Added

- New `separateLinksAndTexts` option to replace inline links with text and URL separated by a custom string ([#101](https://github.com/zuchka/remove-markdown/pull/101) by [@tafel](https://github.com/tafel))
  - Example: `removeMd('[link](http://example.com)', { separateLinksAndTexts: ': ' })` returns `'link: http://example.com'`

## [0.6.2] - 2025-05-02

### Fixed

- Improved handling of links with square brackets inside them ([#93](https://github.com/zuchka/remove-markdown/pull/93))

## [0.6.1] - 2025-05-02

### Improved

- Better support for multiline code blocks ([#96](https://github.com/zuchka/remove-markdown/pull/96) by [@johnjiang](https://github.com/johnjiang))

## [0.6.0] - 2024-12-16

### Added

- `htmlTagsToSkip` option to preserve specific HTML tags while stripping others ([#88](https://github.com/zuchka/remove-markdown/pull/88))

### Fixed

- Horizontal rules regex pattern ([#91](https://github.com/zuchka/remove-markdown/pull/91))
