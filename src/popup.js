'use strict';
let sourceId,plan=null,message='',isError=false,lastMessage='실행 기록이 없습니다.';
const el=id=>document.getElementById(id),L=LabelLanguage;
function render(){
 document.documentElement.lang=L.language;
 el('title').textContent=L.tri('SUNG Labels','Etiquetas SUNG','SUNG 라벨 채우기');
 el('subtitle').textContent='v0.1.14 · '+L.tri('JOB_READY only','Solo JOB_READY','작업 대기 전용');
 el('run').textContent=L.tri('Fill label','Rellenar etiqueta','라벨 입력');
 el('refresh').textContent=L.tri('Preview','Vista previa','미리보기');
 el('shortcut').textContent='Alt + Shift + L';
 el('recent').textContent=L.tri('Recent activity','Actividad reciente','최근 실행');
 el('hint').textContent=L.tri('Do not use the sheet while filling.','No uses la hoja mientras se rellena.','입력 중에는 시트 조작을 잠시 멈춰주세요.');
 el('guide').textContent=L.tri('User guide','Guía de uso','사용 안내');
 el('preview').textContent=plan?L.preview(plan):L.translate(message);
 el('preview').classList.toggle('error',isError);
 el('last').textContent=L.translate(lastMessage);
}
function show(text,error=false){plan=null;message=text;isError=error;render();}
async function refresh(){
 el('run').disabled=true;
 const [tab]=await chrome.tabs.query({active:true,lastFocusedWindow:true});sourceId=tab?.id;
 const response=await chrome.runtime.sendMessage({type:'PREVIEW',tabId:sourceId});
 if(response?.ok){plan=response.plan;isError=false;el('run').disabled=false;}
 else show(response?.error||'acrossB 탭을 열어주세요.',true);
 const {status}=await chrome.storage.session.get('status');lastMessage=status?.text||'실행 기록이 없습니다.';render();
}
L.controls(el('languages'));L.subscribe(render);L.ready.then(render);render();
el('refresh').onclick=()=>refresh().catch(e=>show(e.message,true));
el('run').onclick=async()=>{
 el('run').disabled=true;show('시트 입력 중입니다. 잠시 기다려주세요.');
 try{const r=await chrome.runtime.sendMessage({type:'RUN',tabId:sourceId});show(r.ok?r.text:r.error,!r.ok);}
 catch(e){show(e.message,true);}
 finally{el('run').disabled=false;}
};
refresh().catch(e=>show(e.message,true));
