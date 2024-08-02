declare module "remove-markdown" {
  export function removeMd(md: string, options?: {
    stripListLeaders?: boolean;
    listUnicodeChar?: string;
    gfm?: boolean;
    useImgAltText: boolean;
    abbr?: boolean;
    replaceLinksWithURL?: boolean;
    htmlTagsToSkip?: string[];
  }): string;

  export = removeMd;
}