(() => {
  const {defaults,valid,matches,normalizeFields}=ElementInspectorSettings;
  let copyFields=normalizeFields(),captureEnabled=false,captureGeneration=0,pendingCapture=null;
  let shortcut=defaults, active=false, host, shadow, highlight, tooltip, target, pointer, frame, toastTimer, copying=false, pendingRequest=null;
  chrome.storage.local.get(['shortcut','copyFields','captureEnabled']).then(data=>{if(valid(data.shortcut)) shortcut=data.shortcut;copyFields=normalizeFields(data.copyFields);captureEnabled=Boolean(data.captureEnabled);}).catch(()=>{});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    if(changes.shortcut)shortcut=valid(changes.shortcut.newValue)?changes.shortcut.newValue:defaults;
    if(changes.copyFields)copyFields=normalizeFields(changes.copyFields.newValue);
    if(changes.captureEnabled)captureEnabled=Boolean(changes.captureEnabled.newValue);
  });
  function selector(el) {
    const root=el.getRootNode();
    const unique=s=>{try{return root.querySelectorAll(s).length===1;}catch{return false;}};
    if(el.id && unique('#'+CSS.escape(el.id))) return '#'+CSS.escape(el.id);
    const parts=[];
    for(let node=el;node instanceof Element;node=node.parentElement) {
      let part=CSS.escape(node.localName);
      if(node.id) part+='#'+CSS.escape(node.id);
      else part+=[...node.classList].map(c=>'.'+CSS.escape(c)).join('');
      if(node.parentElement) {
        const siblings=[...node.parentElement.children].filter(x=>x.localName===node.localName);
        if(siblings.length>1) part+=`:nth-of-type(${siblings.indexOf(node)+1})`;
      }
      parts.unshift(part);
      if(unique(parts.join(' > '))) break;
    }
    return parts.join(' > ');
  }
  function description(el) {
    const local=selector(el), root=el.getRootNode();
    // Shadow boundaries cannot be represented by a single CSS selector.
    return root instanceof ShadowRoot ? `${description(root.host)} >>> ${local}` : local;
  }
  const compact=(text,limit=240)=>{
    const value=String(text || '').replace(/\s+/g,' ').trim();
    return value.length>limit ? value.slice(0,limit)+'…' : value;
  };
  function visibleText(el,limit=240) {
    // Read rendered text nodes, excluding form values even inside a copied row.
    if(!el)return '';
    const excluded='input,textarea,select,script,style,noscript,[contenteditable]:not([contenteditable="false"])';
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    const parts=[];
    let node,length=0;
    while((node=walker.nextNode())) {
      const owner=node.parentElement;
      if(!owner || owner.closest(excluded) || !owner.getClientRects().length || getComputedStyle(owner).visibility==='hidden')continue;
      const text=compact(node.textContent);
      if(text){parts.push(text);length+=text.length+1;if(length>limit)break;}
    }
    return compact(parts.join(' '),limit);
  }
  function labelledBy(el) {
    const root=el.getRootNode();
    return compact((el.getAttribute('aria-labelledby') || '').split(/\s+/)
      .map(id=>id && root.getElementById?.(id)).filter(Boolean).map(node=>visibleText(node)).join(' '),120);
  }
  function parent(el){return el.parentElement || (el.getRootNode() instanceof ShadowRoot ? el.getRootNode().host : null);}
  function areaTitle(el) {
    const heading='h1,h2,h3,h4,h5,h6,[role="heading"],legend';
    for(let node=el;node;node=parent(node)) {
      if(node.matches(heading) && visibleText(node))return visibleText(node,120);
      if(node!==el) {
        const label=labelledBy(node) || (node.matches('section,article,main,aside,nav,fieldset,[role="region"],[role="dialog"],[role="group"]') && compact(node.getAttribute('aria-label'),120));
        if(label)return label;
      }
      // Only preceding sibling headings (or their header), never a later/unrelated section.
      for(let sibling=node.previousElementSibling;sibling;sibling=sibling.previousElementSibling) {
        const title=sibling.matches(heading)?sibling:(sibling.matches('header')?sibling.querySelector(heading):null);
        if(title && visibleText(title))return visibleText(title,120);
      }
    }
    return '(제목 없음)';
  }
  function pageUrl() {
    const url=new URL(location.href);
    url.username='';url.password='';
    const sensitive=/token|password|secret|credential|authorization|session|signature|api.?key|^code$|^key$/i;
    const clean=params=>{for(const key of [...params.keys()])if(sensitive.test(key))params.delete(key);return params.toString();};
    clean(url.searchParams);
    const hash=url.hash.slice(1), split=hash.indexOf('?');
    if(split>=0) {
      const query=clean(new URLSearchParams(hash.slice(split+1)));
      url.hash=hash.slice(0,split)+(query?'?'+query:'');
    } else if(hash.includes('=')) url.hash=clean(new URLSearchParams(hash));
    return url.href;
  }
  function clipboardText(el,css) {
    const lines=[],add=(key,label,value)=>{if(copyFields[key])lines.push(`${label}: ${value()}`);};
    add('pageUrl','페이지 URL',pageUrl);
    add('documentTitle','문서 제목',()=>compact(document.title,200) || '(제목 없음)');
    add('areaTitle','영역 제목',()=>areaTitle(el));
    if(window!==window.top)add('frame','iframe',()=>`${location.origin}${location.pathname}`);
    const name=(copyFields.elementName || copyFields.elementText || copyFields.rowText)?labelledBy(el) || compact(el.getAttribute('aria-label') || el.getAttribute('alt')):'';
    const text=(copyFields.elementText || copyFields.rowText || copyFields.elementName)?visibleText(el) || name:'';
    if(copyFields.rowText){
      const row=el.closest('li,tr,[role="row"],[role="listitem"]');
      if(row && (!copyFields.elementText || (row!==el && visibleText(row)!==text)))add('rowText','항목 텍스트',()=>visibleText(row) || '(텍스트 없음)');
    }
    if(name && (!copyFields.elementText || name!==text))add('elementName','요소 이름',()=>name);
    add('elementText','요소 텍스트',()=>text || '(텍스트 없음)');
    add('tag','요소',()=>el.localName);
    add('id','id',()=>compact(el.id) || '(없음)');
    add('class','class',()=>compact([...el.classList].join(' ')) || '(없음)');
    add('css','CSS',()=>css);
    return lines.join('\n');
  }
  function mount() {
    clearTimeout(toastTimer);
    if(host) return;
    host=document.createElement('devis-element-inspector');
    host.style.cssText='all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;';
    shadow=host.attachShadow({mode:'open'});
    shadow.innerHTML=`<style>
      :host{color-scheme:light} *{box-sizing:border-box}
      [data-highlight]{position:fixed;border:2px solid #1262db;background:rgb(18 98 219 / .10);pointer-events:none}
      [data-tooltip]{position:fixed;max-width:calc(100vw - 16px);width:max-content;max-height:calc(100vh - 16px);overflow:hidden;padding:10px 12px;background:#16243a;color:#fff;border-radius:4px;font:13px/1.5 system-ui,sans-serif;overflow-wrap:anywhere;white-space:pre-wrap;box-shadow:0 2px 8px #0003}
      strong{display:block;font-weight:600} code{font:12px/1.5 ui-monospace,monospace} .hint{margin-top:6px;color:#cbd8eb}
    </style><div data-highlight hidden></div><div data-tooltip role="status" hidden><strong>요소를 가리키세요</strong><div>클릭하여 식별자 복사 · Esc 종료</div></div>`;
    highlight=shadow.querySelector('[data-highlight]'); tooltip=shadow.querySelector('[data-tooltip]');
    document.documentElement.append(host);
  }
  function place() {
    if(!tooltip) return;
    const x=pointer?.x ?? 16,y=pointer?.y ?? 16;
    tooltip.style.left='8px'; tooltip.style.top='8px';
    const r=tooltip.getBoundingClientRect();
    tooltip.style.left=`${Math.max(8,Math.min(x+18,innerWidth-r.width-8))}px`;
    tooltip.style.top=`${Math.max(8,Math.min(y+22,innerHeight-r.height-8))}px`;
  }
  function draw() {
    frame=null;
    if(!active || !pointer) return;
    let el=document.elementFromPoint(pointer.x,pointer.y);
    while(el?.shadowRoot) {const nested=el.shadowRoot.elementFromPoint(pointer.x,pointer.y);if(!nested || nested===el) break;el=nested;}
    if(!el || el===host) {target=null;highlight.hidden=true;return;}
    target=el;tooltip.hidden=false;
    const r=el.getBoundingClientRect();
    highlight.hidden=false;
    Object.assign(highlight.style,{left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`});
    tooltip.replaceChildren();
    const heading=document.createElement('strong');heading.textContent=el.localName;
    const details=document.createElement('div');details.textContent=`id: ${el.id || '(없음)'}\nclass: ${[...el.classList].join(' ') || '(없음)'}`;
    const code=document.createElement('code');code.textContent=description(el);
    const hint=document.createElement('div');hint.className='hint';hint.textContent='클릭하여 식별자 복사 · Esc 종료';
    tooltip.append(heading,details,code,hint);place();
  }
  function schedule(){if(active && !frame) frame=requestAnimationFrame(draw);}
  function stop(remove=true) {
    active=false;copying=false;target=null;
    if(frame) cancelAnimationFrame(frame); frame=null;
    if(remove){clearTimeout(toastTimer);host?.remove();host=null;}
  }
  function setActive(value){if(!value){if(active)stop();return;}if(active)return;mount();active=true;draw();place();}
  chrome.runtime.sendMessage({type:'element-inspector:state'}).then(reply=>{if(!pendingRequest)setActive(reply.active);}).catch(()=>{});
  function sendState(value) {
    const requestId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);pendingRequest=requestId;
    chrome.runtime.sendMessage({type:'element-inspector:toggle',active:value,requestId})
      .catch(()=>{}).finally(()=>{if(pendingRequest===requestId)pendingRequest=null;});
  }
  function toggle(){captureGeneration++;pendingCapture=null;const next=!active;setActive(next);sendState(next);}
  function editable(e){return e.composedPath().some(n=>n instanceof Element && (n.matches('input,textarea,select') || n.isContentEditable));}
  window.addEventListener('keydown',e=>{
    if((active || host) && e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();captureGeneration++;pendingCapture=null;stop();sendState(false);return;}
    if(matches(e,shortcut) && (active || !editable(e))){e.preventDefault();e.stopImmediatePropagation();toggle();}
  },true);
  window.addEventListener('pointermove',e=>{pointer={x:e.clientX,y:e.clientY};schedule();},true);
  window.addEventListener('pointerout',e=>{if(!e.relatedTarget){pointer=null;target=null;if(active){highlight.hidden=true;tooltip.hidden=true;}}},true);
  window.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);
  // Block the complete pointer sequence; a mousedown business handler must not run either.
  for(const type of ['pointerdown','mousedown','pointerup','mouseup','click','auxclick','dblclick','contextmenu']) {
    window.addEventListener(type,e=>{
      if(!active) return;
      e.preventDefault();e.stopImmediatePropagation();
      if(type!=='click' || e.button!==0 || copying) return;
      pointer={x:e.clientX,y:e.clientY};draw();
      if(!target) return;
      copying=true;
      const css=description(target),text=clipboardText(target,css);
      if(!text){copying=false;tooltip.textContent='선택한 정보가 이 요소에 없습니다. 다른 요소를 선택하거나 복사 설정을 바꿔주세요.';place();return;}
      const selectedElement=target,generation=++captureGeneration;
      const copied=writeClipboard(text);
      copying=false;
      if(copied){
        sendState(false);stop(false);highlight.hidden=true;
        tooltip.textContent=`복사했습니다\n${css}`;place();
        if(captureEnabled)void captureElement(selectedElement,text,css,generation);
        else toastTimer=setTimeout(()=>stop(),1800);
      }else{tooltip.textContent=`복사하지 못했습니다. 브라우저의 클립보드 권한을 확인하고 다시 클릭하세요.\n${css}`;place();}

    },true);
  }
  function writeClipboard(text){
    const previous=document.activeElement,selection=window.getSelection();
    const ranges=selection?[...Array(selection.rangeCount)].map((_,i)=>selection.getRangeAt(i).cloneRange()):[];
    const input=document.createElement('textarea');input.value=text;input.style.cssText='position:fixed;left:-9999px;top:0';
    shadow.append(input);input.focus({preventScroll:true});input.select();
    let copied=false;try{copied=document.execCommand('copy');}catch{}
    input.remove();previous?.focus?.({preventScroll:true});
    try{selection?.removeAllRanges();ranges.forEach(r=>selection.addRange(r));}catch{}
    return copied;
  }
  function captureGeometry(el){
    const r=el.getBoundingClientRect();
    return {rect:{x:r.x,y:r.y,width:r.width,height:r.height},viewport:{width:innerWidth,height:innerHeight,scrollX,scrollY,scale:visualViewport?.scale || 1}};
  }
  async function captureElement(el,text,css,generation){
    pendingCapture={el,generation};
    host.style.setProperty('visibility','hidden','important');
    // Let Chrome paint without inspector highlights before capturing the tab.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(generation!==captureGeneration || !host)return;
    const geometry=captureGeometry(el);
    let result;
    try{result=await chrome.runtime.sendMessage({type:'element-inspector:capture',...geometry,generation,text});}
    catch{result={ok:false,error:'캡처를 마치지 못했습니다. 페이지를 새로고침하고 다시 시도하세요.'};}
    if(generation!==captureGeneration || !host)return;
    pendingCapture=null;host.style.visibility='';
    if(result?.ok){
      const combined=text+(result.publicId?`\nPicklog 캔버스 ID: ${result.publicId}\nPicklog 캔버스: ${result.url}`:'');
      const copied=result.publicId && document.hasFocus() && writeClipboard(combined);
      tooltip.textContent=result.publicId?(copied?`캡처를 업로드하고 참조 ID를 복사했습니다\n${result.publicId}`:`캡처를 업로드했습니다\n${result.publicId}`):`이미지를 캡처했습니다\n${result.width} × ${result.height}px`;
      const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;margin-top:8px;pointer-events:auto';
      const button=document.createElement('button');button.type='button';button.textContent='이미지 보기·복사';
      const style='pointer-events:auto;min-height:36px;padding:6px 10px;color:#16243a;background:white;border:0;border-radius:3px;cursor:pointer;font:13px system-ui';button.style.cssText=style;
      button.addEventListener('click',async()=>{try{const opened=await chrome.runtime.sendMessage({type:'element-inspector:open-preview',handle:result.handle});if(!opened?.ok)button.textContent=opened?.error || '요소를 다시 캡처하세요.';}catch{button.textContent='요소를 다시 캡처하세요.';}});actions.append(button);
      if(result.publicId){const copy=document.createElement('button');copy.type='button';copy.textContent='참조 포함 다시 복사';copy.style.cssText=style;copy.addEventListener('click',()=>{copy.textContent=writeClipboard(combined)?'복사했습니다':'다시 시도해주세요';});actions.append(copy);}
      tooltip.append(actions);
    }else tooltip.textContent=result?.error || '캡처를 마치지 못했습니다. 요소 정보는 복사했습니다.';
    place();toastTimer=setTimeout(()=>stop(),12000);
  }
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(message.type==='element-inspector:capture-progress'){if(pendingCapture?.generation===message.generation && host){host.style.visibility='';tooltip.textContent='이미지를 저장하고 있습니다…';place();}reply({ok:true});return;}
    if(message.type==='element-inspector:validate-capture'){reply({valid:Boolean(pendingCapture?.el?.isConnected && pendingCapture.generation===message.generation),...(pendingCapture?captureGeometry(pendingCapture.el):{})});return;}
    if(message.type==='element-inspector:set'){if(!pendingRequest || message.requestId===pendingRequest)setActive(message.active);reply({active});}
  });
})();
