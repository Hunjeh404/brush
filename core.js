import {WORLDS,EXTRA_ITEMS,SLOTS} from './catalog.js';
export {WORLDS,SLOTS};
export const DEFAULTS = Object.freeze({flossCount:2, brushCount:2, brushType:'electric', brushSeconds:300, decorateSeconds:180, voice:true, camera:true});
export const AREAS = ['내 오른쪽 위','내 왼쪽 위','내 왼쪽 아래','내 오른쪽 아래'];
export const FLOSS = ['윗니 오른쪽','윗니 앞쪽','윗니 왼쪽','아랫니 왼쪽','아랫니 앞쪽','아랫니 오른쪽'];
export const ITEMS = [
 {id:'olive',name:'올리브 나무',file:'olive_tree.webp',cost:0,kind:'garden'},
 {id:'lyre',name:'아폴론의 리라',file:'lyre.webp',cost:20,kind:'garden'},
 {id:'thread',name:'아리아드네의 실',file:'ariadne_thread.webp',cost:15,kind:'garden'},
 {id:'shield',name:'아테나의 방패',file:'mirror_shield.webp',cost:25,kind:'garden'},
 {id:'athena',name:'아테나 벽화',file:'athena.webp',cost:0,kind:'mural'},
 {id:'ariadne',name:'아리아드네 벽화',file:'ariadne.webp',cost:20,kind:'mural'},
 {id:'poseidon',name:'포세이돈 벽화',file:'poseidon.webp',cost:30,kind:'mural'},
 {id:'artemis',name:'아르테미스 벽화',file:'artemis.webp',cost:30,kind:'mural'},
 {id:'demeter',name:'데메테르 벽화',file:'demeter.webp',cost:30,kind:'mural'},
 ...EXTRA_ITEMS
];
export function dayKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function slotsFor(count){return count===0?[]:count===1?['evening']:count===2?['morning','evening']:['morning','noon','evening'];}
export const SLOT_NAMES={morning:'아침',noon:'점심',evening:'저녁'};
function emptyRoom(){return {placements:Object.fromEntries(SLOTS.map(s=>[s,null])),damage:Object.fromEntries(SLOTS.map(s=>[s,0]))};}
export function defaultState(){
 const room=emptyRoom();room.placements.left='olive';room.placements.center='athena';
 return {schema:2,revision:0,auth:null,settings:{...DEFAULTS},coins:0,owned:['olive','athena'],worldsOwned:['garden'],currentWorld:'garden',rooms:{garden:room},placements:room.placements,damage:room.damage,history:[],active:null,decorationMs:0,completed:0,attackCount:0,brushTotalMs:0,modifiedAt:0};
}
// Keep legacy current-room aliases for existing UI/session code and older save migration.
export function migrateState(state){
 if(![1,2].includes(state.schema))throw new Error('지원하지 않는 기록 버전입니다.');
 if(state.schema===1){
  const room=emptyRoom();Object.assign(room.placements,state.placements);Object.assign(room.damage,state.damage);
  state.worldsOwned=['garden'];state.currentWorld='garden';state.rooms={garden:room};state.schema=2;
 }
 if(!state.worldsOwned?.includes(state.currentWorld)||!state.rooms?.[state.currentWorld])throw new Error('공간 저장 정보를 읽지 못했습니다.');
 state.brushTotalMs=Math.max(Number(state.brushTotalMs)||0,historyBrushMs(state));
 state.modifiedAt=Number.isSafeInteger(state.modifiedAt)?state.modifiedAt:0;
 const room=state.rooms[state.currentWorld];state.placements=room.placements;state.damage=room.damage;return state;
}
export function visitWorld(state,id){
 if(!WORLDS.some(w=>w.id===id)||!state.worldsOwned.includes(id))throw new Error('아직 열지 않은 공간이에요.');
 state.rooms[state.currentWorld]={placements:state.placements,damage:state.damage};
 state.currentWorld=id;state.placements=state.rooms[id].placements;state.damage=state.rooms[id].damage;
}
export function unlockWorld(state,id){
 const world=WORLDS.find(w=>w.id===id);if(!world)throw new Error('알 수 없는 공간이에요.');
 if(state.worldsOwned.includes(id)){visitWorld(state,id);return;}
 if(!state.decorationMs)throw new Error('모험을 마치고 꾸미기 시간에 공간을 열어요.');
 if(state.coins<world.cost)throw new Error('신성한 빛이 부족해요.');
 state.coins-=world.cost;state.worldsOwned.push(id);state.rooms[id]=emptyRoom();visitWorld(state,id);
}
export function removePlaced(state,slot){
 if(!state.decorationMs||!SLOTS.includes(slot))throw new Error('꾸미기 시간에 보물을 정리해요.');
 state.placements[slot]=null;
}
export function normalizeSettings(s){return {flossCount:clampInt(s.flossCount,0,3),brushCount:clampInt(s.brushCount,1,3),brushSeconds:clampInt(s.brushSeconds,120,600),decorateSeconds:clampInt(s.decorateSeconds,0,600),brushType:s.brushType==='manual'?'manual':'electric',voice:!!s.voice,camera:!!s.camera};}
function clampInt(v,min,max){return Math.min(max,Math.max(min,Number.isFinite(+v)?Math.round(+v):min));}
export function routineSlots(settings){return ['morning','noon','evening'].filter(s=>slotsFor(settings.flossCount).includes(s)||slotsFor(settings.brushCount).includes(s));}
export function startSession(state,slot,date=new Date()){
 if(state.active)throw new Error('진행 중인 모험을 먼저 마쳐주세요.');
 if(!routineSlots(state.settings).includes(slot))throw new Error('설정된 회차가 아닙니다.');
 const floss=slotsFor(state.settings.flossCount).includes(slot), brush=slotsFor(state.settings.brushCount).includes(slot);
 state.active={id:crypto.randomUUID(),day:dayKey(date),slot,floss,brush,flossDone:false,flossIndex:0,stage:floss?'floss':'ready',elapsedMs:0,targetMs:state.settings.brushSeconds*1000,brushType:state.settings.brushType,createdAt:date.toISOString()};
 return state.active;
}
export function advanceFloss(state){const a=state.active;if(!a||a.stage!=='floss')return false;if(a.flossIndex<5){a.flossIndex++;return false;}a.flossDone=true;a.stage=a.brush?'ready':'complete';return true;}
export function guideFor(elapsedMs,targetMs,type='electric'){
 const p=Math.min(.999999,Math.max(0,elapsedMs/targetMs)), quadrant=Math.floor(p*4), q=(p*4)%1;
 const surface=q<.4?'바깥면':q<.8?'안쪽면':'씹는 면';
 const detail=type==='electric'?'칫솔모를 가볍게 대고, 치아마다 천천히 옮겨요.':surface==='씹는 면'?'작은 움직임으로 어금니의 씹는 면을 닦아요.':'잇몸 경계에 비스듬히 대고, 짧고 부드럽게 닦아요.';
 const next=surface==='바깥면'?'다음은 안쪽면이에요.':surface==='안쪽면'?'앞니 안쪽과 맨 뒤 치아도 챙겨요.':quadrant<3?`다음은 ${AREAS[quadrant+1]}예요.`:'이제 마무리할 시간이에요.';
 return {quadrant,surface,detail,next,label:`${AREAS[quadrant]} · ${surface}`,key:`${quadrant}-${surface}`};
}
export function historyBrushMs(state){return (state.history||[]).reduce((sum,h)=>sum+Math.max(0,Number(h.duration)||0)*1000,0);}
export function recordCompleted(state){
 const a=state.active;if(!a)throw new Error('진행 중인 모험이 없습니다.');
 if(a.brush&&a.elapsedMs<a.targetMs)throw new Error('아직 양치 시간이 남았어요.');
 if(a.floss&&!a.flossDone)throw new Error('치실 안내를 마쳐주세요.');
 const prior=state.history.filter(h=>h.day===a.day&&h.slot===a.slot&&h.status==='complete');
 const brushNew=a.brush&&!prior.some(h=>h.brush), flossNew=a.flossDone&&!prior.some(h=>h.floss);
 const reward=(brushNew?10:0)+(flossNew?10:0);
 state.coins+=reward;
 if(reward){state.completed++;state.decorationMs=state.settings.decorateSeconds*1000;}
 const result={id:a.id,day:a.day,slot:a.slot,status:'complete',brush:a.brush,floss:a.flossDone,duration:Math.round(a.elapsedMs/1000),reward};
 state.brushTotalMs=Math.max(state.brushTotalMs||0,historyBrushMs(state))+Math.round(a.elapsedMs);
 state.history.push(result);state.history=state.history.slice(-1000);state.active=null;return result;
}
export function endEarly(state){
 const a=state.active;if(!a)return null;
 const attack=a.brush&&a.stage==='brush'&&a.elapsedMs<a.targetMs;
 let hit=null;
 if(attack){
  state.attackCount++;
  const candidates=Object.keys(state.damage).sort((x,y)=>state.damage[x]-state.damage[y]);
  hit=candidates.find(k=>state.damage[k]<3)||null;
  if(hit)state.damage[hit]++;
 }
 const result={id:a.id,day:a.day,slot:a.slot,status:'ended',attack,hit,brush:false,floss:a.flossDone,reward:0,duration:Math.round(a.elapsedMs/1000)};
 state.brushTotalMs=Math.max(state.brushTotalMs||0,historyBrushMs(state))+Math.round(a.elapsedMs);
 state.history.push(result);state.history=state.history.slice(-1000);state.active=null;return result;
}
export function repair(state,slot){if(!state.decorationMs)throw new Error('꾸미기 시간이 끝났어요.');if(!Object.hasOwn(state.damage,slot)||!state.damage[slot])throw new Error('수리할 곳이 없어요.');if(state.coins<4)throw new Error('신성한 빛이 4개 필요해요.');state.coins-=4;state.damage[slot]--;}
export function purchasePlace(state,itemId,slot){
 if(!state.decorationMs)throw new Error('꾸미기 시간이 끝났어요.');
 const item=ITEMS.find(i=>i.id===itemId);if(!item||!SLOTS.includes(slot))throw new Error('놓을 수 없는 자리예요.');
 if((slot==='center')!==(item.kind==='mural'))throw new Error('벽화는 가운데 틀에, 보물은 받침대와 앞쪽 자리에 놓아요.');
 if(!state.owned.includes(itemId)){if(state.coins<item.cost)throw new Error('신성한 빛이 부족해요.');state.coins-=item.cost;state.owned.push(itemId);}
 state.placements[slot]=itemId;
}
export function validateBackup(data){
 if(!data||![1,2].includes(data.schema)||!data.settings)throw new Error('이 앱의 백업 파일이 아닙니다.');
 const allowed=new Set(ITEMS.map(i=>i.id));
 if(!Number.isSafeInteger(data.coins)||data.coins<0||data.coins>1e8)throw new Error('보상 값이 올바르지 않습니다.');
 if(!Array.isArray(data.owned)||data.owned.length>ITEMS.length||data.owned.some(x=>!allowed.has(x)))throw new Error('보관함이 올바르지 않습니다.');
 const fresh=defaultState();fresh.settings=normalizeSettings(data.settings);fresh.coins=data.coins;fresh.owned=[...new Set(data.owned)];
 const ids=new Set(WORLDS.map(w=>w.id));
 const ownedWorlds=data.schema===1?['garden']:data.worldsOwned;
 if(!Array.isArray(ownedWorlds)||!ownedWorlds.includes('garden')||ownedWorlds.length>WORLDS.length||new Set(ownedWorlds).size!==ownedWorlds.length||ownedWorlds.some(id=>!ids.has(id)))throw new Error('공간 보관함이 올바르지 않습니다.');
 const current=data.schema===1?'garden':data.currentWorld;
 if(!ownedWorlds.includes(current))throw new Error('선택한 공간이 올바르지 않습니다.');
 fresh.worldsOwned=[...ownedWorlds];fresh.rooms={};
 for(const world of ownedWorlds){
  const source=data.schema===1?{placements:data.placements,damage:data.damage}:data.rooms?.[world];
  if(!source?.placements||!source?.damage)throw new Error('공간 배치 정보가 없습니다.');
  const room=emptyRoom();
  for(const slot of SLOTS){
   const id=source.placements[slot]??null;
   if(id!==null&&(!fresh.owned.includes(id)||(slot==='center')!==(ITEMS.find(i=>i.id===id)?.kind==='mural')))throw new Error('배치 정보가 올바르지 않습니다.');
   const dmg=source.damage[slot]??(data.schema===1?0:undefined);
   if(!Number.isInteger(dmg)||dmg<0||dmg>3)throw new Error('수리 정보가 올바르지 않습니다.');
   room.placements[slot]=id;room.damage[slot]=dmg;
  }
  fresh.rooms[world]=room;
 }
 fresh.currentWorld=current;fresh.placements=fresh.rooms[current].placements;fresh.damage=fresh.rooms[current].damage;
 if(!Array.isArray(data.history)||data.history.length>1000)throw new Error('기록이 올바르지 않습니다.');
 fresh.history=data.history.map(h=>{if(!h||!/^\d{4}-\d{2}-\d{2}$/.test(h.day)||!Object.hasOwn(SLOT_NAMES,h.slot)||!['complete','ended'].includes(h.status))throw new Error('기록 형식이 올바르지 않습니다.');return {id:String(h.id).slice(0,80),day:h.day,slot:h.slot,status:h.status,brush:!!h.brush,floss:!!h.floss,reward:clampInt(h.reward,0,20),duration:clampInt(h.duration,0,600),attack:!!h.attack,hit:SLOTS.includes(h.hit)?h.hit:null};});
 fresh.decorationMs=clampInt(data.decorationMs,0,fresh.settings.decorateSeconds*1000);fresh.completed=clampInt(data.completed,0,1e7);fresh.attackCount=clampInt(data.attackCount,0,1e7);
 for(const k of ['brushTotalMs','modifiedAt'])if(data[k]!=null&&(!Number.isSafeInteger(data[k])||data[k]<0))throw new Error('동기화 기록이 올바르지 않습니다.');
 fresh.brushTotalMs=Math.max(data.brushTotalMs||0,historyBrushMs(fresh));fresh.modifiedAt=data.modifiedAt||0;return fresh;
}
