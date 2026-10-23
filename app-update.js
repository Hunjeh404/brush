// New workers activate only after their complete offline bundle is cached.
// The page reloads after saving, at an idle point, never in the middle of brushing.
export class AppUpdater{
 constructor({sw,window:win,document:doc,isIdle,beforeReload,onStatus=()=>{},onReady=()=>{},reload=()=>win.location.reload()}){Object.assign(this,{sw,win,doc,isIdle,beforeReload,onStatus,onReady,reload});this.pending=false;this.checking=false;this.reloaded=false;this.hadController=!!sw.controller;}
 async start(){
  this.sw.addEventListener('controllerchange',()=>{if(this.hadController)this.offerUpdate();else{this.hadController=true;this.checkReady();}});
  this.registration=await this.sw.register('./sw.js',{scope:'./',updateViaCache:'none'});
  this.registration.addEventListener('updatefound',()=>{const worker=this.registration.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&this.sw.controller)this.onStatus('새 버전 준비 중…');});});
  this.activateWaiting();
  this.sw.ready.then(()=>this.checkReady());
  this.win.addEventListener('online',()=>this.check());
  this.doc.addEventListener('visibilitychange',()=>{if(!this.doc.hidden)this.check();});
  this.interval=setInterval(()=>{this.tryReload();if(!this.doc.hidden&&Date.now()-(this.lastCheck||0)>300000)this.check();},2000);
  await this.check();
 }
 activateWaiting(){this.registration?.waiting?.postMessage({type:'SKIP_WAITING'});}
 async check(){
  if(!this.registration)return;
  this.lastCheck=Date.now();
  try{await this.registration.update();this.activateWaiting();if(!this.pending)this.onStatus('최신 버전 확인 완료');}
  catch{if(!this.pending)this.onStatus('오프라인 · 연결되면 업데이트 확인');}
  this.tryReload();
 }
 checkReady(){const worker=this.sw.controller||this.registration?.active;if(!worker)return;const channel=new MessageChannel();channel.port1.onmessage=e=>{this.onReady(e.data?.ready===true);channel.port1.close();};worker.postMessage({type:'CHECK_READY'},[channel.port2]);}
 offerUpdate(){this.pending=true;this.onStatus('새 버전 준비 완료 · 모험을 마치면 적용해요');return this.tryReload();}
 async tryReload(){
  if(!this.pending||this.checking||this.reloaded||!this.isIdle())return;
  this.checking=true;
  try{const saved=await this.beforeReload();if(saved===false||!this.isIdle())return;this.reloaded=true;this.onStatus('저장 완료 · 새 버전을 여는 중…');this.reload();}
  finally{this.checking=false;}
 }
}
