import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {claimRaidPlayback,titanRaidMarkup,bindTitanRaid,skipTitanRaid} from '../titan-raid.js';

test('the watercolor rig crops six distinct, in-bounds parts from the original PNG',async()=>{
 const rig=JSON.parse(await readFile(new URL('../art/titans/rig.json',import.meta.url)));
 const png=await readFile(new URL('../'+rig.source,import.meta.url));
 assert.equal(createHash('sha256').update(png).digest('hex'),rig.source_sha256);
 assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],rig.source_size);
 const {document}=parseHTML(titanRaidMarkup({scene:'',result:{hit:'left'},worldName:'정원'}));
 const puppets=[...document.querySelectorAll('.raid-puppet')];
 assert.equal(puppets.length,3);
 const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);
 assert.equal(new Set(ids).size,6);
 for(const [index,c] of rig.characters.entries()){
  const images=puppets[index].querySelectorAll('image');assert.equal(images.length,2);
  for(const [part,image] of [['arm',images[0]],['body',images[1]]]){
   const [x,y,w,h]=c[part+'_rect'];
   assert.ok(x>=0&&y>=0&&x+w<=rig.source_size[0]&&y+h<=rig.source_size[1]);
   assert.equal(image.getAttribute('href'),rig.source);
   assert.equal(Number(image.getAttribute('x')),-x||0);
   assert.equal(Number(image.getAttribute('y')),-y||0);
   const rect=document.getElementById(`titan-${index}-${part}`).firstElementChild;
   assert.equal(Number(rect.getAttribute('width')),w);assert.equal(Number(rect.getAttribute('height')),h);
  }
  assert.ok(puppets[index].querySelector('.raid-hammer-arm').getAttribute('style').includes(`transform-origin:${c.pivot_canvas[0]}px ${c.pivot_canvas[1]}px`));
 }
});

test('the finite raid waits for uncached artwork without blocking skip',()=>{
 const original=globalThis.Image;let image;
 globalThis.Image=class {constructor(){image=this;this.complete=false;}};
 try{
  const {document}=parseHTML(titanRaidMarkup({scene:'<section class="garden-scene"></section>',result:{hit:'left'},worldName:'정원',play:true}));
  bindTitanRaid(document);const raid=document.querySelector('.titan-raid');
  assert.ok(raid.classList.contains('is-loading'));
  assert.equal(image.src,'assets/titans/watercolor-atlas.png');
  skipTitanRaid(document);image.onload();
  assert.equal(raid.classList.contains('is-loading'),false);
  assert.equal(raid.classList.contains('is-playing'),false);
 }finally{globalThis.Image=original;}
});

test('an early-exit raid plays once per history id; a redraw cannot create another attack',()=>{
 assert.equal(claimRaidPlayback({id:'raid-no-attack',attack:false,hit:'left'}),false);
 assert.equal(claimRaidPlayback({id:'raid-max-damage',attack:true,hit:null}),false);
 assert.equal(claimRaidPlayback({id:'raid-once',attack:true,hit:'left'}),true);
 assert.equal(claimRaidPlayback({id:'raid-once',attack:true,hit:'right'}),false);
});

test('the comic targets the actual hit slot, measures its position and settles without changing the saved result',()=>{
 const result={id:'raid-visual',attack:true,hit:'frontRight'};
 const saved=JSON.stringify(result);
 const scene='<section class="garden-scene"><div class="garden-slot frontRight damaged"><button class="slot-art"></button></div></section>';
 const {document}=parseHTML(titanRaidMarkup({scene,result,worldName:'구름 항구',play:true}));
 document.querySelector('.garden-scene').getBoundingClientRect=()=>({left:10,top:20,width:400,height:300});
 document.querySelector('.garden-slot').getBoundingClientRect=()=>({left:290,top:245,width:80,height:60});
 bindTitanRaid(document);
 const raid=document.querySelector('.titan-raid');
 assert.equal(raid.style.getPropertyValue('--hit-x'),'80%');
 assert.equal(raid.style.getPropertyValue('--hit-y'),'85%');
 assert.equal(document.querySelectorAll('.raid-titan').length,3);
 assert.match(document.querySelector('.raid-summary').textContent,/구름 항구.*앞쪽 오른편/);
 assert.ok(document.querySelector('.frontRight.raid-target'));
 const event=new document.defaultView.Event('animationend');event.animationName='raid-arrive-leave';document.querySelector('.raid-titan-2').dispatchEvent(event);
 assert.equal(raid.classList.contains('is-playing'),false);
 skipTitanRaid(document);
 assert.equal(document.querySelector('.raid-skip').hidden,true);
 assert.equal(JSON.stringify(result),saved);
});

test('a fully damaged space shows the trio leaving without depicting or recording another break',()=>{
 const {document}=parseHTML(titanRaidMarkup({scene:'<section class="garden-scene"></section>',result:{attack:true,hit:null},worldName:'정원',play:true}));
 bindTitanRaid(document);
 assert.equal(document.querySelector('.is-playing'),null);
 assert.equal(document.querySelectorAll('.raid-titan').length,3);
 assert.match(document.querySelector('.raid-summary').textContent,/더 손상시킬 자리가 없어/);
 assert.equal(document.querySelector('.raid-skip').hidden,true);
});

test('reduced motion settles immediately so an animation with no end event cannot block updates',()=>{
 const original=globalThis.matchMedia;
 globalThis.matchMedia=()=>({matches:true});
 try{
  const {document}=parseHTML(titanRaidMarkup({scene:'<section class="garden-scene"></section>',result:{attack:true,hit:'left'},worldName:'정원',play:true}));
  bindTitanRaid(document);
  assert.equal(document.querySelector('.is-playing'),null);
  assert.ok(document.querySelector('.is-settled'));
  assert.equal(document.querySelector('.raid-skip').hidden,true);
 }finally{globalThis.matchMedia=original;}
});
