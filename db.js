import {canonical,cloudPayload} from './cloud-state.js';
const DB='olympus-brush-v1';let db;
export function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore('state');req.onsuccess=()=>{db=req.result;resolve(db);};req.onerror=()=>reject(req.error);});}
export function readState(key='main'){return new Promise((resolve,reject)=>{const r=db.transaction('state').objectStore('state').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export function writeState(state,expectedRevision,key='main',cloudMeta){return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite'),store=tx.objectStore('state');let conflict=false;const get=store.get(key);get.onsuccess=()=>{if((get.result?.revision??0)!==expectedRevision){conflict=true;tx.abort();return;}const next={...state,revision:expectedRevision+1};let changed=true;
 if(!cloudMeta){const content=value=>{if(!value?.schema)return {};const {modifiedAt,...rest}=cloudPayload(value);return rest;};changed=canonical(content(state))!==canonical(content(get.result));next.modifiedAt=changed?Math.max(Date.now(),(get.result?.modifiedAt||0)+1):(get.result?.modifiedAt||state.modifiedAt||0);}
if(cloudMeta)next._cloud=cloudMeta;else if(key.startsWith('profile:'))next._cloud={...(get.result?._cloud||{version:0}),dirty:changed||!!get.result?._cloud?.dirty};store.put(next,key);};tx.oncomplete=()=>resolve(expectedRevision+1);tx.onabort=()=>reject(new Error(conflict?'다른 창에서 기록이 변경됐습니다. 이 창을 새로고침해주세요.':'단말에 저장하지 못했습니다. 저장 공간을 확인해주세요.'));tx.onerror=()=>{};});}
const toHex=bytes=>[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
async function hash(secret,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),'PBKDF2',false,['deriveBits']);return toHex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:150000,hash:'SHA-256'},key,256)));}
export async function createAuth(password){const salt=toHex(crypto.getRandomValues(new Uint8Array(16)));const recovery=toHex(crypto.getRandomValues(new Uint8Array(8))).toUpperCase();return {auth:{salt,hash:await hash(password,salt),recoveryHash:await hash(recovery,salt),failures:0,lockedUntil:0},recovery};}
export async function verifyPassword(auth,password,recovery=false){return (await hash(recovery?password.replace(/[^a-fA-F0-9]/g,'').toUpperCase():password,auth.salt))===(recovery?auth.recoveryHash:auth.hash);}

// Acknowledgements update only sync metadata; edits made while uploading remain dirty.
export function acknowledgeCloud(key,baseVersion,newVersion,sentRevision,updatedAt){return new Promise((resolve,reject)=>{
 const tx=db.transaction('state','readwrite'),store=tx.objectStore('state');let next;
 const req=store.get(key);req.onsuccess=()=>{const current=req.result;if(!current||(current._cloud?.version??0)!==baseVersion)return;next={...current,_cloud:{version:newVersion,dirty:current.revision!==sentRevision,updatedAt}};store.put(next,key);};
 tx.oncomplete=()=>resolve(next);tx.onabort=()=>reject(tx.error||new Error('동기화 상태 저장 실패'));tx.onerror=()=>{};
});}
export function archiveState(key,record){return new Promise((resolve,reject)=>{
 const tx=db.transaction('state','readwrite');tx.objectStore('state').put(record,`backup:${key}:${Date.now()}:${crypto.randomUUID()}`);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);tx.onerror=()=>{};
});}

// Remove only the exact guest revision that was successfully considered by the server.
// Keep the device's parent PIN, but no guest progress to re-import on another login.
export function clearImportedGuest(expectedRevision,profile){return new Promise((resolve,reject)=>{
 const tx=db.transaction('state','readwrite'),store=tx.objectStore('state');let cleared=false;
 const req=store.get('main');req.onsuccess=()=>{if((req.result?.revision??0)!==expectedRevision)return;store.put({auth:req.result?.auth||null,profile},'device');store.delete('main');cleared=true;};
 tx.oncomplete=()=>resolve(cleared);tx.onabort=()=>reject(tx.error);tx.onerror=()=>{};
});}
export function removeProfileCache(pid){return new Promise((resolve,reject)=>{
 const tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),r=store.openCursor();
 r.onsuccess=()=>{const c=r.result;if(!c)return;if(String(c.key).startsWith('profile:')&&String(c.key).endsWith(':'+pid))c.delete();c.continue();};
 tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);tx.onerror=()=>{};
});}
