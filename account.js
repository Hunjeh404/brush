import {getCloudClient,apiFor,cloudError} from './cloud-client.js';
import {CloudSync} from './cloud-sync.js';
import {AUTH_REDIRECT_URL} from './cloud-config.js';
import {defaultState,migrateState} from './core.js';
import {profileKey,cloudPayload,restoreCloud,hasProgress,compareProgress} from './cloud-state.js';
import {readState,writeState,clearImportedGuest,removeProfileCache} from './db.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,cls='primary')=>`<button class="${cls}" data-action="account:${action}">${label}</button>`;
const saved=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(`brush:${key}`))??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(`brush:${key}`,JSON.stringify(value));}catch{}};
export class Account{
 constructor(callbacks){Object.assign(this,callbacks);this.ready=typeof window.localStorage==='undefined';this.session=null;this.profiles=[];this.trash=[];this.profile=null;this.sync=null;this.key='main';this.message='';this.epoch=0;this.uid=undefined;this.loading=false;this.deleteTarget=null;}
 async init(){
  if(this.ready)return;
  const callbackUrl=new URL(location.href);const returned=callbackUrl.searchParams.has('code')||callbackUrl.searchParams.has('error')||callbackUrl.hash.includes('error=');
  try{
   this.client=await getCloudClient();this.api=apiFor(this.client);
   const cached=saved('last-user',null);
   const {data,error}=globalThis.navigator?.onLine===false?{data:{session:cached?{user:cached,offline:true}:null},error:null}:await this.client.auth.getSession();
   if(error)this.message='로그인을 확인하지 못했어요. 기기 기록으로 계속할 수 있어요.';
   await this.handleSession(data.session);
   if(returned&&!data.session){this.message='구글 로그인을 완료하지 못했어요. 로그인 버튼을 눌러 처음부터 다시 시도해주세요. 계속 실패하면 Chrome에서 앱 주소를 직접 열어주세요.';this.openAccount();}
   if(returned){for(const key of ['error','error_code','error_description','code'])callbackUrl.searchParams.delete(key);if(callbackUrl.hash.includes('error='))callbackUrl.hash='';history.replaceState(null,'',callbackUrl.href);}
   this.client.auth.onAuthStateChange((_event,session)=>{if(!session&&globalThis.navigator?.onLine===false)return;setTimeout(()=>this.handleSession(session).catch(()=>{this.message='로그인을 다시 확인해주세요.';this.changed();}),0);});
   window.addEventListener('online',()=>{this.client.auth.getSession().then(async({data,error})=>{if(!error){await this.handleSession(data.session);await this.refreshProfiles();this.schedule();}}).catch(()=>{});});
   window.addEventListener('focus',()=>this.schedule());
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.schedule();});
   this.interval=setInterval(()=>this.flush(),5000);
  }catch{this.message='계정에 연결하지 못했어요. 기기 기록으로 계속할 수 있어요.';}
  finally{this.ready=true;this.changed();}
 }
 async handleSession(session){
  const uid=session?.user.id??null;this.session=session;
  if(session&&!session.offline)save('last-user',{id:uid,email:session.user.email});
  else if(!session)save('last-user',null);
  if(uid===this.uid)return;
  const epoch=++this.epoch;this.uid=uid;this.loading=true;this.sync?.dispose();this.sync=null;this.profile=null;this.changed();
  try{
  await this.pauseAndSave();
  const guest=await readState();if(epoch!==this.epoch)return;
  this.key='main';const fallback=migrateState(guest||defaultState());fallback.auth??=(await readState('device'))?.auth??null;await this.applyState(fallback,this.key);
  this.profiles=[];
  if(uid){
   await this.refreshProfiles();if(epoch!==this.epoch)return;
   const selected=this.profiles.find(p=>p.id===saved(`selected:${uid}`,null))||this.profiles.find(p=>p.preferred)||this.profiles[0];
   if(selected)try{await this.select(selected.id);}catch(error){this.message=cloudError(error);}
   if(!this.profile)this.openAccount();
  }
  }finally{if(epoch===this.epoch){this.loading=false;if(this.profile)this.openHome?.();this.changed();}}
 }
 async refreshProfiles(){
  const uid=this.uid,epoch=this.epoch;if(!uid)return;
  if(globalThis.navigator?.onLine===false){this.profiles=saved(`profiles:${uid}`,[]);this.changed();return;}
  try{
   const profiles=await this.api.rpc('brush_profiles');this.trash=await this.api.rpc('brush_trash');if(epoch!==this.epoch)return;
   this.profiles=profiles;save(`profiles:${uid}`,profiles);
   if(this.profile&&!profiles.some(p=>p.id===this.profile.id)){
    const removed=this.profile.id;await this.pauseAndSave();this.sync?.dispose();this.sync=null;this.profile=null;this.key='main';const fallback=migrateState(await readState()||defaultState());fallback.auth??=(await readState('device'))?.auth??null;await this.applyState(fallback,this.key);await removeProfileCache(removed);this.openAccount();
   }
  }catch(error){if(epoch!==this.epoch)return;this.profiles=saved(`profiles:${uid}`,[]);this.message=cloudError(error);}
  this.changed();
 }
 async select(id){
  const profile=this.profiles.find(p=>p.id===id);if(!profile)throw Error('프로필을 다시 선택해주세요.');
  const uid=this.uid,epoch=this.epoch,key=profileKey(uid,id);
  const wasLoading=this.loading;this.loading=true;this.changed();
  try{
  await this.pauseAndSave();
  let local=await readState(key);
  if(!local){
   // First use on a device must check the server before creating an empty save.
   const remote=await this.api.load(id);if(epoch!==this.epoch)return;
   const guest=await readState()||await readState('device');
   local=remote.payload?restoreCloud(remote.payload,guest?.auth??null):defaultState();local.auth??=guest?.auth??null;
   local.revision=await writeState(local,0,key,{version:remote.version,dirty:false,updatedAt:remote.updatedAt});
  }
  if(epoch!==this.epoch)return;
  this.sync?.dispose();this.profile=profile;this.key=key;save(`selected:${uid}`,id);this.message='';
  this.sync=new CloudSync({uid,profile,api:this.api,isIdle:()=>this.isIdle()&&!this.loading,
   commitRemote:this.commitRemote?((next,rev,meta,guard)=>this.commitRemote(next,rev,key,meta,guard)):undefined,
   onSynced:()=>this.clearGuest(),onDeleted:()=>this.refreshProfiles(),
   onState:async next=>{if(this.key===key&&epoch===this.epoch)await this.applyState(next,key);},onStatus:()=>this.changed(true)});
  await this.applyState(migrateState(local),key);
  await this.importGuest();
  this.schedule();
  }finally{if(epoch===this.epoch){this.loading=wasLoading;if(!this.loading)this.openHome?.();this.changed();}}
 }
 schedule(){if(this.timer)return;this.timer=setTimeout(()=>{this.timer=null;this.flush();},800);}
 async importGuest(){
  const guest=await readState();if(!hasProgress(guest)){this.guestRevision=null;return;}
  this.guestRevision=guest.revision;const local=await readState(this.key);
  if(compareProgress(guest,local)>0){const next=restoreCloud(cloudPayload(guest),local.auth);next.revision=await writeState(next,local.revision,this.key);await this.applyState(next,this.key);}
 }
 async clearGuest(){if(this.guestRevision==null)return;await clearImportedGuest(this.guestRevision,this.profile.id);this.guestRevision=null;}
 async flush(){if(this.sync&&this.ready&&!this.loading&&this.isIdle()){await this.waitForSave();await this.sync.flush();}}
 status(){return this.profile?`${this.profile.nickname} · ${this.sync?.status||'기기에 저장됨'}`:'이 기기에 저장';}
 entry(){return `<section class="paper account-card"><span class="section-kicker">가족 계정</span><h2>어디서든 이어서 양치해요</h2><p>스도쿠와 같은 구글 계정과 가족 프로필을 사용해요.<br>양치 기록과 모은 보물은 별도로 저장돼요.</p>${button('구글 계정으로 시작하기','login','primary google-login')}<p class="small">보호자 계정으로 로그인해 아이 프로필을 선택해주세요. 아이 이메일은 필요하지 않아요.</p><p class="small"><a href="privacy.html">개인정보처리방침</a></p></section>`;}
 view(){
  if(this.loading)return '<section class="paper"><h2>계정 기록을 확인하고 있어요…</h2><p>기기에 저장된 기록은 그대로 보관돼요.</p></section>';
  const notice=this.message?`<p class="notice" role="status">${esc(this.message)}</p>`:'';
  if(!this.session)return `${this.entry()}${notice}<p class="small center">로그인 없이도 이 기기에서 양치할 수 있어요.</p>`;
  const me=this.profiles.find(p=>p.mine),current=this.profile;
  const target=this.profiles.find(p=>p.id===this.deleteTarget);
  return `<section class="paper account-card"><span class="section-kicker">구글 계정</span><h2>${esc(this.session.user.email||'로그인됨')}</h2><p>스도쿠와 같은 가족 프로필이에요.</p>${notice}<h3>누가 양치하나요?</h3><div class="profile-list">${this.profiles.map(p=>`<div class="profile-entry">${button(`<strong>${esc(p.nickname)}</strong><span>${p.shared?'공동 기록':p.is_child?'아이':'보호자'}${p.id===current?.id?' · 선택됨':''}</span>`,`pick:${p.id}`,`profile-choice ${p.id===current?.id?'selected':''}`)}${p.can_delete?button('프로필 삭제',`delete:${p.id}`,'text delete-profile'):''}</div>`).join('')}</div>${button('프로필 목록 새로고침','refresh','text')}</section>
  ${target?`<section class="paper account-card"><h3>프로필 삭제</h3><p><strong>${esc(target.nickname)}</strong> 프로필과 양치 기록을 양치 앱에서 삭제합니다. 공유 중인 계정과 다른 기기에도 적용됩니다. 스도쿠 기록은 유지됩니다.</p><form id="delete-profile-form"><label>삭제할 이름을 똑같이 입력해주세요<input name="confirmName" autocomplete="off" required></label><p class="error" role="alert"></p><button class="primary" type="submit" disabled>이 프로필 삭제</button>${button('취소','delete-cancel','text')}</form></section>`:''}
  ${current?`<section class="paper account-card"><h3>${esc(current.nickname)}의 양치 기록</h3><p class="cloud-state" role="status">${esc(this.sync?.status)}</p><p class="small">누적 양치 시간이 더 긴 기록을 자동으로 사용해요. 시간이 같으면 최근 변경을 사용해요. 인터넷이 끊겨도 저장하고, 다시 연결되면 계정과 맞춰요.</p>${button('지금 동기화','sync','soft')}</section>`:''}
  <section class="paper account-card"><h3>${me?'아이 프로필 만들기':'내 프로필 만들기'}</h3><form id="profile-form"><label>별명<input name="nickname" maxlength="12" required placeholder="예: 별빛 양치왕" autocomplete="off"></label><button class="primary" type="submit">프로필 만들기</button><p id="profile-error" class="error" role="alert"></p></form><p class="small">이 프로필은 스도쿠에서도 함께 사용할 수 있어요.</p></section>
  ${this.trash.length?`<section class="paper"><details><summary>삭제한 프로필 복구</summary>${this.trash.map(p=>`<p>${esc(p.nickname)} ${button('복구',`restore:${p.id}`,'text')}</p>`).join('')}</details></section>`:''}
  <div class="button-row">${button('로그아웃','logout','text')}</div>`;
 }
 bind(root){
  const deletion=root.querySelector('#delete-profile-form');
  if(deletion){const target=this.profiles.find(p=>p.id===this.deleteTarget),input=deletion.querySelector('input'),submit=deletion.querySelector('[type="submit"]');
   input.oninput=()=>{submit.disabled=input.value!==target.nickname;};
   deletion.onsubmit=async e=>{e.preventDefault();if(input.value!==target.nickname)return;submit.disabled=true;
    try{await this.pauseAndSave();this.loading=true;await this.sync?.pending;await this.api.rpc('brush_delete_profile',{p:target.id,confirm_name:input.value});if(this.profile?.id===target.id){this.sync?.dispose();this.sync=null;}this.deleteTarget=null;await this.refreshProfiles();await removeProfileCache(target.id);const selected=this.profiles.find(p=>p.preferred)||this.profiles[0];if(!this.profile&&selected)await this.select(selected.id);this.message='양치 앱에서 프로필을 삭제했어요.';}
    catch(error){this.message=error.message==='name_mismatch'?'프로필 이름이 일치하지 않아요.':cloudError(error);}
    finally{this.loading=false;if(this.profile)this.openHome?.();else this.openAccount();this.changed();}
   };
  }
  const form=root.querySelector('#profile-form');if(!form)return;
  form.onsubmit=async e=>{
   e.preventDefault();const nickname=form.querySelector('[name="nickname"]').value.trim();if(!nickname)return;
   const submit=form.querySelector('button');submit.disabled=true;
   try{const id=await this.api.rpc('brush_create_profile',{nickname});await this.refreshProfiles();await this.select(id);}
   catch(error){form.querySelector('#profile-error').textContent=error.details||'프로필을 만들지 못했어요. 연결을 확인해주세요.';submit.disabled=false;}
  };
 }
 async action(action){
  const [kind,id]=action.split(':');this.message='';
  try{
   if(kind==='login'){
    await this.pauseAndSave();this.client??=await getCloudClient();this.api??=apiFor(this.client);
    const redirectTo=AUTH_REDIRECT_URL;
    const {error}=await this.client.auth.signInWithOAuth({provider:'google',options:{redirectTo}});if(error)throw error;
   }else if(kind==='pick')await this.select(id);
   else if(kind==='refresh')await this.refreshProfiles();
   else if(kind==='sync'){await this.pauseAndSave();this.schedule();}
   else if(kind==='delete'){if(this.profiles.some(p=>p.id===id&&p.can_delete))this.deleteTarget=id;}
   else if(kind==='restore'){if(this.trash.some(p=>p.id===id)){await this.api.rpc('brush_restore_profile',{p:id});await this.refreshProfiles();}}
   else if(kind==='delete-cancel'){this.deleteTarget=null;}
   else if(kind==='logout'){
    await this.pauseAndSave();this.sync?.dispose();
    const {error}=await this.client.auth.signOut({scope:'local'});if(error)throw error;
    await this.handleSession(null);this.openAccount();
   }
  }catch(error){this.message=error.message?.startsWith('옮길')?error.message:cloudError(error);}
  this.changed();
 }
}
