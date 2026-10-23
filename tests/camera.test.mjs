import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraGuide} from '../camera.js';

function fixture(t){
 let now=0,frame,result={faceLandmarks:[[{x:.5,y:.5}]]},error=false,calls=0;
 const oldPerformance=globalThis.performance,oldRAF=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;
 Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});
 globalThis.requestAnimationFrame=fn=>{frame=fn;return 1;};globalThis.cancelAnimationFrame=()=>{};
 t.after(()=>{Object.defineProperty(globalThis,'performance',{value:oldPerformance,configurable:true});globalThis.requestAnimationFrame=oldRAF;globalThis.cancelAnimationFrame=oldCancel;});
 const track={readyState:'live',muted:false,stop(){this.readyState='ended';}};
 const video={readyState:2,paused:false,ended:false,currentTime:0,pause(){this.paused=true;}};
 const changes=[],status={};const guide=new CameraGuide(video,{},status,x=>changes.push(x));
 guide.stream={getVideoTracks:()=>[track],getTracks:()=>[track]};guide.engine={detectForVideo(){calls++;if(error)throw Error('detector');return result;}};guide.draw=()=>{};guide.loop();
 return {guide,video,track,changes,status,get calls(){return calls;},step(time,{fresh=true,face=true,fail=false}={}){now=time;if(fresh)video.currentTime+=.2;result={faceLandmarks:face?[[{x:.5,y:.5}]]:[]};error=fail;frame(now);}};
}

test('real detection loop reports face loss, recovery, errors, and stop',t=>{
 const f=fixture(t);assert.equal(f.guide.hasFace(),false);
 f.step(200);assert.equal(f.guide.hasFace(),true);
 f.step(400,{face:false});assert.equal(f.guide.hasFace(),false);
 f.step(600);assert.equal(f.guide.hasFace(),true);
 f.step(800,{fail:true});assert.equal(f.guide.hasFace(),false);assert.match(f.status.textContent,/시간/);
 f.step(1000);assert.equal(f.guide.hasFace(),true);
 f.guide.stop();assert.equal(f.guide.hasFace(),false);assert.deepEqual(f.changes,[true,false,true,false,true,false]);
});
test('frozen frames expire and are not repeatedly counted as fresh detections',t=>{
 const f=fixture(t);f.step(200);f.step(500,{fresh:false});assert.equal(f.calls,1);
 f.step(900,{fresh:false});assert.equal(f.guide.hasFace(),false);assert.equal(f.calls,1);
 f.step(1100);assert.equal(f.guide.hasFace(),true);
 f.track.muted=true;assert.equal(f.guide.hasFace(),false);f.track.muted=false;
 f.video.paused=true;assert.equal(f.guide.hasFace(),false);f.video.paused=false;
 f.track.readyState='ended';assert.equal(f.guide.hasFace(),false);
});
test('camera permission failure leaves face gate closed with an actionable message',async t=>{
 const old=globalThis.navigator;
 Object.defineProperty(globalThis,'navigator',{value:{mediaDevices:{getUserMedia:async()=>{throw Object.assign(Error('denied'),{name:'NotAllowedError'});}}},configurable:true});
 t.after(()=>Object.defineProperty(globalThis,'navigator',{value:old,configurable:true}));
 const status={};const guide=new CameraGuide({}, {},status);await guide.start();assert.equal(guide.hasFace(),false);assert.match(status.textContent,/권한.*멈춰/);
});
