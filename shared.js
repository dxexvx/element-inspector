(() => {
  const defaults = {code:'KeyE', altKey:true, shiftKey:true, ctrlKey:false, metaKey:false};
  function valid(s) {
    return s && /^(Key[A-Z]|Digit[0-9])$/.test(s.code) && (s.ctrlKey || s.metaKey || s.altKey) && ['altKey','shiftKey','ctrlKey','metaKey'].every(k=>typeof s[k]==='boolean');
  }
  function label(s) {
    return [s.ctrlKey && 'Ctrl',s.metaKey && 'Command',s.altKey && 'Alt',s.shiftKey && 'Shift',s.code.replace(/^(Key|Digit)/,'')].filter(Boolean).join(' + ');
  }
  function matches(e,s) {
    return !e.repeat && !e.isComposing && e.code===s.code && ['altKey','shiftKey','ctrlKey','metaKey'].every(k=>e[k]===s[k]);
  }
  const fields=[
    ['pageUrl','페이지 URL'],['documentTitle','문서 제목'],['areaTitle','영역 제목'],
    ['elementText','요소 텍스트'],['rowText','항목 텍스트'],['elementName','요소 이름'],
    ['tag','요소 태그'],['id','id'],['class','class'],['css','CSS'],['frame','프레임 주소']
  ];
  const fieldDefaults=Object.fromEntries(fields.map(([key])=>[key,true]));
  function normalizeFields(value){
    const result=Object.fromEntries(fields.map(([key])=>[key,typeof value?.[key]==='boolean'?value[key]:true]));
    return Object.values(result).some(Boolean)?result:{...fieldDefaults};
  }
  function renderFields(container){
    for(const [key,text] of fields){
      const label=document.createElement('label'),input=document.createElement('input');
      input.type='checkbox';input.name='copy-field';input.value=key;input.checked=true;
      label.append(input,document.createTextNode(text));container.append(label);
    }
  }
  function readFields(container){return Object.fromEntries([...container.querySelectorAll('input')].map(input=>[input.value,input.checked]));}
  function showFields(container,value){const selected=normalizeFields(value);for(const input of container.querySelectorAll('input'))input.checked=selected[input.value];}
  function keepSelection(event,container,status){
    if(Object.values(readFields(container)).some(Boolean))return true;
    event.target.checked=true;status.textContent='복사할 항목을 최소 1개 선택해주세요.';return false;
  }
  globalThis.ElementInspectorSettings={defaults,valid,label,matches,fields,fieldDefaults,normalizeFields,renderFields,readFields,showFields,keepSelection};
})();
