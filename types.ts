export interface RemoveMarkdownOptions {
    /**
     * strip list leaders
     * @default true
     */
    stripListLeaders?: boolean;
    /**
     * character to use for list items
     * @default ''
     */
    listUnicodeChar?: string;
    /**
     * support GitHub-Flavored Markdown
     * @default true
     */
    gfm?: boolean;
    /**
     * replace images with alt-text, if present
     * @default true
     */
    useImgAltText?: boolean;
    /**
     * remove abbreviations, if present
     * @default false
     */
    abbr?: boolean;
    /**
     * remove inline links, if present
     * @default false
     */
    replaceLinksWithURL?: boolean;
    /**
     * replace inline links with text, separator and link, if present
     */
    separateLinksAndTexts?: string;
    /**
     * HTML tags to skip, if present
     * @default []
     */
    htmlTagsToSkip?: string[];
    /**
     * If true, errors will be thrown instead of caught and logged to the console.
     * @default false
     */
    throwError?: boolean;
}

export type NotUndefined<T> = T extends undefined ? never : T;
