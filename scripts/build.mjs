// Alternative build without Vite (esbuild only). Produces dist/ with relative paths.
// Usage: npm run build:esbuild
import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const result = await build({
  entryPoints: { app: join(root, 'src/main.tsx') },
  bundle: true,
  splitting: true,
  format: 'esm',
  outdir: join(out, 'js'),
  entryNames: '[name]',
  chunkNames: 'chunk-[hash]',
  minify: true,
  sourcemap: false,
  target: 'es2020',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  metafile: true,
  loader: { '.css': 'css' },
  legalComments: 'none',
});

cpSync(join(root, 'public'), out, { recursive: true });
const html = readFileSync(join(root, 'index.html'), 'utf8')
  .replace('<script type="module" src="/src/main.tsx"></script>', '<script type="module" src="js/app.js"></script>')
  .replace('</head>', '    <link rel="stylesheet" href="js/app.css" />\n  </head>');
writeFileSync(join(out, 'index.html'), html);

const outputs = Object.entries(result.metafile.outputs).map(([f, o]) => `${f.replace(root + '/', '')}  ${(o.bytes / 1024).toFixed(0)} KB`);
console.log(outputs.join('\n'));
