import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
function check(file){const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(r.status)process.exit(r.status);}
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.name.endsWith('.js'))check(file);}}
for(const file of fs.readdirSync('.'))if(file.endsWith('.js'))check(file);
for(const dir of ['lib','public','scripts','test'])walk(dir);
console.log('JavaScript syntax checks passed, including nested modules.');
