import {cp,mkdir,rm,readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const files=['app-update.js','version.js','index.html','styles.css','app.js','catalog.js','sprite-ratios.js','core.js','db.js','camera.js','manifest.webmanifest','cloud-config.js','cloud-client.js','cloud-state.js','cloud-sync.js','account.js','privacy.html'];
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const f of [...files,'assets','vendor','models'])await cp(f,join('dist',f),{recursive:true});
await writeFile('dist/.nojekyll','');
async function walk(dir){let all=[];for(const d of await readdir(dir,{withFileTypes:true})){const p=join(dir,d.name);if(d.isDirectory())all.push(...await walk(p));else all.push(p);}return all;}
const paths=(await walk('dist')).sort();
const hash=createHash('sha256');for(const p of paths){hash.update(p);hash.update(await readFile(p));}
let sw=await readFile('sw.js','utf8');hash.update(sw.replace(/const CACHE = [^;]+;/,'const CACHE = VERSION;').replace(/const FILES = \[[^;]+;/,'const FILES = RESOURCES;'));const version=hash.digest('hex').slice(0,12);sw=sw.replace(/const CACHE = [^;]+;/,`const CACHE = 'olympus-brush-${version}';`).replace(/const FILES = \[[^;]+;/,`const FILES = ${JSON.stringify(['./',...paths.map(p=>'./'+p.slice(5))])};`);await writeFile('dist/sw.js',sw);await writeFile('sw.js',sw);
let total=0;for(const p of paths)total+=(await stat(p)).size;console.log(`Built ${paths.length+1} files, ${(total/1024/1024).toFixed(1)} MiB. All model/runtime/art files are local. Cache ${version}.`);
