import { build, version as esbuildVersion } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { htmlOptions, imageAlt } from './adapters.mjs';

const htmlSetup = `import {compile} from 'html-to-text'; const toText=compile({...${JSON.stringify(htmlOptions)},formatters:{imageAlt:${imageAlt.toString()}}});`;
const entries = {
  'remove-markdown': "export {default} from '../index.mjs';",
  'strip-markdown': "import {remark} from 'remark'; import gfm from 'remark-gfm'; import strip from 'strip-markdown'; const processor=remark().use(gfm).use(strip).freeze(); export default input=>String(processor.processSync(input));",
  'markdown-to-txt': "import {markdownToTxt} from 'markdown-to-txt'; export default input=>markdownToTxt(input);",
  'markdown-to-text': "import module from 'markdown-to-text'; const fn=module.default||module; export default input=>fn(input);",
  'marked-html': `import {Marked} from 'marked'; ${htmlSetup} const parser=new Marked({gfm:true,async:false}); export default input=>toText(parser.parse(input));`,
  'markdown-it-html': `import MarkdownIt from 'markdown-it'; ${htmlSetup} const parser=new MarkdownIt({html:true}); export default input=>toText(parser.render(input));`,
};
const results = [];
for (const [adapter, contents] of Object.entries(entries)) {
  try {
    const result = await build({ stdin: { contents, resolveDir: fileURLToPath(new URL('./', import.meta.url)), sourcefile: `${adapter}.mjs` }, bundle: true, minify: true, platform: 'browser', format: 'esm', target: 'es2022', write: false, legalComments: 'none', logLevel: 'silent' });
    const bytes = result.outputFiles[0].contents;
    results.push({ adapter, status: 'ok', minifiedBytes: bytes.length, gzipBytes: gzipSync(bytes, { level: 9 }).length, sha256: createHash('sha256').update(bytes).digest('hex') });
  } catch (error) { results.push({ adapter, status: 'unsupported', error: error.errors?.map((item) => item.text).join('; ') || error.message }); }
}
const report = { generatedAt: new Date().toISOString(), esbuild: esbuildVersion, configuration: { platform: 'browser', format: 'esm', target: 'es2022', gzipLevel: 9, scope: 'Complete standalone conversion pipeline, including adapters and transitive dependencies. No externals or polyfills. Size only; browser execution is not verified for competitors.' }, lockSha256: createHash('sha256').update(await readFile(new URL('./package-lock.json', import.meta.url))).digest('hex'), entries, results };
await mkdir(new URL('./results/', import.meta.url), { recursive: true });
await writeFile(new URL('./results/sizes.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.table(results.map(({ adapter, status, minifiedBytes, gzipBytes }) => ({ adapter, status, minifiedBytes, gzipBytes })));
