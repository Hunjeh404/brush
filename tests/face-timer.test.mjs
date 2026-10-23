// DOM integration: actual timer and face-presence gate, with synthetic camera frames.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import 'fake-indexeddb/auto';
import {readFile} from 'node:fs/promises';
import {setImmediate as yieldTask} from 'node:timers/promises';
import {openDB,writeState,readState,createAuth} from '../db.js';
import {defaultState} from '../core.js';
import {CameraGuide} from '../camera.js';

test('face loss blocks elapsed time and completion; reacquisition resumes without catching up or overriding manual pause',async t=>{
 const {window}=parseHTML(await readFile(new URL('../index.html',import.meta.url),'utf8'));
 const {document}=window;Object.assign(globalThis,{window,document});window.scrollTo=()=>{};
 Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
 let clock=100,tick,camera;
 Object.defineProperty(globalThis,'performance',{value:{now:()=>clock},configurable:true});
 const interval=globalThis.setInterval,start=CameraGuide.prototype.start,stop=CameraGuide.prototype.stop;
 globalThis.setInterval=fn=>{tick=fn;return 1;};
 CameraGuide.prototype.start=function(){camera=this;this.stream={getVideoTracks:()=>[{readyState:'live',muted:false}]};Object.assign(this.video,{readyState:2,paused:false,ended:false});this.setFace(false);};
 CameraGuide.prototype.stop=function(){this.stopped=true;this.setFace(false);};
 t.after(()=>{globalThis.setInterval=interval;CameraGuide.prototype.start=start;CameraGuide.prototype.stop=stop;});
 const dialog=document.querySelector('#dialog');dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;};
 await openDB();const s=defaultState();s.settings.camera=true;s.settings.voice=false;s.settings.flossCount=0;s.settings.brushSeconds=120;s.auth=(await createAuth('parent123')).auth;await writeState(s,0);
 await import('../app.js');
 async function settle(){for(let i=0;i<16;i++)await yieldTask();}
 async function click(action){const b=document.querySelector(`[data-action="${action}"]`);assert.ok(b,action);b.dispatchEvent(new window.Event('click',{bubbles:true}));await settle();}
 async function advance(ms,visible=false){for(let n=0;n<ms;n+=250){clock+=250;if(visible)camera.setFace(true);tick();if(n%1000===0)await settle();}await settle();}
 const remaining=()=>document.querySelector('#remaining').textContent;
 await settle();await click('start:morning');await click('brush-start');
 await advance(5000);assert.equal(remaining(),'02:00','loading/denied camera cannot run timer');
 camera.setFace(true);await advance(2000,true);assert.equal(remaining(),'01:58');
 camera.setFace(false);await advance(10000);assert.equal(remaining(),'01:58','absent face pauses');assert.match(document.querySelector('#pause-note').textContent,/멈춰/);
 camera.setFace(true);await advance(1000,true);assert.equal(remaining(),'01:57','no catch-up after ten seconds away');
 await click('pause');camera.setFace(true);await advance(5000,true);assert.equal(remaining(),'01:57','face does not override manual pause');
 await click('pause');await advance(3000);assert.equal(remaining(),'01:57','new camera must confirm face after resume');
 camera.setFace(true);await advance(116000,true);assert.equal(remaining(),'00:01');
 camera.setFace(false);await advance(5000);assert.equal((await readState()).coins,0,'no reward while absent at finish');assert.equal(remaining(),'00:01');
 camera.setFace(true);await advance(1000,true);assert.equal((await readState()).coins,10);assert.match(document.querySelector('main').textContent,/끝까지 해냈어요/);
});
