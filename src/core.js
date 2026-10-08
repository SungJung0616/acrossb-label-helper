(function (root) {
  'use strict';
  const CONFIG = Object.freeze(root.LabelSettings || {sourceOrigin:"https://example.invalid",spreadsheetId:"YOUR_SPREADSHEET_ID",sheetId:"YOUR_SHEET_GID",sheetName:"Label"});
  const sheetURL = `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/edit?gid=${CONFIG.sheetId}#gid=${CONFIG.sheetId}`;
  const LABEL_RANGES = Object.freeze({B2: 'B2:C2', A4: 'A4', B4: 'B4:C4', A6: 'A6:C6', A8: 'A8:C8', A12: 'A12'});
  function targetRange(address) {
    if (LABEL_RANGES[address]) return LABEL_RANGES[address];
    if (Object.values(LABEL_RANGES).includes(address)) return address;
    if (address === 'A5') return 'A5:C5';
    if (address === 'B7') return 'B7:C7';
    return address;
  }
  function sameSelection(actual, address) {
    const expected = targetRange(address);
    const normalized = String(actual || '').replace(/\$/g, '').toUpperCase();
    // Sheets may show the anchor alone or the full merged selection.
    return normalized === expected || normalized === expected.split(':')[0];
  }
  function fail(message) { throw new Error(message); }
  function isSourceURL(url) {
    try { const u = new URL(url); return u.origin === CONFIG.sourceOrigin && u.pathname === '/flow/work-groups' && u.searchParams.get('tab') === 'JOB_READY'; }
    catch { return false; }
  }
  function isSheetURL(url, requireGid = false) {
    try {
      const u = new URL(url);
      const gid = new URLSearchParams(u.hash.slice(1)).get('gid') || u.searchParams.get('gid');
      return u.origin === 'https://docs.google.com' && u.pathname === `/spreadsheets/d/${CONFIG.spreadsheetId}/edit` && (!requireGid || gid === CONFIG.sheetId);
    } catch { return false; }
  }
  function normalizeText(value) { return String(value ?? '').replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').trim(); }
  function parseSku(label) {
    const match = /^([A-Za-z0-9][A-Za-z0-9._-]*)\s*[xX×]\s*([1-9]\d*)$/.exec(normalizeText(label));
    if (!match || !Number.isSafeInteger(Number(match[2]))) fail(`SKU/수량을 확인할 수 없습니다: ${label}`);
    return {sku: match[1].toUpperCase(), quantity: Number(match[2])};
  }
  function skuKey(items) {
    const map = new Map();
    for (const item of items) {
      map.set(item.sku, (map.get(item.sku) || 0) + item.quantity);
      if (!Number.isSafeInteger(map.get(item.sku))) fail('SKU 수량이 너무 큽니다.');
    }
    return [...map].sort(([a], [b]) => a.localeCompare(b)).map(([sku, qty]) => `${sku} x${qty}`).join('\n');
  }
  function buildPlan(rows) {
    if (!Array.isArray(rows) || !rows.length) fail('acrossB 목록에서 배치를 먼저 체크하세요.');
    const batches = rows.map(row => ({...row, number: row.code.split('_').pop(),
      items: row.skuLabels.map(parseSku)}));
    const first = batches[0];
    // Use the source batch date, never the computer's date or timezone.
    const batchDate = first.code.split('_')[0];
    const [year, month, day] = batchDate.split('-');
    const dateLabel = month + '/' + day + '/' + year;
    const count = batches.reduce((sum, b) => sum + b.count, 0);
    const batchLabel = batches.map(b => b.number).join(' +');
    const description = first.items.map(i => i.sku + ' x' + i.quantity).join('\n');
    const carrier = [...new Set(batches.map(b => b.carrier))].join(' + ');
    const channel = /dhl/i.test(first.carrier) ? 'DHL' : /tiktok/i.test(first.carrier) ? 'TIKTOK' : first.carrier;
    return {
      batches: batches.map(b => ({code:b.code, number:b.number, count:b.count})),
      batchLabel, batchDate, dateLabel, description, count, carrier, channel, firstBatch:first.number,
      writes:[{cell:'B2',value:dateLabel},{cell:'B4',value:batchLabel},{cell:'A4',value:channel},
        {cell:'A8',value:'1 - ' + count},{cell:'A12',value:String(count)},
        {cell:'A6',value:description}]
    };
  }

  root.LabelCore = Object.freeze({CONFIG, LABEL_RANGES, targetRange, sameSelection, sheetURL, isSourceURL, isSheetURL, normalizeText, parseSku, skuKey, buildPlan});
  if (typeof module !== 'undefined') module.exports = root.LabelCore;
})(globalThis);
