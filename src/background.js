'use strict';
importScripts('core.js', 'sheets-writer.js');
let running = false;
const {CONFIG, sheetURL, isSourceURL, isSheetURL, buildPlan} = LabelCore;
async function status(sourceId, text, busy = false, kind = '') {
  await chrome.storage.session.set({status: {text, busy, kind, at: Date.now()}});
  if (sourceId) { try { await chrome.tabs.sendMessage(sourceId, {type: 'STATUS', text, busy, kind}); } catch {} }
  await chrome.action.setBadgeText({text: busy ? '…' : kind === 'error' ? '!' : kind === 'ok' ? 'OK' : ''});
  await chrome.action.setBadgeBackgroundColor({color: kind === 'error' ? '#b33a3a' : '#6242d8'});
}
async function readSelection(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!isSourceURL(tab.url)) throw new Error('acrossB 출고 주문 관리 탭에서 실행하세요.');
  let result;
  try { result = await chrome.tabs.sendMessage(tabId, {type: 'READ_SELECTION'}); }
  catch { throw new Error('설치 후 acrossB 페이지를 새로고침한 뒤 다시 실행하세요.'); }
  if (!result?.ok) throw new Error(result?.error || '선택한 배치를 읽지 못했습니다.');
  return buildPlan(result.rows);
}
async function targetTab(sourceId) {
  const source = await chrome.tabs.get(sourceId);
  const tabs = await chrome.tabs.query({url: 'https://docs.google.com/spreadsheets/d/' + CONFIG.spreadsheetId + '/*'});
  const eligible = tabs.filter(t => isSheetURL(t.url, true));
  eligible.sort((a, b) => Number(b.windowId === source.windowId) - Number(a.windowId === source.windowId) || (b.lastAccessed || 0) - (a.lastAccessed || 0));
  let tab = eligible[0];
  if (!tab) tab = await chrome.tabs.create({url: sheetURL, active: true, windowId: source.windowId});
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const current = await chrome.tabs.get(tab.id);
    if (current.status === 'complete') return current;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('구글 시트가 아직 로딩 중입니다. 시트가 열린 뒤 다시 실행하세요.');
}
async function run(sourceId) {
  if (running) throw new Error('이미 라벨 입력 중입니다. 완료 후 다시 실행하세요.');
  running = true;
  let writer;
  const start = performance.now();
  try {
    const plan = await readSelection(sourceId);
    await status(sourceId, `${plan.batchLabel} · ${plan.count}건 — 시트를 준비합니다…`, true);
    const target = await targetTab(sourceId);
    writer = new SheetsWriter(target.id);
    await writer.connect();
    for (const item of plan.writes) {
      await status(sourceId, plan.batchLabel + ' · ' + plan.carrier + ' · ' + item.cell + ' 입력 중…', true);
      await writer.write(item.cell, item.value);
    }
    const seconds = ((performance.now() - start) / 1000).toFixed(1);
    let text = `${plan.batchLabel} · ${plan.count}건 입력 동작 완료 (${seconds}초)\nQR 기준: ${plan.firstBatch}${plan.batches.length > 1 ? ' · 나머지 배치는 출고 시 수동 선택' : ''}\nQR 이미지와 운송장 번호는 인쇄 전에 확인하세요.`;

    await status(sourceId, text, true, 'ok');
    {
      // Finish sheet interaction before returning to acrossB. Failure of this
      // optional follow-up must not be reported as a failed label write.
      await writer.close(); writer = null;
      try {
        const source = await chrome.tabs.get(sourceId);
        if (!isSourceURL(source.url)) throw new Error('acrossB 탭 주소가 변경되었습니다.');
        await chrome.tabs.update(sourceId, {active: true});
        await chrome.windows.update(source.windowId, {focused: true});
        const opened = await chrome.tabs.sendMessage(sourceId, {type: 'OPEN_WORK_INSTRUCTIONS', plan});
        if (!opened?.ok) throw new Error(opened?.error || '작업 지시서 창을 확인하지 못했습니다.');
        text += '\n작업 지시서 출력 창을 열었습니다.';
        await status(sourceId, text, false, 'ok');
      } catch (error) {
        text += `\n라벨 입력은 완료되었습니다. ${error.message}\n작업줄의 작업 지시서 출력을 직접 눌러주세요.`;
        await status(sourceId, text, false, 'warning');
      }
    }
    return {ok: true, text};
  } catch (e) {
    const text = (e.message || String(e));
    await status(sourceId, text, false, 'error');

    throw new Error(text);
  } finally { if (writer) await writer.close(); running = false; }
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  const fromPopup = !sender.tab && sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL('popup.html');
  const fromSource = sender.id === chrome.runtime.id && sender.tab && isSourceURL(sender.tab.url);
  if (message.type === 'RUN' && (fromSource || fromPopup)) {
    run(fromSource ? sender.tab.id : message.tabId).then(reply, error => reply({ok: false, error: error.message})); return true;
  }
  if (message.type === 'PREVIEW' && fromPopup) {
    readSelection(message.tabId).then(plan => reply({ok: true, plan}), error => reply({ok: false, error: error.message})); return true;
  }
});
chrome.commands.onCommand.addListener(async command => {
  if (command !== 'fill-label') return;
  const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
  if (tab?.id) { try { await run(tab.id); } catch {} }
});
