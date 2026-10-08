/* Trusted browser input. No Sheets private API, OAuth token, clipboard or network access. */
(function (root) {
  'use strict';
  const {CONFIG, isSheetURL, normalizeText, targetRange, sameSelection} = root.LabelCore;
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  class SheetsWriter {
    constructor(tabId) { this.tabId = tabId; this.attached = false; this.token = crypto.randomUUID(); }
    async dom(func, args = []) {
      const result = await chrome.scripting.executeScript({target: {tabId: this.tabId}, func, args});
      if (result.length !== 1) throw new Error('시트 편집 화면을 확인할 수 없습니다.');
      return result[0].result;
    }
    async assertTarget(timeout = 25000) {
      const deadline = Date.now() + timeout;
      let state;
      do {
        const tab = await chrome.tabs.get(this.tabId);
        if (!isSheetURL(tab.url, true)) throw new Error('[SHEET_ADDRESS] 대상 시트 주소가 변경되어 중단했습니다.');
        if (!tab.active) throw new Error('[TAB_INACTIVE] 입력 중 다른 탭으로 이동하여 중단했습니다.');
        state = await this.dom(() => {
          const visible = el => {
            if (!el) return false;
            const r = el.getBoundingClientRect(), style = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          };
          const name = document.querySelector('#t-name-box');
          const formula = document.querySelector('#t-formula-bar-input .cell-input[contenteditable="true"], #t-formula-bar-input [contenteditable="true"]');
          const dialog = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].some(visible);
          return {name: visible(name) && !name.disabled, formula: visible(formula), dialog};
        });
        if (state.name && state.formula && !state.dialog) return;
        await pause(250);
      } while (Date.now() < deadline);
      if (state?.dialog) throw new Error('[SHEET_DIALOG] 시트의 열린 대화상자를 닫고 다시 실행하세요.');
      if (!state?.name) throw new Error('[SHEET_NAME_BOX] 셀 주소 입력란이 준비되지 않았습니다. 시트 로딩과 편집 권한을 확인하세요.');
      throw new Error('[SHEET_FORMULA_BAR] 수식 입력란이 준비되지 않았습니다. 수식 입력줄 표시와 편집 권한을 확인하세요.');
    }
    async connect() {
      await chrome.tabs.update(this.tabId, {active: true});
      const tab = await chrome.tabs.get(this.tabId);
      await chrome.windows.update(tab.windowId, {focused: true});
      await this.assertTarget();
      try { await chrome.debugger.attach({tabId: this.tabId}, '1.3'); this.attached = true; }
      catch { throw new Error('시트 자동 입력에 연결하지 못했습니다. 개발자 도구를 닫고 다시 실행하세요. 회사 정책으로 debugger 권한이 제한되면 사용할 수 없습니다.'); }
    }
    async command(method, params) {
      if (!this.attached) throw new Error('자동 입력 연결이 종료되었습니다.');
      return chrome.debugger.sendCommand({tabId: this.tabId}, method, params);
    }
    async key(key, code, virtualKey, modifiers = 0) {
      const fields = {key, code, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey, modifiers};
      const enterText = key === 'Enter' && modifiers === 0 ? {text: '\r', unmodifiedText: '\r'} : {};
      await this.command('Input.dispatchKeyEvent', {type: 'keyDown', ...fields, ...enterText});
      await this.command('Input.dispatchKeyEvent', {type: 'keyUp', ...fields});
    }
    async typeCellText(text, careful = true) {
      // Sheets handles key events to update its data model. Input.insertText alone
      // can update the visible editor without updating the stored cell value.
      let firstCharacter = true;
      for (const character of text) {
        if (character === '\n') {
          // A cell line break needs the Enter text event as well as the shortcut.
          // The old key helper omitted text whenever Ctrl was pressed.
          await this.command('Input.dispatchKeyEvent', {type:'rawKeyDown',key:'Control',code:'ControlLeft',windowsVirtualKeyCode:17,modifiers:2});
          try {
            await this.command('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,modifiers:2,text:'\r',unmodifiedText:'\r'});
            await this.command('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,modifiers:2});
          } finally {
            await this.command('Input.dispatchKeyEvent', {type:'keyUp',key:'Control',code:'ControlLeft',windowsVirtualKeyCode:17,modifiers:0});
          }
          await pause(180);
          continue;
        }
        const upper = character.toUpperCase();
        const letter = /^[A-Za-z]$/.test(character);
        const digit = /^[0-9]$/.test(character);
        const fields = {key: character, ...(letter ? {code: `Key${upper}`, windowsVirtualKeyCode: upper.charCodeAt(0)} :
          digit ? {code: `Digit${character}`, windowsVirtualKeyCode: character.charCodeAt(0)} : {})};
        await this.command('Input.dispatchKeyEvent', {type: 'keyDown', ...fields, text: character, unmodifiedText: character});
        await this.command('Input.dispatchKeyEvent', {type: 'keyUp', ...fields});
        if (careful) await pause(firstCharacter ? 150 : 12);
        firstCharacter = false;
      }
    }
    async readCurrent() {
      return this.dom(() => ({
        cell: document.querySelector('#t-name-box')?.value,
        text: document.querySelector('#t-formula-bar-input .cell-input')?.innerText ?? null,
        nameFocused: document.activeElement?.id === 't-name-box'
      }));
    }
    async go(cell) {
      const range = targetRange(cell);
      if (!/^[A-C](?:[1-9]|1[0-2])$/.test(cell) && !['B2:C2','B4:C4','A6:C6','A8:C8'].includes(cell)) throw new Error('허용되지 않은 셀 주소입니다.');
      await this.assertTarget();
      await this.key('Escape', 'Escape', 27);
      const focused = await this.dom(() => {
        const el = document.querySelector('#t-name-box');
        if (!el) return false;
        el.focus(); el.select(); return document.activeElement === el;
      });
      if (!focused) throw new Error('셀 주소 입력란을 선택하지 못했습니다.');
      await this.command('Input.insertText', {text: range});
      await this.key('Enter', 'Enter', 13);
      for (let attempt = 0; attempt < 25; attempt++) {
        await pause(60);
        const current = await this.readCurrent();
        if (sameSelection(current.cell, range) && !current.nameFocused && current.text !== null) {
          // Allow the formula bar to follow a changed grid selection.
          await pause(80);
          const settled = await this.readCurrent();
          if (sameSelection(settled.cell, range) && !settled.nameFocused) return normalizeText(settled.text);
        }
      }
      throw new Error(`${cell} 셀로 이동하지 못했습니다.`);
    }
    async write(cell, text) {
      if (!['B2', 'B2:C2', 'A4', 'B4', 'A6', 'A8', 'A12','B4:C4','A6:C6','A8:C8'].includes(cell)) throw new Error('이 셀은 수정할 수 없습니다.');
      if (typeof text !== 'string' || text.length > 12000 || /^[=+@]/.test(text)) throw new Error('입력값 형식이 올바르지 않습니다.');
      const careful = cell.split(':')[0] === 'A6';
      await this.go(cell);
      const editPoint = await this.dom(() => {
        const el = document.querySelector('#t-formula-bar-input .cell-input[contenteditable="true"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        return {x: r.left + Math.min(20, r.width / 2), y: r.top + Math.min(10, r.height / 2)};
      });
      if (!editPoint) throw new Error(`${cell} 편집란을 선택하지 못했습니다.`);
      await this.assertTarget();
      // Focusing/changing a DOM selection alone can change the visible formula bar
      // without entering Sheets' edit state. Use trusted mouse and keyboard input.
      await this.command('Input.dispatchMouseEvent', {type: 'mousePressed', ...editPoint, button: 'left', clickCount: 1});
      await this.command('Input.dispatchMouseEvent', {type: 'mouseReleased', ...editPoint, button: 'left', clickCount: 1});
      await pause(careful ? 200 : 40);
      const editorFocused = await this.dom(() => document.activeElement?.matches('#t-formula-bar-input .cell-input') || false);
      if (!editorFocused) throw new Error(`${cell} 편집 모드에 진입하지 못했습니다.`);
      // Clear in the same edit session; do not commit an empty A6/onEdit.
      await this.command('Input.dispatchKeyEvent', {type:'rawKeyDown',key:'Control',code:'ControlLeft',windowsVirtualKeyCode:17,modifiers:2});
      try { await this.key('a', 'KeyA', 65, 2); }
      finally { await this.command('Input.dispatchKeyEvent', {type:'keyUp',key:'Control',code:'ControlLeft',windowsVirtualKeyCode:17,modifiers:0}); }
      await pause(careful ? 100 : 20);
      await this.key('Backspace', 'Backspace', 8);
      await pause(careful ? 200 : 40);
      if (text) await this.typeCellText(text, careful);
      await pause(careful ? 150 : 30);
      await this.key('Enter', 'Enter', 13);
      await pause(careful ? 180 : 60);
    }

    async close() {
      if (this.attached) { this.attached = false; try { await chrome.debugger.detach({tabId: this.tabId}); } catch {} }
    }
  }
  root.SheetsWriter = SheetsWriter;
  if (typeof module !== 'undefined') module.exports = SheetsWriter;
})(globalThis);
