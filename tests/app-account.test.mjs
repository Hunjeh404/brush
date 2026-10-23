import test from 'node:test';import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';import 'fake-indexeddb/auto';
import {readFile} from 'node:fs/promises';import {setImmediate as yieldTask} from 'node:timers/promises';
import {Account} from '../account.js';import {defaultState} from '../core.js';import {cloudPayload,compareProgress} from '../cloud-state.js';import {openDB,readState,writeState} from '../db.js';
test('logged-in app boots and switches profiles into home; longer remote brushing pauses and replaces the live session safely',async t=>{
 const {window}=parseHTML(await readFile(new URL('../index.html',import.meta.url),'utf8'));const {document}=window;const storage=new Map();const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 Object.assign(globalThis,{window,document,localStorage});window.localStorage=localStorage;window.scrollTo=()=>{};Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
 let clock=100,tick;Object.defineProperty(globalThis,'performance',{value:{now:()=>clock},configurable:true});const interval=globalThis.setInterval;globalThis.setInterval=fn=>{tick=fn;return 1;};
 const dialog=document.querySelector('#dialog');dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;};
 await openDB();const initial=defaultState();initial.auth={hash:'device-pin'};initial.settings.camera=false;initial.settings.voice=false;await writeState(initial,0);
 const records=new Map(['p','q'].map(id=>[id,{version:1,payload:cloudPayload(initial)}]));const init=Account.prototype.init;let account;
 Account.prototype.init=async function(){account=this;this.api={rpc:async name=>name==='brush_profiles'?[{id:'p',nickname:'첫째',preferred:true},{id:'q',nickname:'둘째'}]:[],load:async id=>structuredClone(records.get(id)),save:async(id,_v,data)=>{const prev=records.get(id);if(compareProgress(data,prev.payload)<0)return {...structuredClone(prev),conflict:true};const next={version:prev.version+1,payload:structuredClone(data)};records.set(id,next);return {version:next.version};}};await this.handleSession({user:{id:'app-user'}});this.ready=true;this.changed();};
 t.after(()=>{clearTimeout(account?.timer);account?.sync?.dispose();Account.prototype.init=init;globalThis.setInterval=interval;});
 await import('../app.js');async function settle(){for(let i=0;i<30;i++)await yieldTask();}
 async function click(action){const b=document.querySelector(`[data-action="${action}"]`);assert.ok(b,action);b.dispatchEvent(new window.Event('click',{bubbles:true}));await settle();}
 await settle();assert.match(document.querySelector('main').textContent,/오늘의 모험/);assert.doesNotMatch(document.querySelector('main').textContent,/누가 양치하나요/);
 await click('account');await click('account:pick:q');assert.match(document.querySelector('main').textContent,/오늘의 모험/);assert.equal(account.profile.id,'q');
 await click('start:morning');for(let i=0;i<6;i++)await click('floss-next');await click('brush-start');for(let i=0;i<4;i++){clock+=250;tick();await settle();}
 const local=await readState(account.key),remote=cloudPayload(local);remote.active.elapsedMs=20000;remote.modifiedAt=Date.now()+1000;records.set('q',{version:20,payload:remote});
 await account.flush();await settle();assert.match(document.querySelector('main').textContent,/오늘의 모험/);assert.equal((await readState(account.key)).active.elapsedMs,20000);assert.equal((await readState(account.key)).attackCount,0);
 await click('resume');assert.match(document.querySelector('main').textContent,/04:40/);await click('pause');await click('pause');assert.equal(document.querySelector('#dialog').open,false);assert.equal((await readState(account.key)).active.elapsedMs,20000);
 clearTimeout(account.timer);Account.prototype.init=init;globalThis.setInterval=interval;
});
