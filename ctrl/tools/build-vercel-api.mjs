// Bundle TypeScript into native ESM entries before Vercel's function tracing.
// Local Node tests can keep explicit .ts imports; hosted handlers have no
// unresolved extensionless/TypeScript imports at runtime.
import {build} from 'esbuild';
await build({entryPoints:{keyboard:'server/vercel-keyboard.ts',testnet:'server/vercel-testnet.ts',demo:'server/vercel-demo.ts'},outdir:'api',outExtension:{'.js':'.mjs'},bundle:true,format:'esm',platform:'node',target:'node24',banner:{js:"import {createRequire as __ctrlRequire} from 'node:module'; const require=__ctrlRequire(import.meta.url);"},sourcemap:false,logLevel:'warning'});
console.log('Bundled Vercel API entries. No secrets are inlined.');
