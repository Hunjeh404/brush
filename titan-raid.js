// A finite, presentation-only raid. Damage is already saved by endEarly().
const played = new Set();
const slotNames = {left:'왼쪽 받침대',center:'가운데 벽화',right:'오른쪽 받침대',frontLeft:'앞쪽 왼편',frontCenter:'앞쪽 가운데',frontRight:'앞쪽 오른편'};
const escape = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function claimRaidPlayback(result) {
 if (!result?.attack || !result.hit || played.has(result.id)) return false;
 played.add(result.id);
 if (played.size > 32) played.delete(played.values().next().value);
 return true;
}

const atlas='assets/titans/watercolor-atlas.png';
const rigs=[
 {name:'왕관 쓴 티탄',column:0,shoulder:[386,325],arm:[221,199]},
 {name:'곱슬머리 티탄',column:1,shoulder:[386,330],arm:[218,198]},
 {name:'덥수룩한 티탄',column:2,shoulder:[393,321],arm:[214,199]}
];
function titan(index) {
 const rig=rigs[index],x=rig.column*512;
 const [px,py]=rig.shoulder.map(v=>v+32),[ax,ay]=rig.arm;
 // Clip the original raster atlas; only the detached hammer arm rotates.
 const crop=(part,y)=>`<g clip-path="url(#titan-${index}-${part})"><image href="${atlas}" x="${-x}" y="${-y}" width="1536" height="1024"/></g>`;
 return `<svg viewBox="0 0 576 728" class="raid-puppet" role="img" aria-label="${rig.name}"><defs><clipPath id="titan-${index}-body"><rect width="512" height="664"/></clipPath><clipPath id="titan-${index}-arm"><rect width="512" height="360"/></clipPath></defs><g class="raid-hammer-arm" style="transform-origin:${px}px ${py}px;transform-box:view-box"><g transform="translate(${px-ax} ${py-ay})">${crop('arm',664)}</g></g><g transform="translate(32 32)">${crop('body',0)}</g></svg>`;
}

export function titanRaidMarkup({scene,result,worldName,play=false}) {
 const hit = Object.hasOwn(slotNames,result.hit) ? result.hit : '';
 const summary = hit ? `티탄 셋이 ${worldName}에 나타나 ${slotNames[hit]}에 손상을 남겼어요.` : '티탄 셋이 나타났지만 더 손상시킬 자리가 없어 돌아갔어요.';
 return `<section class="titan-raid ${play&&hit?'is-playing':'is-settled'} ${hit?'':'raid-no-hit'}" data-raid-hit="${hit}" aria-label="티탄 삼총사의 습격"><p class="raid-intro">우르르! 티탄 삼총사 등장!</p><div class="raid-stage">${scene}<div class="raid-crew" aria-hidden="true">${[0,1,2].map(i=>`<div class="raid-titan raid-titan-${i}">${titan(i)}</div>`).join('')}<span class="raid-speech">${hit?'앗! 내 망치!':'어라…?'}</span></div><div class="raid-impact" aria-hidden="true"><span class="raid-bonk bonk-one">쿵!</span><span class="raid-bonk bonk-two">쾅!</span><span class="raid-bonk bonk-three">뿅!</span><svg class="raid-dust" viewBox="0 0 120 65"><path d="M16 56C-1 52 3 29 22 30 10 9 39-3 51 17 66-2 91 4 89 23 114 13 131 44 106 57Z" fill="#f8efd9" stroke="#c0a47d" stroke-width="2"/></svg>${Array.from({length:7},(_,i)=>`<i class="raid-spark spark-${i}">✦</i>`).join('')}</div></div><p class="raid-summary" role="status">${escape(summary)} ${hit?'다음 모험에서 신성한 빛을 모아 수리해요.':'남아 있는 손상은 수리할 수 있어요.'}</p><button class="text raid-skip" data-action="skip-raid">애니메이션 건너뛰기</button></section>`;
}

export function bindTitanRaid(root) {
 const raid = root.querySelector('.titan-raid');
 if (!raid) return;
 // Pause the finite scene until its illustration is ready on a first uncached visit.
 if (raid.classList.contains('is-playing') && typeof Image === 'function') {
  const image=new Image();
  image.onload=image.onerror=()=>raid.classList.remove('is-loading');
  image.src=atlas;
  if (!image.complete) raid.classList.add('is-loading');
 }
 const scene = raid.querySelector('.garden-scene');
 const hit = raid.dataset.raidHit;
 const target = hit && scene.querySelector(`.garden-slot.${hit}`);
 if (target) {
  target.classList.add('raid-target');
  const frame = scene.getBoundingClientRect?.();
  const bounds = target.getBoundingClientRect?.();
  if (frame?.width && frame.height && bounds) {
   raid.style.setProperty('--hit-x',`${(bounds.left+bounds.width/2-frame.left)/frame.width*100}%`);
   raid.style.setProperty('--hit-y',`${(bounds.top+bounds.height/2-frame.top)/frame.height*100}%`);
  }
 }
 const skip = raid.querySelector('.raid-skip');
 if (!raid.classList.contains('is-playing')) skip.hidden = true;
 if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
  skipTitanRaid(root);
  return;
 }
 // A finite CSS animation can finish without timers, network calls or save mutations.
 const finish=event=>{
  if (event.animationName === 'raid-arrive-leave' && root.querySelector('.titan-raid') === raid) skipTitanRaid(root);
 };
 for(const name of ['animationend','animationcancel'])raid.querySelector('.raid-titan-2').addEventListener(name,finish);
}

export function skipTitanRaid(root) {
 const raid = root.querySelector('.titan-raid');
 if (!raid) return;
 raid.classList.remove('is-playing');
 raid.classList.add('is-settled');
 raid.querySelector('.raid-skip').hidden = true;
}
