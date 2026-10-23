import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile,stat} from 'node:fs/promises';
// Exercise the actual generated service worker against a file-backed cache.
test('all offline resources exist, service worker serves app/model/WASM without a network',async()=>{
 const code=await readFile(new URL('../sw.js',import.meta.url),'utf8');
 const list=JSON.parse(code.match(/const FILES = (\[[^;]+);/)[1]);assert.ok(list.some(x=>x.endsWith('.task')));assert.ok(list.some(x=>x.endsWith('.wasm')));
 const base='https://example.test/olympus-brush/';const cached=new Map();const handlers={};let networkCalls=0;
 const normalize=r=>new URL(typeof r==='string'?r:r.url,base).href.split('?')[0];
 const cache={addAll:async paths=>{for(const file of paths){const url=typeof file==='string'?file:file.url;const rel=url==='./'?'index.html':new URL(url,base).pathname.slice(new URL(base).pathname.length)||'index.html';const path=new URL('../'+rel,import.meta.url);assert.ok((await stat(path)).size>0||rel==='.nojekyll');cached.set(normalize(file),await readFile(path));}},match:async request=>cached.get(normalize(request))};
 const ctx={URL,Request,Promise,caches:{open:async()=>cache,keys:async()=>[],delete:async()=>true},fetch:()=>{networkCalls++;throw new Error('OFFLINE');},self:{location:{origin:'https://example.test'},registration:{scope:base},skipWaiting:async()=>{},clients:{claim:async()=>{}},addEventListener:(name,fn)=>handlers[name]=fn}};
 vm.runInNewContext(code,ctx);let pending;handlers.install({waitUntil:p=>pending=p});await pending;
 for(const path of ['app.js','styles.css','models/face_landmarker.task','vendor/wasm/vision_wasm_internal.wasm','assets/athena.webp']){handlers.fetch({request:{method:'GET',url:base+path,mode:'cors'},respondWith:p=>pending=p});assert.ok((await pending).length>0);}
 handlers.fetch({request:{method:'GET',url:base+'unknown-route',mode:'navigate'},respondWith:p=>pending=p});assert.match((await pending).toString(),/올림포스 양치 모험/);
 let status;handlers.message({data:{type:'CHECK_READY'},ports:[{postMessage:x=>status=x}],waitUntil:p=>pending=p});await pending;assert.equal(status.ready,true);assert.equal(networkCalls,0);
});

test('an incomplete offline download never replaces the working service worker',async()=>{
 const code=await readFile(new URL('../sw.js',import.meta.url),'utf8');let install,activated=0;
 const ctx={URL,Request,Promise,caches:{open:async()=>({addAll:async files=>{assert.equal(files[0].cache,'reload');throw Error('download interrupted');}})},self:{registration:{scope:'https://example.test/brush/'},addEventListener:(name,fn)=>{if(name==='install')install=fn;},skipWaiting:async()=>{activated++;}}};
 vm.runInNewContext(code,ctx);let pending;install({waitUntil:p=>pending=p});await assert.rejects(pending,/download interrupted/);assert.equal(activated,0);
});
