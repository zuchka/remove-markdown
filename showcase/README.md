# Fresh remove-markdown showcase

A dependency-free static website and light-DOM `<remove-markdown-demo>` component built from scratch. It uses Ding's palette from `design/tokens.css` (warm surfaces, green actions, violet changes), with System / Light / Dark preference. System is the default, OS changes are observed live, and explicit choices persist locally. No code from remove-markdown-ui is used.

```sh
npm run dev:site
```

`scripts/build-site.mjs` copies this directory, the shared corpus, and the local package's self-contained ESM entry into `dist/site/`. It fills the displayed version from `package.json`. `npm run build:site` refreshes an already-running static preview after edits. The generated directory can be served by any static host.

The demo uses a browser worker, a 200,000-character editor limit, and a 2.5-second conversion deadline. Text is rendered with DOM text nodes, including preserved HTML tags. There is no HTML preview, remote conversion API, analytics, or input upload. The only stored preference is the color theme.

Examples intentionally change relevant settings so the initial comparison shows a useful difference. Reset restores the library defaults without replacing the user's text. The two output panels compare default and selected settings; bounded token diffs highlight changes. Mobile exposes one panel at a time with explicit buttons.

All ten current options are represented. The option inventory and generated snippet are checked against the package API. GFM copy describes actual limited transformations. HTML tag entry accepts names rather than regex syntax. Error handling is advanced because `throwError` does not change successful output. The UI catches failures and disables stale copy actions.

The benchmark page reads static JSON produced by `bench/`; it never runs timing workloads in a visitor's browser. Its first results are explicitly exploratory. See `bench/README.md` for methodology and publication review requirements.
