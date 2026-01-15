# Changelog

All notable changes to this project will be documented in this file.

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
