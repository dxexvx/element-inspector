const {defaults,valid,label,renderFields,readFields,showFields,keepSelection}=ElementInspectorSettings;
const input=document.querySelector('#shortcut'),status=document.querySelector('#settings-status'),fields=document.querySelector('#copy-fields');
renderFields(fields.querySelector('.field-grid'));
let shortcut=defaults;
function show(){input.value=label(shortcut);}
chrome.storage.local.get(['shortcut','copyFields','captureEnabled','picklogProject']).then(data=>{
  if(valid(data.shortcut))shortcut=data.shortcut;show();showFields(fields,data.copyFields);fields.disabled=false;document.querySelector("#capture-enabled").checked=Boolean(data.captureEnabled);document.querySelector("#picklog-project").value=data.picklogProject || "";
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
  try{await chrome.storage.local.set({shortcut,copyFields:readFields(fields),captureEnabled:document.querySelector('#capture-enabled').checked});status.textContent='저장했습니다. 열려 있는 웹페이지에도 적용됩니다.';}
  catch{status.textContent='저장하지 못했습니다. 다시 시도해주세요.';}
});
document.querySelector('#reset').addEventListener('click',()=>{document.querySelector('#capture-enabled').checked=false;shortcut={...defaults};show();showFields(fields);status.textContent='기본값입니다. 저장을 눌러 적용하세요.';});

const captureEnabled=document.querySelector('#capture-enabled'),connectionStatus=document.querySelector('#connection-status'),pat=document.querySelector('#picklog-pat'),project=document.querySelector('#picklog-project'),connectButton=document.querySelector('#connect'),disconnectButton=document.querySelector('#disconnect');
captureEnabled.addEventListener('change',async()=>{
  if(!captureEnabled.checked)return;
  try{if(!await chrome.permissions.request({origins:['<all_urls>']})){captureEnabled.checked=false;status.textContent='권한을 허용하지 않아 기존 정보만 복사합니다.';}}
  catch{captureEnabled.checked=false;status.textContent='캡처 권한을 요청하지 못했습니다. 다시 켜주세요.';}
});
function connectionState(result){
  if(!result?.ok){connectionStatus.textContent=result?.error || '연결 상태를 읽지 못했습니다.';return;}
  disconnectButton.hidden=!result.connected;
  connectionStatus.textContent=result.connected?`Picklog에 연결했습니다. 저장 프로젝트: ${result.project}`:'Picklog 연결 없음 · 이미지를 클립보드에 복사합니다.';
}
chrome.runtime.sendMessage({type:'element-inspector:connection'}).then(connectionState).catch(()=>{connectionStatus.textContent='연결 상태를 읽지 못했습니다.';});
connectButton.addEventListener('click',async()=>{
  connectButton.disabled=true;connectionStatus.textContent='Picklog 인증을 확인하고 있습니다…';
  try{
    const result=await chrome.runtime.sendMessage({type:'element-inspector:connect',token:pat.value.trim(),project:project.value.trim()});
    pat.value='';connectionState(result);
    if(result.ok)await chrome.storage.local.set({picklogProject:result.project});
  }catch{pat.value='';connectionStatus.textContent='연결하지 못했습니다. PAT와 프로젝트 권한을 확인하세요.';}
  finally{connectButton.disabled=false;}
});
disconnectButton.addEventListener('click',async()=>{pat.value='';try{connectionState(await chrome.runtime.sendMessage({type:'element-inspector:disconnect'}));}catch{connectionStatus.textContent='연결을 해제하지 못했습니다. 다시 시도해주세요.';}});
