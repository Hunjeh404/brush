import {spawn} from 'node:child_process';
const args=process.argv.slice(2);
const value=(flag,fallback)=>{const i=args.indexOf(flag);return i<0?fallback:args[i+1];};
const server=spawn('python3',['-m','http.server',value('--port','4173'),'--bind',value('--host','0.0.0.0')],{stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.kill(signal));
server.on('exit',code=>process.exit(code??0));
