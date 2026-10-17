const settings=ElementInspectorSettings,fields=document.querySelector('#copy-fields'),status=document.querySelector('[role=status]');
settings.renderFields(fields.querySelector('.field-grid'));
chrome.storage.local.get(['shortcut','copyFields']).then(data=>{
  document.querySelector('#shortcut').textContent=`단축키: ${settings.label(settings.valid(data.shortcut)?data.shortcut:settings.defaults)}`;
  settings.showFields(fields,data.copyFields);fields.disabled=false;
}).catch(()=>{status.textContent='설정을 읽지 못했습니다. 메뉴를 다시 열어주세요.';});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local' && changes.copyFields)settings.showFields(fields,changes.copyFields.newValue);});
fields.addEventListener('change',async e=>{
  if(!settings.keepSelection(e,fields,status))return;
  fields.disabled=true;
  try{await chrome.storage.local.set({copyFields:settings.readFields(fields)});status.textContent='복사할 정보를 저장했습니다.';}
  catch{
    try{const data=await chrome.storage.local.get('copyFields');settings.showFields(fields,data.copyFields);}catch{}
    status.textContent='저장하지 못했습니다. 다시 시도해주세요.';
  }finally{fields.disabled=false;}
});
document.querySelector('#settings').addEventListener('click',()=>chrome.runtime.openOptionsPage());
document.querySelector('#toggle').addEventListener('click',async()=>{
  try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const result=await chrome.runtime.sendMessage({type:'element-inspector:toggle',tabId:tab.id});if(!result.ok)throw Error('unavailable');window.close();}
  catch{status.textContent='이 페이지에서는 검사기를 실행할 수 없습니다. 일반 웹페이지를 열어주세요. 설치 직후라면 페이지를 새로고침하세요.';}
});
