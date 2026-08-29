// Regenerates the runtime bridge for the (peer, not installed) dsh-tools
// package so the adapter-mapping test can load src/index.js on a clean clone.
// The bridge re-exports the committed tests/dsh-tools-stub.ts; tsx maps the
// .js specifier to the .ts source. Run before tests via the package 'pretest'.
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'node_modules', '@deepseek-ai', 'dsh-tools')
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'package.json'), JSON.stringify({
  name: '@deepseek-ai/dsh-tools',
  version: '0.0.0-stub',
  type: 'module',
  main: 'index.js',
  exports: { '.': './index.js' },
}, null, 2) + '\n')
writeFileSync(join(dir, 'index.js'), "export { defineTool } from '../../../tests/dsh-tools-stub.js'\n")
