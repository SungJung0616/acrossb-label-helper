(() => {
  'use strict';
  if (document.getElementById('sung-label-helper')) return;
  const host = document.createElement('div');
  host.id = 'sung-label-helper';
  host.style.cssText = 'display:none;position:fixed;bottom:24px;right:28px;z-index:2147483646;';
  const shadow = host.attachShadow({mode: 'closed'});
  shadow.innerHTML = `<style>
    :host{font-family:Arial,"Malgun Gothic",sans-serif;color:#182332}
    .box{width:290px;background:#fff;border:1px solid #dce2eb;border-radius:16px;padding:14px;box-shadow:0 8px 28px #10182826}
    .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-weight:700;font-size:14px}
    button{cursor:pointer;border:0;font:inherit;border-radius:9px}button:disabled{opacity:.6;cursor:wait}
    #run{width:100%;background:#6242d8;color:white;padding:12px;font-size:14px;font-weight:700}
    #preview{background:#f0edf9;color:#46328f;padding:5px 8px;font-size:12px}
    #status{white-space:pre-line;overflow-wrap:anywhere;font-size:12px;line-height:1.6;margin-top:9px;color:#526071;max-height:270px;overflow:auto}
    .error{color:#ae2929!important}.ok{color:#176a4b!important}
    small{display:block;margin-top:6px;font-size:10px;color:#758294}
    .languages{display:flex;justify-content:flex-end;gap:5px;margin-bottom:12px}
    .languages button{padding:5px 9px;background:#f3f4f7;color:#657084;font-size:11px}
    .languages button[aria-pressed="true"]{background:#6242d8;color:white}
  </style><div class="box"><div class="languages" id="languages" aria-label="Language"></div><div class="top"><span id="title"></span><button id="preview"></button></div>
  <button id="run">Fill label / Rellenar etiqueta / 라벨 입력</button><div id="status" role="status" aria-live="polite">배치 체크 → 라벨 입력 (미리보기는 선택 사항)</div><small>Alt + Shift + L · 입력 중에는 시트 조작을 잠시 멈춰주세요.</small></div>`;
  document.documentElement.appendChild(host);
  const status = shadow.getElementById('status'), run = shadow.getElementById('run');
  const L=LabelLanguage;
  let currentMessage='배치 체크 → 라벨 입력 (미리보기는 선택 사항)', currentKind='', currentPlan=null;
  function render(){
    shadow.getElementById('title').textContent=L.tri('SUNG Labels','Etiquetas SUNG','SUNG 라벨 채우기')+' v0.1.14';
    shadow.getElementById('preview').textContent=L.tri('Preview','Vista previa','미리보기');
    run.textContent=L.tri('Fill label','Rellenar etiqueta','선택한 배치 → 라벨 입력');
    shadow.querySelector('small').textContent='Alt + Shift + L · '+L.tri('Do not use the sheet while filling.','No uses la hoja mientras se rellena.','입력 중에는 시트 조작을 잠시 멈춰주세요.');
    status.textContent=currentPlan?L.preview(currentPlan):L.translate(currentMessage);status.className=currentKind;
  }
  function show(message,kind=''){currentMessage=message;currentKind=kind;currentPlan=null;render();}
  function preview(){try{currentPlan=LabelExtract.readSelection().plan;currentKind='';render();}catch(e){show(e.message,'error');}}
  L.controls(shadow.getElementById('languages'));L.subscribe(render);L.ready.then(render);render();
  shadow.getElementById('preview').addEventListener('click', preview);
  run.addEventListener('click', async () => {
    run.disabled = true;
    show('선택한 배치를 확인하고 있습니다…');
    try {
      const response = await chrome.runtime.sendMessage({type: 'RUN'});
      if (!response?.ok) throw new Error(response?.error || '확장 프로그램 연결이 끊겼습니다. 페이지를 새로고침하세요.');
    } catch (e) { show(e.message, 'error'); }
    finally { run.disabled = false; }
  });
  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (_sender.id !== chrome.runtime.id) return;
    if (message.type === 'OPEN_WORK_INSTRUCTIONS') {
      LabelWorkInstructions.openWorkInstructions(message.plan).then(reply,
        error => reply({ok: false, error: error.message}));
      return true;
    }
    if (message.type === 'READ_SELECTION') {
      try { reply({ok: true, ...LabelExtract.readSelection()}); }
      catch (e) { reply({ok: false, error: e.message}); }
    }
    if (message.type === 'STATUS') { run.disabled = !!message.busy; show(message.text, message.kind); reply({ok: true}); }
  });
  function visibility() { host.style.display = LabelCore.isSourceURL(location.href) ? '' : 'none'; }
  const observer = new MutationObserver(visibility);
  observer.observe(document.body, {childList:true, subtree:true});
  addEventListener('popstate', visibility);
  setInterval(visibility, 250); visibility();
  show('배치 체크 → 라벨 입력 (미리보기는 선택 사항)');
})();
