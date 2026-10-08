(function(root){
  'use strict';
  function readSelection(doc=document){
    const norm=root.LabelCore.normalizeText;
    if(!root.LabelCore.isSourceURL(doc.location.href)) throw new Error('acrossB 목록에서 실행하세요.');
    const checked=[...doc.querySelectorAll('input[type="checkbox"]:checked')];
    const rows=[];
    for(const cb of checked){
      // Walk up from the checkbox to the list row, not a nested badge/button.
      let container=cb.parentElement, cells;
      while(container && container!==doc.body){
        const children=[...container.children];
        if(children.length>=9 && children[0].contains(cb) && /\d{4}-\d{2}-\d{2}_\d+/.test(children[1].textContent)){
          cells=children; break;
        }
        container=container.parentElement;
      }
      if(!cells) continue;
      const code=/\d{4}-\d{2}-\d{2}_\d+/.exec(cells[1].textContent)?.[0];
      const leaves=[...cells[1].querySelectorAll('*')].filter(e=>!e.children.length);
      const customer=leaves.map(e=>norm(e.textContent)).find(t=>/brand/i.test(t)) || '';
      const service=cells[3].querySelector('[data-testid="shipping-service-secondary"]');
      const shippingText=norm(cells[3].textContent);
      const carrier=/dhl/i.test(shippingText)?'DHL eCommerce':/tiktok/i.test(shippingText)?'TikTok Shipping':norm(cells[3].firstElementChild?.textContent || shippingText);
      const count=/^([\d,]+)\s*(?:건|orders?)?$/i.exec(norm(cells[6].textContent));
      const skuLabels=[...new Set([...cells[5].querySelectorAll('*')]
        .filter(e=>!e.children.length).map(e=>norm(e.textContent))
        .filter(t=>/^[A-Za-z0-9][A-Za-z0-9._-]*\s*[xX×]\s*\d+$/.test(t)))];
      if(!count || !skuLabels.length) throw new Error(code+'의 주문 수 또는 SKU 텍스트를 읽지 못했습니다.');
      rows.push({code,customer,carrier,service:norm(service?.textContent),
        workType:norm(cells[2].textContent),warehouse:norm(cells[8].textContent),
        count:Number(count[1].replace(/,/g,'')),skuLabels});
    }
    if(checked.length && !rows.length) throw new Error('선택한 배치 행을 읽지 못했습니다. 목록에서 실행하세요.');
    return {rows,plan:root.LabelCore.buildPlan(rows)};
  }
  root.LabelExtract={readSelection};
})(globalThis);
