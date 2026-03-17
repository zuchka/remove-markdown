export interface RemoveMarkdownOptions {
  stripListLeaders?: boolean;
  listUnicodeChar?: string;
  gfm?: boolean;
  useImgAltText?: boolean;
  abbr?: boolean;
  replaceLinksWithURL?: boolean;
  separateLinksAndTexts?: string;
  htmlTagsToSkip?: string[];
  /**
   * If true, errors will be thrown instead of caught and logged to the console.
   */
  throwError?: boolean;
}

export type NotUndefined<T> = T extends undefined ? never : T;