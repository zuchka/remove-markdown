declare function removeMd(md: string, options?: {
  stripListLeaders?: boolean;
  listUnicodeChar?: string;
  gfm?: boolean;
  useImgAltText: boolean;
  abbr?: boolean;
  replaceLinksWithURL?: boolean;
  separateLinksAndTexts?: string;
  htmlTagsToSkip?: string[];
}): string;

export = removeMd;
