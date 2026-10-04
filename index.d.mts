/**
 * Strips Markdown formatting from a string, returning plain text.
 *
 * On error, the original `md` input is returned unchanged and the error is
 * logged via `console.error`, unless `options.throwError` is set.
 *
 * @param md - The Markdown-formatted string to strip.
 * @param options - Options controlling which formatting is stripped and how.
 * @returns The plain-text result with Markdown syntax removed.
 */
declare function removeMd(md: string, options?: {
  /**
   * Strip list leaders (`*`, `-`, `+`, or `1.`) from the start of list items.
   * Set to `false` to keep the leaders in the output.
   * @default true
   */
  stripListLeaders?: boolean;

  /**
   * Strip imports in MDX files (e.g.: `import x from "pkg"`).
   * Set to `true` to enable.
   * @default false
   */
  stripMdxImports?: boolean;

  /**
   * Character to insert in place of a stripped list leader (e.g. `'•'`).
   * Only takes effect when `stripListLeaders` is `true`.
   * @default ''
   */
  listUnicodeChar?: string;

  /**
   * Strip GitHub-Flavored Markdown extensions: fenced code blocks,
   * strikethrough (`~~text~~`), and setext-style (`===`) headers.
   * @default true
   */
  gfm?: boolean;

  /**
   * When removing an image (`![alt](url)`), keep its alt text in the
   * output instead of deleting the image entirely.
   * @default true
   */
  useImgAltText?: boolean;

  /**
   * Remove Markdown abbreviation definitions
   * (lines like `*[HTML]: HyperText Markup Language`).
   * @default false
   */
  abbr?: boolean;

  /**
   * Replace inline link text with its URL.
   * Ignored for inline links when `separateLinksAndTexts` is non-empty.
   * @default false
   */
  replaceLinksWithURL?: boolean;

  /**
   * For inline links (`[text](url)`), keep both text and URL, joined by this separator
   * (e.g. `': '` turns `[text](url)` into `text: url`).
   * A non-empty separator takes precedence over `replaceLinksWithURL`.
   * An empty string disables this option.
   * @default null
   */
  separateLinksAndTexts?: string;

  /**
   * HTML tag names to leave untouched instead of stripping
   * (e.g. `['a', 'b']`).
   * @default []
   */
  htmlTagsToSkip?: string[];

  /**
   * Throw errors encountered while processing instead of catching them,
   * logging via `console.error`, and returning the original input.
   * @default false
   */
  throwError?: boolean;
}): string;

export default removeMd;
