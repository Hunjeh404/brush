// DOM-level integration tests, not a real browser or camera test.
import test from 'node:test';import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';import 'fake-indexeddb/auto';
import {readFile} from 'node:fs/promises';import {setImmediate as yieldTask} from 'node:timers/promises';
import {openDB,writeState,readState,createAuth} from '../db.js';import {defaultState} from '../core.js';
test('complete app flow: floss → pause/resume → completion → decorating → locked settings → explicit early exit',async()=>{
 const {window}=parseHTML(await readFile(new URL('../index.html',import.meta.url),'utf8'));const {document}=window;
 Object.assign(globalThis,{window,document});window.scrollTo=()=>{};Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
 let clock=100,tick;Object.defineProperty(globalThis,'performance',{value:{now:()=>clock},configurable:true});
 const originalInterval=globalThis.setInterval;globalThis.setInterval=fn=>{tick=fn;return 1;};
 const dialog=document.querySelector('#dialog');dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;};
 await openDB();const s=defaultState();s.settings.camera=false;s.settings.voice=false;s.settings.brushSeconds=120;s.auth=(await createAuth('parent123')).auth;await writeState(s,0);
 await import('../app.js');
 async function settle(){for(let i=0;i<16;i++)await yieldTask();}
 async function click(action){const btn=document.querySelector(`[data-action="${action}"]`);assert.ok(btn,`missing action ${action}`);assert.equal(!!btn.disabled,false,`disabled ${action}`);btn.dispatchEvent(new window.Event('click',{bubbles:true}));await settle();}
 async function advance(ms){for(let t=0;t<ms;t+=250){clock+=250;tick();if(t%1000===0)await settle();}await settle();}
 await settle();assert.match(document.querySelector('main').textContent,/오늘의 모험/);
 await click('start:morning');assert.match(document.querySelector('main').textContent,/윗니 오른쪽/);
 for(let i=0;i<6;i++)await click('floss-next');assert.match(document.querySelector('main').textContent,/양치 시작/);
 await click('brush-start');await advance(1000);assert.equal(document.querySelector('#remaining').textContent,'01:59');
 await click('pause');await advance(10000);assert.equal(document.querySelector('#remaining').textContent,'01:59');
 await click('pause');await advance(119000);assert.match(document.querySelector('main').textContent,/차근차근, 끝까지 해냈어요/);assert.equal((await readState()).coins,20);
 await click('garden');await click('edit-start');await click('select:thread');await click('place:right');assert.equal((await readState()).coins,5);assert.equal((await readState()).placements.right,'thread');
 await advance(1000);await click('home');const remaining=(await readState()).decorationMs;assert.ok(remaining<180000);await advance(5000);await click('garden');assert.equal((await readState()).decorationMs,remaining);
 await click('parent');assert.ok(document.querySelector('#login-form'));assert.ok(!document.querySelector('#settings-form'));await click('dialog-cancel');
 await click('home');await click('start:evening');for(let i=0;i<6;i++)await click('floss-next');await click('brush-start');await advance(1000);await click('early');assert.equal((await readState()).attackCount,0);await click('confirm-early');assert.equal((await readState()).attackCount,1);assert.match(document.querySelector('main').textContent,/티탄이 정원/);
 await click('garden');await click('edit-start');await click('repair:left');assert.equal((await readState()).coins,1);assert.equal((await readState()).damage.left,0);
 await advance(180000);assert.equal(document.querySelector('[data-action="edit-start"]').disabled,true);assert.equal((await readState()).decorationMs,0);
 await click('parent');const form=document.querySelector('#login-form');Object.defineProperty(form,'password',{value:{value:'parent123'}});form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 for(let i=0;i<250&&!document.querySelector('#settings-form');i++)await new Promise(r=>setTimeout(r,2));
 assert.ok(document.querySelector('#settings-form'),'valid password opens settings');
 document.hidden=true;document.dispatchEvent(new window.Event('visibilitychange'));await settle();document.hidden=false;document.dispatchEvent(new window.Event('visibilitychange'));await settle();assert.equal(document.querySelector('#settings-form'),null,'backgrounding re-locks settings');
 globalThis.setInterval=originalInterval;
});
