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
  const connectionAttempt=(pat.value.trim() || (savedConnection && project.value.trim().toUpperCase()!==savedProject))?connectPicklog():null;
  try{await chrome.storage.local.set({shortcut,copyFields:readFields(fields),captureEnabled:document.querySelector('#capture-enabled').checked});const connected=connectionAttempt?await connectionAttempt:true;status.textContent=connected?'저장했습니다. Picklog 연결 결과는 연결 상태에서 확인하세요.':'기본 설정만 저장했습니다. Picklog 연결 실패 원인을 확인하세요.';}
  catch{status.textContent='저장하지 못했습니다. 다시 시도해주세요.';}
});
document.querySelector('#reset').addEventListener('click',()=>{document.querySelector('#capture-enabled').checked=false;shortcut={...defaults};show();showFields(fields);status.textContent='기본값입니다. 저장을 눌러 적용하세요.';});

const captureEnabled=document.querySelector('#capture-enabled'),connectionStatus=document.querySelector('#connection-status'),pat=document.querySelector('#picklog-pat'),project=document.querySelector('#picklog-project'),connectButton=document.querySelector('#connect'),disconnectButton=document.querySelector('#disconnect');
captureEnabled.addEventListener('change',async()=>{
  if(!captureEnabled.checked)return;
  try{if(!await chrome.permissions.request({origins:['<all_urls>']})){captureEnabled.checked=false;status.textContent='권한을 허용하지 않아 기존 정보만 복사합니다.';}}
  catch{captureEnabled.checked=false;status.textContent='캡처 권한을 요청하지 못했습니다. 다시 켜주세요.';}
});
let savedConnection=false,savedProject='';
const connectionSummary=document.querySelector('#picklog-summary');
function connectionState(result){
  savedConnection=Boolean(result?.saved);savedProject=result?.project || savedProject;
  disconnectButton.hidden=!savedConnection;
  pat.placeholder=savedConnection?'저장된 PAT 유지 · 바꾸려면 새 토큰 입력':'';
  if(result?.ok && result.project)project.value=result.project;
  let text;
  if(!result?.ok)text=`연결 확인 실패 · ${result?.error || '잠시 뒤 다시 시도하세요.'}${savedConnection?' 기존 저장된 PAT는 유지됩니다.':''}`;
  else if(result.connected){const when=new Date(result.checkedAt).toLocaleString('ko-KR');text=`${result.projectVerified?'인증·프로젝트 확인 완료':'PAT 인증 확인 완료 · 프로젝트는 업로드 시 확인'} · ${result.project} · ${when}`;}
  else text=savedConnection?`PAT 저장됨 · ${savedProject} · 연결 확인이 필요합니다.`:'저장된 연결 없음 · 캡처 이미지는 미리보기에서 복사합니다.';
  connectionStatus.textContent=text;
  connectionSummary.dataset.state=result?.ok?(result.connected?'verified':'unverified'):'error';
}
function connectionBusy(busy){connectButton.disabled=busy;disconnectButton.disabled=busy;}
connectionBusy(true);
chrome.runtime.sendMessage({type:'element-inspector:connection',verify:true}).then(connectionState).catch(()=>connectionState({ok:false,error:'연결 상태를 읽지 못했습니다.'})).finally(()=>connectionBusy(false));
async function connectPicklog(){
  connectionBusy(true);connectionStatus.textContent='Picklog 인증·프로젝트를 확인하고 있습니다…';
  try{
    if(!await chrome.permissions.request({origins:['https://picklog.devislife.com/*']})){connectionState({ok:false,saved:savedConnection,error:'Picklog 사이트 접근 권한을 허용해주세요.'});return false;}
    const result=await chrome.runtime.sendMessage({type:'element-inspector:connect',token:pat.value.trim(),project:project.value.trim()});
    connectionState(result);
    if(result.ok){pat.value='';await chrome.storage.local.set({picklogProject:result.project});}
    return Boolean(result.ok);
  }catch{connectionState({ok:false,saved:savedConnection,error:'네트워크를 확인하고 다시 시도하세요.'});return false;}
  finally{connectionBusy(false);}
}
connectButton.addEventListener('click',connectPicklog);
disconnectButton.addEventListener('click',async()=>{connectionBusy(true);try{const result=await chrome.runtime.sendMessage({type:'element-inspector:disconnect'});if(result.ok)pat.value='';connectionState(result);}catch{connectionState({ok:false,saved:savedConnection,error:'연결을 해제하지 못했습니다. 다시 시도해주세요.'});}finally{connectionBusy(false);}});
