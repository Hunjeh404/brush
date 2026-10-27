import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {claimRaidPlayback,titanRaidMarkup,bindTitanRaid,skipTitanRaid} from '../titan-raid.js';

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
