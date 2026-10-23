import {validateBackup} from './core.js';

export function cloudPayload(state){
 const {auth,revision,_cloud,...payload}=state;
 // Validate and whitelist fields before any record leaves the device.
 const checked=restoreCloud(payload,null);
 const {auth:ignored,revision:localRevision,...clean}=checked;
 return clean;
}
export function restoreCloud(data,auth){
 const state=validateBackup(data);
 state.auth=auth;
 if(data.active!=null){
  const a=data.active;
  if(typeof a.id!=='string'||a.id.length>80||!/^\d{4}-\d{2}-\d{2}$/.test(a.day)||!['morning','noon','evening'].includes(a.slot)
   ||!['floss','ready','brush','complete'].includes(a.stage)||!['electric','manual'].includes(a.brushType)
   ||!Number.isFinite(a.targetMs)||a.targetMs<120000||a.targetMs>600000
   ||!Number.isFinite(a.elapsedMs)||a.elapsedMs<0||a.elapsedMs>a.targetMs
   ||!Number.isInteger(a.flossIndex)||a.flossIndex<0||a.flossIndex>5
   ||['floss','brush','flossDone'].some(k=>typeof a[k]!=='boolean')
   ||typeof a.createdAt!=='string'||!Number.isFinite(Date.parse(a.createdAt)))throw new Error('진행 중인 양치 기록을 읽지 못했어요.');
  state.active={id:a.id,day:a.day,slot:a.slot,floss:a.floss,brush:a.brush,flossDone:a.flossDone,flossIndex:a.flossIndex,stage:a.stage,elapsedMs:a.elapsedMs,targetMs:a.targetMs,brushType:a.brushType,createdAt:a.createdAt,started:!!a.started};
 }
 return state;
}
export function profileKey(uid,pid){return `profile:${uid}:${pid}`;}
export function hasProgress(s){return !!(s&&(s.history.length||s.active||s.coins||s.owned.length>2||s.worldsOwned.length>1));}
