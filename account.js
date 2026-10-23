import {getCloudClient,apiFor,cloudError} from './cloud-client.js';
import {CloudSync} from './cloud-sync.js';
import {defaultState,migrateState} from './core.js';
import {profileKey,cloudPayload,restoreCloud,hasProgress} from './cloud-state.js';
import {readState,writeState,archiveState} from './db.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,cls='primary')=>`<button class="${cls}" data-action="account:${action}">${label}</button>`;
const saved=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(`brush:${key}`))??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(`brush:${key}`,JSON.stringify(value));}catch{}};
export class Account{
 constructor(callbacks){Object.assign(this,callbacks);this.ready=typeof window.localStorage==='undefined';this.session=null;this.profiles=[];this.profile=null;this.sync=null;this.key='main';this.message='';this.epoch=0;this.uid=undefined;this.loading=false;this.confirmImport=false;}
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
   this.interval=setInterval(()=>this.flush(),15000);
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
  this.key='main';await this.applyState(migrateState(guest||defaultState()),this.key);
  this.profiles=[];
  if(uid){
   await this.refreshProfiles();if(epoch!==this.epoch)return;
   const selected=this.profiles.find(p=>p.id===saved(`selected:${uid}`,null))||this.profiles.find(p=>p.preferred);
   if(selected)try{await this.select(selected.id);}catch(error){this.message=cloudError(error);}
   if(!this.profile)this.openAccount();
  }
  }finally{if(epoch===this.epoch){this.loading=false;this.changed();}}
 }
 async refreshProfiles(){
  const uid=this.uid,epoch=this.epoch;if(!uid)return;
  if(globalThis.navigator?.onLine===false){this.profiles=saved(`profiles:${uid}`,[]);this.changed();return;}
  try{
   const profiles=await this.api.rpc('brush_profiles');if(epoch!==this.epoch)return;
   this.profiles=profiles;save(`profiles:${uid}`,profiles);
   if(this.profile&&!profiles.some(p=>p.id===this.profile.id)){
    await this.pauseAndSave();this.sync?.dispose();this.sync=null;this.profile=null;this.key='main';await this.applyState(migrateState(await readState()||defaultState()),this.key);this.openAccount();
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
   const guest=await readState();
   local=remote.payload?restoreCloud(remote.payload,guest?.auth??null):defaultState();local.auth??=guest?.auth??null;
   local.revision=await writeState(local,0,key,{version:remote.version,dirty:false,updatedAt:remote.updatedAt});
  }
  if(epoch!==this.epoch)return;
  this.sync?.dispose();this.profile=profile;this.key=key;save(`selected:${uid}`,id);this.message='';
  this.sync=new CloudSync({uid,profile,api:this.api,isIdle:()=>this.isIdle()&&!this.loading,
   onState:async next=>{if(this.key===key&&epoch===this.epoch)await this.applyState(next,key);},onStatus:()=>this.changed(true)});
  await this.applyState(migrateState(local),key);
  this.guestHasProgress=hasProgress(await readState());
  this.confirmImport=false;this.openAccount();this.schedule();
  }finally{if(epoch===this.epoch){this.loading=wasLoading;this.changed();}}
 }
 schedule(){clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),800);}
 async flush(){if(this.sync&&this.ready&&!this.loading&&this.isIdle()){await this.waitForSave();await this.sync.flush();}}
 status(){return this.profile?`${this.profile.nickname} · ${this.sync?.status||'기기에 저장됨'}`:'이 기기에 저장';}
 entry(){return `<section class="paper account-card"><span class="section-kicker">가족 계정</span><h2>어디서든 이어서 양치해요</h2><p>스도쿠와 같은 구글 계정과 가족 프로필을 사용해요.<br>양치 기록과 모은 보물은 별도로 저장돼요.</p>${button('구글 계정으로 시작하기','login','primary google-login')}<p class="small">보호자 계정으로 로그인해 아이 프로필을 선택해주세요. 아이 이메일은 필요하지 않아요.</p><p class="small"><a href="privacy.html">개인정보처리방침</a></p></section>`;}
 view(){
  if(this.loading)return '<section class="paper"><h2>계정 기록을 확인하고 있어요…</h2><p>기기에 저장된 기록은 그대로 보관돼요.</p></section>';
  const notice=this.message?`<p class="notice" role="status">${esc(this.message)}</p>`:'';
  if(!this.session)return `${this.entry()}${notice}<p class="small center">로그인 없이도 이 기기에서 양치할 수 있어요.</p>`;
  const me=this.profiles.find(p=>p.mine),current=this.profile;
  const conflict=this.sync?.conflict;
  return `<section class="paper account-card"><span class="section-kicker">구글 계정</span><h2>${esc(this.session.user.email||'로그인됨')}</h2><p>스도쿠와 같은 가족 프로필이에요.</p>${notice}<h3>누가 양치하나요?</h3><div class="profile-list">${this.profiles.map(p=>button(`<strong>${esc(p.nickname)}</strong><span>${p.shared?'공동 기록':p.is_child?'아이':'보호자'}${p.id===current?.id?' · 선택됨':''}</span>`,`pick:${p.id}`,`profile-choice ${p.id===current?.id?'selected':''}`)).join('')}</div>${button('프로필 목록 새로고침','refresh','text')}</section>
  ${current?`<section class="paper account-card"><h3>${esc(current.nickname)}의 양치 기록</h3><p class="cloud-state" role="status">${esc(this.sync?.status)}</p>${button('지금 동기화','sync','soft')}${conflict?`<div class="notice"><h3>두 기기의 기록이 달라요</h3><p>자동으로 덮어쓰지 않았어요. 사용할 기록을 선택해주세요. 선택 전 기록은 이 기기에 따로 보관해요.</p><div class="record-compare"><p>이 기기: 신성한 빛 ${this.getState().coins} · 완료 ${this.getState().completed}회</p><p>계정: 신성한 빛 ${esc(conflict.payload?.coins)} · 완료 ${esc(conflict.payload?.completed)}회</p></div><div class="button-row">${button('계정 기록 사용','resolve:cloud')}${button('이 기기 기록 사용','resolve:local','soft')}${button('두 기록 백업','conflict-backup','text')}</div></div>`:''}
  ${this.guestHasProgress?`<hr><h3>로그인 전에 쓰던 기록</h3><p>이 기기에 남아 있는 양치 기록을 ${esc(current.nickname)} 프로필로 옮길 수 있어요.</p>${this.confirmImport?`<p class="notice">현재 프로필의 기록을 기존 기기 기록으로 교체합니다. 코인을 합산하지 않으며, 교체 전 기록과 원래 기기 기록은 보관합니다.</p>${button('이 프로필로 옮기기 확인','import-confirm')}${button('취소','import-cancel','text')}`:button('기존 기기 기록 옮기기','import','soft')}`:''}</section>`:''}
  <section class="paper account-card"><h3>${me?'아이 프로필 만들기':'내 프로필 만들기'}</h3><form id="profile-form"><label>별명<input name="nickname" maxlength="12" required placeholder="예: 별빛 양치왕" autocomplete="off"></label><button class="primary" type="submit">프로필 만들기</button><p id="profile-error" class="error" role="alert"></p></form><p class="small">이 프로필은 스도쿠에서도 함께 사용할 수 있어요.</p></section>
  <div class="button-row">${button('로그아웃','logout','text')}</div>`;
 }
 bind(root){
  const form=root.querySelector('#profile-form');if(!form)return;
  form.onsubmit=async e=>{
   e.preventDefault();const nickname=form.querySelector('[name="nickname"]').value.trim();if(!nickname)return;
   const submit=form.querySelector('button');submit.disabled=true;
   try{const me=this.profiles.find(p=>p.mine);const id=await this.api.rpc(me?'create_child_profile':'create_my_profile',{...(me?{guardian:me.id}:{}),nickname,avatar_id:'',guide_id:'hestia'});await this.refreshProfiles();await this.select(id);}
   catch(error){form.querySelector('#profile-error').textContent=error.details||'프로필을 만들지 못했어요. 연결을 확인해주세요.';submit.disabled=false;}
  };
 }
 async action(action){
  const [kind,id]=action.split(':');this.message='';
  try{
   if(kind==='login'){
    await this.pauseAndSave();this.client??=await getCloudClient();this.api??=apiFor(this.client);
    const redirectTo=new URL('./',location.href).href;
    const {error}=await this.client.auth.signInWithOAuth({provider:'google',options:{redirectTo}});if(error)throw error;
   }else if(kind==='pick')await this.select(id);
   else if(kind==='refresh')await this.refreshProfiles();
   else if(kind==='sync'){await this.pauseAndSave();this.schedule();}
   else if(kind==='resolve'){await this.pauseAndSave();await this.sync.resolve(id);this.schedule();}
   else if(kind==='conflict-backup')this.download('양치-충돌기록.json',JSON.stringify({local:cloudPayload(this.getState()),cloud:this.sync.conflict.payload},null,2));
   else if(kind==='import'){this.confirmImport=true;}
   else if(kind==='import-cancel'){this.confirmImport=false;}
   else if(kind==='import-confirm'){
    if(!this.profile||!this.confirmImport)return;
    await this.pauseAndSave();const local=await readState(this.key),guest=await readState();
    if(!hasProgress(guest))throw Error('옮길 기기 기록이 없습니다.');
    await archiveState(this.key,{local});const next=restoreCloud(cloudPayload(guest),local.auth);
    next.revision=await writeState(next,local.revision,this.key);await this.applyState(next,this.key);this.confirmImport=false;this.schedule();
   }else if(kind==='logout'){
    await this.pauseAndSave();this.sync?.dispose();
    const {error}=await this.client.auth.signOut({scope:'local'});if(error)throw error;
    await this.handleSession(null);this.openAccount();
   }
  }catch(error){this.message=error.message?.startsWith('옮길')?error.message:cloudError(error);}
  this.changed();
 }
}
