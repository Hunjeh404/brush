import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultState,migrateState,visitWorld,unlockWorld,removePlaced,purchasePlace,validateBackup,ITEMS,WORLDS,SLOTS,startSession,endEarly} from '../core.js';
test('48 distinct new treasures and eight new collectible spaces',()=>{
 assert.equal(ITEMS.length,57);assert.equal(WORLDS.length,9);
 assert.equal(new Set(ITEMS.map(i=>i.id)).size,57);
 for(const world of WORLDS.slice(1)){
  const items=ITEMS.filter(i=>i.theme===world.id);
  assert.equal(items.length,6);assert.equal(items.filter(i=>i.kind==='mural').length,1);
 }
});
test('old installed save migrates without losing money, ownership, placement, damage, auth or active brushing',()=>{
 const legacy={...defaultState(),schema:1,coins:171,owned:['olive','athena','lyre'],placements:{left:'lyre',center:'athena',right:'olive'},damage:{left:2,center:0,right:1},auth:{hash:'preserve-me'},active:{elapsedMs:12000},history:[{id:'saved'}]};
 delete legacy.rooms;delete legacy.worldsOwned;delete legacy.currentWorld;
 const s=migrateState(structuredClone(legacy));
 assert.equal(s.schema,2);assert.equal(s.coins,171);assert.deepEqual(s.owned,legacy.owned);
 assert.equal(s.placements.left,'lyre');assert.equal(s.damage.left,2);assert.equal(s.damage.frontLeft,0);
 assert.equal(s.auth.hash,'preserve-me');assert.equal(s.active.elapsedMs,12000);assert.deepEqual(s.history,legacy.history);
 assert.equal(s.placements,s.rooms.garden.placements);
 assert.equal(migrateState(s).coins,171);
});
test('unlock requires earned time and funds; repeat visits never charge; each room keeps its own layout',()=>{
 const s=defaultState();s.coins=1000;
 assert.throws(()=>unlockWorld(s,'cloud'));assert.equal(s.coins,1000);
 s.decorationMs=30000;unlockWorld(s,'cloud');assert.equal(s.coins,880);
 purchasePlace(s,'cloud-1','frontLeft');assert.equal(s.coins,860);
 purchasePlace(s,'cloud-6','center');assert.equal(s.coins,750);
 visitWorld(s,'garden');assert.equal(s.placements.left,'olive');assert.equal(s.placements.frontLeft,null);
 unlockWorld(s,'cloud');assert.equal(s.coins,750);assert.equal(s.placements.frontLeft,'cloud-1');assert.equal(s.placements.center,'cloud-6');
 const reloaded=migrateState(JSON.parse(JSON.stringify(s)));purchasePlace(reloaded,'olive','right');
 visitWorld(reloaded,'garden');visitWorld(reloaded,'cloud');assert.equal(reloaded.placements.right,'olive');
 reloaded.decorationMs=0;visitWorld(reloaded,'garden');assert.equal(reloaded.currentWorld,'garden');
 assert.throws(()=>visitWorld(reloaded,'stars'));assert.throws(()=>unlockWorld(reloaded,'missing'));
});
test('insufficient funds and invalid slots are atomic; removing returns an owned item without refund',()=>{
 const s=defaultState();s.decorationMs=10000;s.coins=119;
 assert.throws(()=>unlockWorld(s,'cloud'));assert.equal(s.coins,119);assert.deepEqual(s.worldsOwned,['garden']);
 assert.throws(()=>purchasePlace(s,'sea-6','frontLeft'));assert.throws(()=>purchasePlace(s,'sea-1','center'));
 purchasePlace(s,'sea-1','frontLeft');const balance=s.coins;removePlaced(s,'frontLeft');
 assert.equal(s.placements.frontLeft,null);assert.ok(s.owned.includes('sea-1'));assert.equal(s.coins,balance);
});
test('backup round trip restores all spaces and rejects locked or malformed room content',()=>{
 const s=defaultState();s.decorationMs=10000;s.coins=1000;unlockWorld(s,'sea');
 purchasePlace(s,'sea-1','frontRight');s.damage.frontRight=2;visitWorld(s,'garden');
 const restored=validateBackup(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.coins,s.coins);assert.deepEqual(restored.worldsOwned,['garden','sea']);
 visitWorld(restored,'sea');assert.equal(restored.placements.frontRight,'sea-1');assert.equal(restored.damage.frontRight,2);
 assert.equal(restored.auth,null);assert.equal(restored.active,null);
 const bad=structuredClone(s);bad.rooms.sea.placements.center='sea-1';assert.throws(()=>validateBackup(bad));
 assert.throws(()=>validateBackup({...s,currentWorld:'stars'}));
 assert.throws(()=>validateBackup({...s,worldsOwned:['garden','__proto__']}));
 const legacy={...defaultState(),schema:1,placements:{left:'olive',center:'athena',right:null},damage:{left:1,center:0,right:0}};
 const old=validateBackup(legacy);assert.equal(old.schema,2);assert.equal(old.damage.left,1);assert.equal(old.damage.frontLeft,0);
});
test('an attack affects only the current space and is bounded at six positions',()=>{
 const s=defaultState();s.coins=1000;s.decorationMs=10000;unlockWorld(s,'sea');
 for(let i=0;i<23;i++){startSession(s,'morning');s.active.stage='brush';endEarly(s);}
 assert.ok(SLOTS.every(slot=>s.damage[slot]===3));visitWorld(s,'garden');assert.ok(SLOTS.every(slot=>s.damage[slot]===0));
});

test('all 48 added treasures cost half, while original decorations and space prices stay unchanged',()=>{for(const w of WORLDS.slice(1))assert.deepEqual(ITEMS.filter(i=>i.theme===w.id).map(i=>i.cost),[20,35,50,70,90,110]);assert.deepEqual(ITEMS.slice(0,9).map(i=>i.cost),[0,20,15,25,0,20,30,30,30]);assert.equal(WORLDS.find(w=>w.id==='cloud').cost,120);});
