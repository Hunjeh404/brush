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

function titan(index) {
 const names = ['왕관 쓴 티탄','곱슬머리 티탄','덥수룩한 티탄'];
 const hair = [
  '<path d="M40 62 35 39 56 42 66 24 83 35 102 24 111 43 137 39 140 76 124 95 53 91Z" fill="var(--hair)"/><path d="M48 39 45 12 65 24 85 6 103 25 126 14 122 42Z" fill="#d0ad5d"/><path d="m54 34 60-1" stroke="#f5dc94"/>',
  '<path d="M40 82Q20 74 35 60Q21 44 42 39Q39 17 62 29Q73 9 88 27Q111 11 116 35Q144 27 139 51Q156 62 140 79L124 96 51 97Z" fill="var(--hair)"/><path d="M44 48Q89 30 134 49" stroke="#a99b71" stroke-width="8"/>',
  '<path d="M37 79 28 57 40 42 47 27 68 31 86 19 104 31 129 26 135 45 146 57 137 86 113 103 52 98Z" fill="var(--hair)"/><path d="m47 45 20-6m48 2 13 5" stroke="#d9c8a2"/>'
 ][index];
 return `<svg viewBox="0 0 180 220" class="raid-puppet" role="img" aria-label="${names[index]}"><g stroke="#594c3f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
 <ellipse cx="88" cy="209" rx="52" ry="7" fill="#55432c" opacity=".12" stroke="none"/>
 <g class="raid-legs"><path d="m64 166-5 29-17 8q-5 11 18 9l20-8 7-35M105 167l4 29 21 6q10 11-14 11l-20-9-4-34" fill="#a4875d"/><path d="m58 193 20 8m31-8-14 8" fill="none"/></g>
 <path d="M56 96Q87 81 119 99l17 68q-41 25-92 0Z" fill="var(--robe)"/><path d="m72 99-8 59 48 10m-59-18 71 1" stroke="#f0d59b" fill="none" stroke-width="7"/><path d="m68 109 9 30m32-33-6 31" fill="none" opacity=".3"/>
 <g class="raid-free-arm"><path d="M55 107Q32 114 30 139l17 6 17-23" fill="#d7b38e"/><path d="m29 137-7 13 4 10 12-4 10-12" fill="#dfbd99"/></g>
 <g class="raid-hammer-arm"><path d="M117 105q25 10 31-6l9-21-14-7-14 23-12-2Z" fill="#dfbd99"/><path d="m148 89 5-40" stroke="#936843" stroke-width="10"/><path d="M132 29q19-7 42 0l-1 25q-22 7-43-1Z" fill="#b68e5d"/><path d="m139 32-1 19m27-19-1 20" stroke="#e2c48b" stroke-width="4"/><path d="m149 79 10-1" stroke="#b28a64"/></g>
 <g class="raid-head">${hair}<ellipse cx="88" cy="64" rx="43" ry="37" fill="#dfbd99"/><path d="M47 72q11 20 19 3 19 19 42 0 12 15 22-6l-1 32-13-3-4 18-16-8-12 13-13-14-17 5-3-18-13-1Z" fill="var(--hair)"/><path d="m64 70 9 6 12-1m10 0 11 1 8-7" fill="none"/><path d="m64 48 15 3m20 0 15-6" stroke-width="5"/><path d="M69 58v3m38-4v3" stroke-width="5"/><path d="m86 59-5 10 10 1" fill="none" stroke="#b58e6a"/><ellipse cx="58" cy="70" rx="7" ry="4" fill="#c68d75" stroke="none" opacity=".5"/><ellipse cx="117" cy="69" rx="7" ry="4" fill="#c68d75" stroke="none" opacity=".5"/><path d="m81 85 9 3 8-4" fill="none" stroke="#f5e5c5" stroke-width="3"/></g>
 </g></svg>`;
}

export function titanRaidMarkup({scene,result,worldName,play=false}) {
 const hit = Object.hasOwn(slotNames,result.hit) ? result.hit : '';
 const summary = hit ? `티탄 셋이 ${worldName}에 나타나 ${slotNames[hit]}에 손상을 남겼어요.` : '티탄 셋이 나타났지만 더 손상시킬 자리가 없어 돌아갔어요.';
 return `<section class="titan-raid ${play&&hit?'is-playing':'is-settled'} ${hit?'':'raid-no-hit'}" data-raid-hit="${hit}" aria-label="티탄 삼총사의 습격"><p class="raid-intro">우르르! 티탄 삼총사 등장!</p><div class="raid-stage">${scene}<div class="raid-crew" aria-hidden="true">${[0,1,2].map(i=>`<div class="raid-titan raid-titan-${i}">${titan(i)}</div>`).join('')}<span class="raid-speech">${hit?'앗! 내 망치!':'어라…?'}</span></div><div class="raid-impact" aria-hidden="true"><span class="raid-bonk bonk-one">쿵!</span><span class="raid-bonk bonk-two">쾅!</span><span class="raid-bonk bonk-three">뿅!</span><svg class="raid-dust" viewBox="0 0 120 65"><path d="M16 56C-1 52 3 29 22 30 10 9 39-3 51 17 66-2 91 4 89 23 114 13 131 44 106 57Z" fill="#f8efd9" stroke="#c0a47d" stroke-width="2"/></svg>${Array.from({length:7},(_,i)=>`<i class="raid-spark spark-${i}">✦</i>`).join('')}</div></div><p class="raid-summary" role="status">${escape(summary)} ${hit?'다음 모험에서 신성한 빛을 모아 수리해요.':'남아 있는 손상은 수리할 수 있어요.'}</p><button class="text raid-skip" data-action="skip-raid">애니메이션 건너뛰기</button></section>`;
}

export function bindTitanRaid(root) {
 const raid = root.querySelector('.titan-raid');
 if (!raid) return;
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
 // A finite CSS animation can finish without timers, network calls or save mutations.
 raid.querySelector('.raid-titan-2').addEventListener('animationend',event=>{
  if (event.animationName === 'raid-arrive-leave') skipTitanRaid(root);
 });
}

export function skipTitanRaid(root) {
 const raid = root.querySelector('.titan-raid');
 if (!raid) return;
 raid.classList.remove('is-playing');
 raid.classList.add('is-settled');
 raid.querySelector('.raid-skip').hidden = true;
}
