import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const assets = join(dist, 'assets');
const fromWslFallback = process.argv.includes('--from-wsl-fallback');

function toWslPath(path) {
  return path.replace(/^([A-Za-z]):\\/, (_, drive) => `/mnt/${drive.toLowerCase()}/`).replaceAll('\\', '/');
}

async function loadEsbuild() {
  try {
    return await import('esbuild');
  } catch (error) {
    if (process.platform === 'win32' && !fromWslFallback && runWslFallback()) {
      process.exit(0);
    }

    throw error;
  }
}

function runWslFallback() {
  const wslRoot = toWslPath(root);
  const result = spawnSync(
    'wsl',
    ['-e', 'bash', '-lc', `cd ${JSON.stringify(wslRoot)} && node scripts/build.mjs --from-wsl-fallback`],
    { stdio: 'inherit' },
  );

  return result.status === 0;
}

const { build } = await loadEsbuild();

await mkdir(assets, { recursive: true });
await cp(join(root, 'public'), dist, { recursive: true }).catch(() => undefined);
await Promise.all([
  unlink(join(assets, 'main.css.map')).catch(() => undefined),
  unlink(join(assets, 'main.js.map')).catch(() => undefined),
]);

try {
  await build({
    entryPoints: [join(root, 'src/main.tsx')],
    bundle: true,
    outfile: join(assets, 'main.js'),
    format: 'esm',
    platform: 'browser',
    target: ['es2022'],
    jsx: 'automatic',
    jsxImportSource: 'react',
    loader: {
      '.ts': 'ts',
      '.tsx': 'tsx',
    },
    minify: true,
    sourcemap: false,
    legalComments: 'none',
    define: {
      'import.meta.env.DEV': 'false',
    },
  });
} catch (error) {
  if (process.platform === 'win32' && !fromWslFallback && runWslFallback()) {
    process.exit(0);
  }

  throw error;
}

const html = await readFile(join(root, 'index.html'), 'utf8');
const builtHtml = html
  .replace('    <script type="module" src="/src/main.tsx"></script>', [
    '    <link rel="stylesheet" href="./assets/main.css" />',
    '    <script type="module" src="./assets/main.js"></script>',
  ].join('\n'))
  .replace('href="/icon.svg"', 'href="./icon.svg"');

await writeFile(join(dist, 'index.html'), builtHtml);
await writeFile(
  join(dist, 'health.json'),
  `${JSON.stringify(
    {
      app: 'comet-rush',
      buildTime: new Date().toISOString(),
      builder: process.platform,
      status: 'ok',
    },
    null,
    2,
  )}\n`,
);
