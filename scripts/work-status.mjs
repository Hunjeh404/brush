import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const cwd=fileURLToPath(new URL('..',import.meta.url));
function git(...args){
  try{return execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:65536}).trim();}
  catch{return '(unavailable)';}
}
console.log(`Repository: ${cwd}\nHEAD: ${git('log','-1','--format=%h %s')}\nChanges:\n${git('status','--short').slice(0,1600)||'(clean)'}`);
const state=readFileSync(new URL('../WORK_STATE.md',import.meta.url),'utf8');
console.log(`\n${state.slice(0,5000)}`);
console.log('\nRemote status above is last verified, not a live query. Fetch only when publishing requires it.');
