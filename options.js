const {defaults,valid,label,renderFields,readFields,showFields,keepSelection}=ElementInspectorSettings;
const input=document.querySelector('#shortcut'),status=document.querySelector('[role=status]'),fields=document.querySelector('#copy-fields');
renderFields(fields.querySelector('.field-grid'));
let shortcut=defaults;
function show(){input.value=label(shortcut);}
chrome.storage.local.get(['shortcut','copyFields']).then(data=>{
  if(valid(data.shortcut))shortcut=data.shortcut;show();showFields(fields,data.copyFields);fields.disabled=false;
}).catch(()=>{status.textContent='설정을 읽지 못했습니다. 페이지를 다시 열어주세요.';});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local' && changes.copyFields)showFields(fields,changes.copyFields.newValue);});
fields.addEventListener('change',e=>{if(keepSelection(e,fields,status))status.textContent='저장을 눌러 적용하세요.';});
input.addEventListener('keydown',e=>{
  if(e.key==='Tab')return;
  e.preventDefault();
  const candidate={code:e.code,ctrlKey:e.ctrlKey,metaKey:e.metaKey,altKey:e.altKey,shiftKey:e.shiftKey};
  if(!valid(candidate)||e.isComposing){status.textContent='Ctrl, Command 또는 Alt와 영문·숫자 키를 함께 누르세요.';return;}
  shortcut=candidate;show();status.textContent='저장을 눌러 적용하세요.';
});
document.querySelector('form').addEventListener('submit',async e=>{
  e.preventDefault();if(fields.disabled)return;
  try{await chrome.storage.local.set({shortcut,copyFields:readFields(fields)});status.textContent='저장했습니다. 열려 있는 웹페이지에도 적용됩니다.';}
  catch{status.textContent='저장하지 못했습니다. 다시 시도해주세요.';}
});
document.querySelector('#reset').addEventListener('click',()=>{shortcut={...defaults};show();showFields(fields);status.textContent='기본값입니다. 저장을 눌러 적용하세요.';});
