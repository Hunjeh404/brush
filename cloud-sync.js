import {readState,writeState,acknowledgeCloud,archiveState} from './db.js';
import {cloudPayload,restoreCloud,profileKey} from './cloud-state.js';
import {cloudError} from './cloud-client.js';
const canonical=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export class CloudSync{
 constructor({uid,profile,api,onState=()=>{},onStatus=()=>{},isIdle=()=>true}){Object.assign(this,{uid,profile,api,onState,onStatus,isIdle});this.key=profileKey(uid,profile.id);this.disposed=false;this.conflict=null;this.pending=null;this.status='기기에 저장됨 · 동기화 대기';}
 dispose(){this.disposed=true;}
 statusChanged(message){this.status=message;if(!this.disposed)this.onStatus(message);}
 flush(){if(this.disposed||this.conflict||!this.isIdle())return Promise.resolve();if(this.pending)return this.pending;this.pending=this.run().finally(()=>{this.pending=null;});return this.pending;}
 async run(){
  if(globalThis.navigator?.onLine===false){this.statusChanged('오프라인 · 기기에 저장됨');return;}
  this.statusChanged('계정에 저장하는 중…');
  try{
   const local=await readState(this.key);if(!local||this.disposed)return;
   const version=local._cloud?.version??0;
   if(local._cloud?.dirty){
    const payload=cloudPayload(local),result=await this.api.save(this.profile.id,version,payload);
    if(this.disposed)return;
    if(result.conflict){
     if(result.payload&&canonical(cloudPayload(restoreCloud(result.payload,null)))===canonical(payload)){
      await acknowledgeCloud(this.key,version,result.version,local.revision,result.updatedAt);
     }else{this.conflict=result;this.statusChanged('다른 기기의 기록과 달라요 · 기록 선택 필요');return;}
    }else await acknowledgeCloud(this.key,version,result.version,local.revision,result.updatedAt);
   }else{
    const remote=await this.api.load(this.profile.id);if(this.disposed)return;
    if(remote.payload&&remote.version!==version){
     if(!this.isIdle()){this.statusChanged('새 계정 기록이 있어요 · 양치 후 가져와요');return;}
     const next=restoreCloud(remote.payload,local.auth);
     next.revision=await writeState(next,local.revision,this.key,{version:remote.version,dirty:false,updatedAt:remote.updatedAt});
     if(!this.disposed)await this.onState(next);
    }
   }
   const latest=await readState(this.key);
   this.statusChanged(latest?._cloud?.dirty?'기기에 저장됨 · 추가 동기화 대기':'계정에 저장 완료');
  }catch(error){if(!this.disposed)this.statusChanged(cloudError(error));}
 }
 async resolve(choice){
  if(!this.conflict||this.disposed)throw Error('다시 동기화한 뒤 기록을 선택해주세요.');
  const remote=this.conflict,local=await readState(this.key);
  await archiveState(this.key,{local,remote});
  const next=choice==='cloud'?restoreCloud(remote.payload,local.auth):local;
  next.revision=await writeState(next,local.revision,this.key,{version:remote.version,dirty:choice!=='cloud',updatedAt:remote.updatedAt});
  this.conflict=null;if(!this.disposed)await this.onState(next);
  return this.flush();
 }
}
