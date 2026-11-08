// Build the HTTP frontend; the shared game requires the /api backend.
import {spawnSync} from 'node:child_process';
import {copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.website.config.ts'],{cwd:root,stdio:'inherit'});
if(result.status!==0)process.exit(result.status??1);
copyFileSync(path.join(root,'website/README.md'),path.join(root,'website-dist/README.md'));
console.log('Frontend built. Use npm run website:preview for the local API, or deploy with vercel.');
