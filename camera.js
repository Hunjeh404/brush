let enginePromise;
async function getEngine(){
 if(!enginePromise)enginePromise=(async()=>{
  const {FaceLandmarker,FilesetResolver}=await import('./vendor/vision_bundle.mjs');
  const files=await FilesetResolver.forVisionTasks(new URL('./vendor/wasm/',import.meta.url).href);
  return FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./models/face_landmarker.task',import.meta.url).href,delegate:'CPU'},runningMode:'VIDEO',numFaces:1,minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5,minTrackingConfidence:.5});
 })().catch(error=>{enginePromise=null;throw error;});
 return enginePromise;
}
export class CameraGuide{
 constructor(video,canvas,status){this.video=video;this.canvas=canvas;this.status=status;this.stopped=false;this.frame=0;this.last=0;this.stamp=0;}
 async start(){
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('secure');
   this.status.textContent='카메라 연결 중…';
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:15,max:24}}});
   if(this.stopped){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;this.video.srcObject=stream;await this.video.play();
   this.video.closest('.camera-box')?.classList.add('connected');
   this.status.textContent='얼굴 위치를 준비하고 있어요…';
   const engine=await getEngine();if(this.stopped)return;this.engine=engine;this.loop();
  }catch(error){if(this.stopped)return;this.status.textContent=error.name==='NotAllowedError'?'카메라 권한이 꺼져 있어요. 타이머로 계속할 수 있어요.':error.name==='NotFoundError'?'카메라를 찾지 못했어요. 타이머로 계속할 수 있어요.':'얼굴 안내를 사용할 수 없어 타이머로 진행해요.';}
 }
 loop(){if(this.stopped)return;this.frame=requestAnimationFrame(t=>{if(t-this.last>180&&this.video.readyState>=2){this.last=t;try{const result=this.engine.detectForVideo(this.video,performance.now());this.draw(result.faceLandmarks?.[0]);}catch{this.status.textContent='얼굴 안내를 잠시 쉬고 있어요. 시간은 계속돼요.';}}this.loop();});}
 draw(points){const box=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),ctx=this.canvas.getContext('2d');this.canvas.width=box.width*dpr;this.canvas.height=box.height*dpr;ctx.scale(dpr,dpr);if(!points){this.status.textContent='얼굴을 화면 안에 맞춰주세요. 시간은 계속돼요.';return;}
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const vw=this.video.videoWidth,vh=this.video.videoHeight,scale=Math.max(box.width/vw,box.height/vh),ox=(box.width-vw*scale)/2,oy=(box.height-vh*scale)/2;
 const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 ctx.strokeStyle='rgba(238,220,167,.85)';ctx.lineWidth=2;ctx.setLineDash([9,7]);ctx.beginPath();ctx.ellipse(cx*vw*scale+ox,cy*vh*scale+oy,(maxX-minX)*vw*scale*.57,(maxY-minY)*vh*scale*.56,0,0,Math.PI*2);ctx.stroke();
 this.status.textContent=maxX-minX<.22?'얼굴이 조금 더 가까이 보이게 해주세요.':cx<.18||cx>.82?'얼굴을 화면 가운데로 맞춰주세요.':'얼굴이 보여요 · 안내 순서대로 천천히';
 }
 stop(){this.stopped=true;cancelAnimationFrame(this.frame);this.stream?.getTracks().forEach(t=>t.stop());this.video.pause();this.video.srcObject=null;}
}
