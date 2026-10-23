import {readState,writeState,acknowledgeCloud} from './db.js';
import {cloudPayload,restoreCloud,profileKey,canonical,compareProgress} from './cloud-state.js';
import {cloudError} from './cloud-client.js';
export class CloudSync{
 constructor({uid,profile,api,onState=()=>{},onStatus=()=>{},onSynced=()=>{},onDeleted=()=>{},isIdle=()=>true,commitRemote}){
  Object.assign(this,{uid,profile,api,onState,onStatus,onSynced,onDeleted,isIdle,commitRemote});this.key=profileKey(uid,profile.id);this.disposed=false;this.pending=null;this.status='계정과 자동 동기화 중…';
 }
 dispose(){this.disposed=true;}
 statusChanged(message){this.status=message;if(!this.disposed)this.onStatus(message);}
 flush(){if(this.disposed||!this.isIdle())return Promise.resolve();if(this.pending)return this.pending;this.pending=this.run().finally(()=>{this.pending=null;});return this.pending;}
 async replace(local,remote){
  if(this.disposed||!this.isIdle())return false;
  const next=restoreCloud(remote.payload,local.auth),meta={version:remote.version,dirty:false,updatedAt:remote.updatedAt};
  if(this.commitRemote)return this.commitRemote(next,local.revision,meta,()=>!this.disposed);
  next.revision=await writeState(next,local.revision,this.key,meta);
  if(!this.disposed)await this.onState(next);return true;
 }
 async run(){
  if(globalThis.navigator?.onLine===false){this.statusChanged('오프라인 · 연결되면 자동 동기화');return;}
  this.statusChanged('계정과 자동 동기화 중…');
  try{
   // Bound retries: active devices may keep changing; the next interval converges.
   for(let attempt=0;attempt<3&&!this.disposed;attempt++){
    const local=await readState(this.key);if(!local)return;
    const version=local._cloud?.version??0,payload=cloudPayload(local);
    const result=local._cloud?.dirty?await this.api.save(this.profile.id,version,payload):await this.api.load(this.profile.id);
    if(this.disposed)return;
    if(local._cloud?.dirty&&!result.conflict){
     await acknowledgeCloud(this.key,version,result.version,local.revision,result.updatedAt);
    }else if(result.payload&&(result.version!==version||result.conflict)){
     const remote=restoreCloud(result.payload,null),latest=await readState(this.key);
     if(latest?.revision!==local.revision)continue;
     if(canonical(cloudPayload(remote))===canonical(payload)){
      await acknowledgeCloud(this.key,version,result.version,local.revision,result.updatedAt);
     }else if(local._cloud?.dirty&&compareProgress(local,remote)>0){
      // A new server supports the same ranking; this also handles a legacy CAS conflict.
      await acknowledgeCloud(this.key,version,result.version,-1,result.updatedAt);
      continue;
     }else if(!await this.replace(local,result))return;
    }
    const latest=await readState(this.key);if(this.disposed)return;
    if(latest?._cloud?.dirty)continue;
    this.statusChanged('계정과 동기화됨');await this.onSynced();return;
   }
   this.statusChanged('최신 진행 기록을 자동으로 맞추고 있어요…');
  }catch(error){if(this.disposed)return;if(error?.message==='profile_deleted'){this.statusChanged('삭제된 프로필입니다.');await this.onDeleted();}else this.statusChanged(cloudError(error));}
 }
}
