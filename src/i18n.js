(function(root){
 let language='ko';
 const listeners=new Set();
 const tri=(en,es,ko)=>language==='en'?en:language==='es'?es:ko;
 function change(value){language=['ko','en','es'].includes(value)?value:'ko';for(const fn of listeners)fn();}
 const ready=chrome.storage.local.get('language').then(v=>change(v.language));
 async function setLanguage(value){change(value);await chrome.storage.local.set({language});}
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.language)change(changes.language.newValue);});
 function subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);}
 function controls(container){
   container.innerHTML='<button type="button" data-language="ko" title="한국어">한국어</button><button type="button" data-language="en" title="English">EN</button><button type="button" data-language="es" title="Español">ES</button>';
   const paint=()=>{for(const b of container.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.language===language));};
   for(const b of container.querySelectorAll('button'))b.onclick=()=>setLanguage(b.dataset.language);
   subscribe(paint);paint();
 }
 const phrases=[
 ['의 주문 수 또는 SKU 텍스트를 읽지 못했습니다.',' : Could not read the order count or SKU text.',' : No se pudo leer la cantidad de pedidos o el texto SKU.'],
 ['작업줄의 작업 지시서 출력 버튼을 확인하지 못했습니다. 직접 눌러주세요.','Could not find the work instruction button. Click it manually.','No se encontró el botón de instrucciones de trabajo. Púlsalo manualmente.'],
 ['대상 시트 주소가 변경되어 중단했습니다.','The target sheet address changed.','Cambió la dirección de la hoja de destino.'],
 ['입력 중 다른 탭으로 이동하여 중단했습니다.','The sheet tab is no longer active.','La pestaña de la hoja ya no está activa.'],
 ['시트의 열린 대화상자를 닫고 다시 실행하세요.','Close the open dialog in Sheets and retry.','Cierra el cuadro de diálogo de Sheets y vuelve a intentarlo.'],
 ['셀 주소 입력란이 준비되지 않았습니다. 시트 로딩과 편집 권한을 확인하세요.','The cell address box is not ready. Check sheet loading and edit access.','El cuadro de dirección de celda no está listo. Revisa la carga y el permiso de edición.'],
 ['수식 입력란이 준비되지 않았습니다. 수식 입력줄 표시와 편집 권한을 확인하세요.','The formula bar is not ready. Make sure it is visible and you have edit access.','La barra de fórmulas no está lista. Asegúrate de que esté visible y tengas permiso de edición.'],
 ['배치 체크 → 라벨 입력 (미리보기는 선택 사항)','Select batches → Fill label (preview optional)','Selecciona lotes → Rellenar etiqueta (vista previa opcional)'],
 ['입력 중에는 시트 조작을 잠시 멈춰주세요.','Do not use the sheet while filling.','No uses la hoja mientras se rellena.'],
 ['선택한 배치를 확인하고 있습니다…','Reading selected batches…','Leyendo los lotes seleccionados…'],
 ['시트 입력 중입니다. 잠시 기다려주세요.','Filling the sheet…','Rellenando la hoja…'],
 ['실행 기록이 없습니다.','No recent activity.','Sin actividad reciente.'],
 ['시트를 준비합니다…','Preparing sheet…','Preparando la hoja…'],
 ['입력 동작 완료','Input actions finished','Acciones de entrada finalizadas'],
 ['입력 중…','Writing…','Escribiendo…'],
 ['나머지 배치는 출고 시 수동 선택','Select remaining batches manually when shipping','Selecciona los demás lotes manualmente al despachar'],
 ['QR 이미지와 운송장 번호는 인쇄 전에 확인하세요.','Check QR and tracking numbers before printing.','Revisa el QR y los números de seguimiento antes de imprimir.'],
 ['작업 지시서 출력 창을 열었습니다.','Work instruction button clicked.','Se pulsó el botón de instrucciones de trabajo.'],
 ['라벨 입력은 완료되었습니다.','Label input actions finished.','Finalizaron las acciones de entrada de la etiqueta.'],
 ['작업줄의 작업 지시서 출력을 직접 눌러주세요.','Click the work instruction button manually.','Pulsa manualmente el botón de instrucciones de trabajo.'],
 ['QR 기준 배치:','QR batch:','Lote del QR:'],['QR 기준:','QR batch:','Lote del QR:'],['배송사:','Carrier:','Transportista:'],
 ['acrossB 목록에서 배치를 먼저 체크하세요.','Select a batch first.','Selecciona primero un lote.'],
 ['acrossB 출고 주문 관리 탭에서 실행하세요.','Open the JOB_READY tab in acrossB.','Abre la pestaña JOB_READY de acrossB.'],
 ['acrossB 목록에서 실행하세요.','Open the JOB_READY tab in acrossB.','Abre la pestaña JOB_READY de acrossB.'],
 ['acrossB 탭을 열어주세요.','Open the JOB_READY tab in acrossB.','Abre la pestaña JOB_READY de acrossB.'],
 ['설치 후 acrossB 페이지를 새로고침한 뒤 다시 실행하세요.','Reload acrossB after installing, then try again.','Recarga acrossB después de instalar y vuelve a intentarlo.'],
 ['확장 프로그램 연결이 끊겼습니다. 페이지를 새로고침하세요.','Extension disconnected. Reload the page.','Extensión desconectada. Recarga la página.'],
 ['구글 시트가 아직 로딩 중입니다. 시트가 열린 뒤 다시 실행하세요.','The sheet is loading. Try again once it opens.','La hoja está cargando. Inténtalo cuando se abra.'],
 ['이미 라벨 입력 중입니다. 완료 후 다시 실행하세요.','Input is already running. Please wait.','La entrada ya está en curso. Espera.'],
 ['선택한 배치를 읽지 못했습니다.','Could not read selected batches.','No se pudieron leer los lotes seleccionados.'],
 ['선택한 배치 행을 읽지 못했습니다. 목록에서 실행하세요.','Could not read the selected row. Open the list.','No se pudo leer la fila seleccionada. Abre la lista.']
 ];
 function translate(text){
   text=String(text||'');if(language==='ko')return text;
   let result=text;
   for(const [ko,en,es] of phrases)result=result.split(ko).join(language==='en'?en:es);
   result=result.replace(/(\d+)건/g,language==='en'?'$1 orders':'$1 pedidos').replace(/(\d+(?:\.\d+)?)초/g,'$1 s');
   if(/[가-힣]/.test(result))return tri('Could not complete the action. Reopen JOB_READY and the label sheet, then retry.','No se pudo completar la acción. Abre JOB_READY y la hoja de etiquetas y vuelve a intentarlo.','작업을 완료하지 못했습니다.');
   return result;
 }
 function preview(p){return tri('Batch','Lote','배치')+': '+p.batchLabel+'\n'+tri('Batch date','Fecha del lote','배치 날짜')+': '+p.dateLabel+'\n'+tri('Orders','Pedidos','주문 수')+': '+p.count+'\n'+tri('Carrier','Transportista','배송사')+': '+p.carrier+'\nCHANNEL: '+p.channel+'\n'+p.description+'\n'+tri('QR batch','Lote del QR','QR 기준 배치')+': '+p.firstBatch;}
 root.LabelLanguage={tri,translate,preview,ready,setLanguage,subscribe,controls,get language(){return language;}};
})(globalThis);
