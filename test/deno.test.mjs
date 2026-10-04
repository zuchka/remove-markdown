import removeMd from '../index.mjs';

Deno.test('the ESM entry works in Deno', () => {
  const actual = removeMd('# Heading\n\n[link](https://example.com)');
  const expected = 'Heading\n\nlink';

  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
});

Deno.test('the ESM entry works as a self-contained URL module', async () => {
  const esmSource = await Deno.readTextFile(new URL('../index.mjs', import.meta.url));
  const requestedPaths = [];
  const server = Deno.serve(
    {
      hostname: '127.0.0.1',
      port: 0,
      onListen() {},
    },
    (request) => {
      const { pathname } = new URL(request.url);
      requestedPaths.push(pathname);

      if (pathname !== '/index.mjs') {
        return new Response('Not found', { status: 404 });
      }

      return new Response(esmSource, {
        headers: { 'content-type': 'text/javascript; charset=utf-8' },
      });
    },
  );

  try {
    const moduleUrl =
      `http://127.0.0.1:${server.addr.port}/index.mjs?test=${crypto.randomUUID()}`;
    const { default: removeMarkdown } = await import(moduleUrl);

    if (removeMarkdown('# URL-loaded **module**') !== 'URL-loaded module') {
      throw new Error('The URL-loaded ESM entry returned unexpected output');
    }
    if (requestedPaths.length !== 1 || requestedPaths[0] !== '/index.mjs') {
      throw new Error(
        `The ESM entry loaded unexpected dependencies: ${JSON.stringify(requestedPaths)}`,
      );
    }
  } finally {
    await server.shutdown();
  }
});
