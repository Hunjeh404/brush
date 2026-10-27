import {titanRaidMarkup,bindTitanRaid,skipTitanRaid} from './titan-raid.js';

const root=document.querySelector('#raid-preview');
// A separate demonstration scene, with no account, database or game-state access.
const scene=`<section class="garden-scene world-garden" aria-label="미리보기 정원"><img class="garden-backdrop" src="assets/olympus-garden.webp" width="1448" height="1086" alt="꽃과 분수가 있는 올림포스 정원"><div class="garden-slots"><div class="garden-slot left occupied damaged" data-level="1" style="--art-ratio:237/261;--art-width:162.0253%;--art-height:147.1264%;--art-left:-31.2236%;--art-top:-23.7548%"><button class="slot-art" disabled aria-label="미리보기 올리브나무"><img class="scene-object" src="assets/olive_tree.webp" alt="올리브나무"><svg class="crack" viewBox="0 0 120 120" aria-hidden="true"><path d="M66 0 48 29 67 46 43 71 61 93 51 120 M67 46 94 51 104 79 M43 71 13 65"/></svg></button></div><div class="garden-slot center occupied"><button class="slot-art" disabled aria-label="미리보기 아테나 벽화"><img class="scene-object" src="assets/athena.webp" alt="아테나 벽화"></button></div></div></section>`;
function replay(){root.innerHTML=titanRaidMarkup({scene,result:{attack:true,hit:'left'},worldName:'올림포스 정원',play:true});bindTitanRaid(root);}
root.addEventListener('click',event=>{if(event.target.closest('[data-action="skip-raid"]'))skipTitanRaid(root);});
document.querySelector('#raid-replay').addEventListener('click',replay);
replay();
