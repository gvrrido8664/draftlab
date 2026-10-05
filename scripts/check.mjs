import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
mkdirSync('.sites-runtime',{recursive:true});
await build({entryPoints:['checks/draft.check.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/draft-check.mjs'});
const result=spawnSync(process.execPath,['.sites-runtime/draft-check.mjs'],{stdio:'inherit'});
process.exitCode=result.status??1;
