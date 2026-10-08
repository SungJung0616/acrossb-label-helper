(function (root) {
  'use strict';
  const label = el => (el.textContent || '').replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim();
  const isWorkInstruction = el => /^(?:작업 지시서 출력|Print work instructions?)$/i.test(label(el));
  const visible = el => el.getClientRects().length > 0;
  function modalOpen(doc) {
    return [...doc.querySelectorAll('h1,h2,h3,[role="heading"]')]
      .some(el => visible(el) && isWorkInstruction(el));
  }
  async function openWorkInstructions(expectedPlan, doc = document, readPlan = () => root.LabelExtract.readSelection(doc).plan, timeout = 6000) {
    if (!root.LabelCore.isSourceURL(doc.location.href)) throw new Error('acrossB 목록이 변경되어 자동으로 열지 않았습니다.');
    if (modalOpen(doc)) return {ok: true, alreadyOpen: true};
    // Match only the unnumbered toolbar command, never the numbered modal action
    // or the similarly named combined picking command.
    const matches = [...doc.querySelectorAll('button')].filter(el =>
      visible(el) && isWorkInstruction(el));
    if (matches.length !== 1 || matches[0].disabled || matches[0].getAttribute('aria-disabled') === 'true') {
      throw new Error('작업줄의 작업 지시서 출력 버튼을 확인하지 못했습니다. 직접 눌러주세요.');
    }
    matches[0].click();
    return {ok: true};
  }
  root.LabelWorkInstructions = {openWorkInstructions};
  if (typeof module !== 'undefined') module.exports = root.LabelWorkInstructions;
})(globalThis);
