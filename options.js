const {defaults,valid,label,renderFields,readFields,showFields,keepSelection}=ElementInspectorSettings;
const input=document.querySelector('#shortcut'),status=document.querySelector('#settings-status'),fields=document.querySelector('#copy-fields');
const captureEnabled=document.querySelector('#capture-enabled'),connectionStatus=document.querySelector('#connection-status'),pat=document.querySelector('#picklog-pat'),project=document.querySelector('#picklog-project'),connectButton=document.querySelector('#connect'),disconnectButton=document.querySelector('#disconnect'),saveButton=document.querySelector('button[type=submit]'),connectionSummary=document.querySelector('#picklog-summary');
renderFields(fields.querySelector('.field-grid'));
let shortcut=defaults,savedConnection=false,savedProject='',testResult=null;
function show(){input.value=label(shortcut);}
chrome.storage.local.get(['shortcut','copyFields','captureEnabled','picklogProject']).then(data=>{
  if(valid(data.shortcut))shortcut=data.shortcut;show();showFields(fields,data.copyFields);fields.disabled=false;captureEnabled.checked=Boolean(data.captureEnabled);if(!project.value)project.value=data.picklogProject || '';
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
function connectionState(result,{draft=false,action='check'}={}){
  if(typeof result?.saved==='boolean')savedConnection=result.saved;
  if(typeof result?.savedProject==='string')savedProject=result.savedProject;
  disconnectButton.hidden=!savedConnection;
  pat.placeholder=savedConnection?'저장된 PAT 유지 · 바꾸려면 새 토큰 입력':'';
  let text;
  if(!result?.ok)text=`${action==='save'?'PAT 저장':'연결 확인'} 실패 · ${result?.error || '잠시 뒤 다시 시도하세요.'}${savedConnection?' 기존 저장된 PAT는 유지됩니다.':''}`;
  else if(result.connected){const when=new Date(result.checkedAt).toLocaleString('ko-KR');text=`${result.projectVerified?'인증·프로젝트 확인 완료':'PAT 인증 확인 완료 · 프로젝트는 업로드 시 확인'} · ${result.project} · ${when}${draft?' · 입력한 값은 저장을 눌러 적용하세요.':''}`;}
  else text=savedConnection?`PAT 저장됨 · ${savedProject} · 연결 테스트로 확인하세요.`:'저장된 연결 없음 · 캡처 이미지는 미리보기에서 복사합니다.';
  connectionStatus.textContent=text;
  connectionSummary.dataset.state=result?.ok?(result.connected?'verified':'unverified'):'error';
}
function connectionBusy(busy){for(const control of [connectButton,disconnectButton,saveButton,pat,project])control.disabled=busy;}
function hasDraft(){return Boolean(pat.value.trim()) || project.value.trim().toUpperCase()!==savedProject;}
for(const control of [pat,project])control.addEventListener('input',()=>{
  testResult=null;connectionState({ok:true,saved:savedConnection,savedProject});
  status.textContent='변경한 연결 정보는 저장을 눌러 적용하세요.';
});
connectionBusy(true);
chrome.runtime.sendMessage({type:'element-inspector:connection',verify:true}).then(result=>{
  if(result.ok && result.project)project.value=result.project;
  testResult=result.ok && result.connected?result:null;connectionState(result);
}).catch(()=>connectionState({ok:false,error:'연결 상태를 읽지 못했습니다.'})).finally(()=>connectionBusy(false));
async function requestPicklogPermission(){return chrome.permissions.request({origins:['https://picklog.devislife.com/*']});}
async function testConnection(){
  connectionBusy(true);connectionStatus.textContent='Picklog 인증·프로젝트를 확인하고 있습니다…';testResult=null;
  try{
    if(!await requestPicklogPermission()){connectionState({ok:false,error:'Picklog 사이트 접근 권한을 허용해주세요.'});return;}
    const result=await chrome.runtime.sendMessage({type:'element-inspector:test-connection',token:pat.value.trim(),project:project.value.trim()});
    testResult=result.ok?result:null;connectionState(result,{draft:hasDraft()});
  }catch{connectionState({ok:false,error:'네트워크를 확인하고 다시 시도하세요.'});}
  finally{connectionBusy(false);}
}
connectButton.addEventListener('click',testConnection);
document.querySelector('form').addEventListener('submit',async e=>{
  e.preventDefault();if(fields.disabled || saveButton.disabled)return;
  const settings={shortcut,copyFields:readFields(fields),captureEnabled:captureEnabled.checked};
  const wantsConnection=Boolean(savedConnection || pat.value.trim() || project.value.trim());
  connectionBusy(true);
  try{
    let result;
    if(wantsConnection){
      if(!await requestPicklogPermission()){status.textContent='저장하지 못했습니다. Picklog 사이트 접근 권한을 허용해주세요.';return;}
      result=await chrome.runtime.sendMessage({type:'element-inspector:save-connection',token:pat.value.trim(),project:project.value.trim()});
      if(!result.ok){connectionState(result,{action:'save'});status.textContent='저장하지 못했습니다. PAT와 프로젝트 입력을 확인하세요.';return;}
      settings.picklogProject=result.project;
    }
    await chrome.storage.local.set(settings);
    if(result){pat.value='';project.value=result.project;connectionState(testResult?{...testResult,...result,connected:true,checkedAt:testResult.checkedAt,projectVerified:testResult.projectVerified}:result);}
    status.textContent='저장했습니다.';
  }catch{status.textContent='설정을 모두 저장하지 못했습니다. 다시 시도해주세요.';}
  finally{connectionBusy(false);}
});
disconnectButton.addEventListener('click',async()=>{
  connectionBusy(true);
  try{const result=await chrome.runtime.sendMessage({type:'element-inspector:disconnect'});if(result.ok){pat.value='';project.value='';testResult=null;await chrome.storage.local.remove('picklogProject');}connectionState(result);}
  catch{connectionState({ok:false,error:'연결을 해제하지 못했습니다. 다시 시도해주세요.'});}
  finally{connectionBusy(false);}
});
captureEnabled.addEventListener('change',async()=>{
  if(!captureEnabled.checked)return;
  try{if(!await chrome.permissions.request({origins:['<all_urls>']})){captureEnabled.checked=false;status.textContent='권한을 허용하지 않아 기존 정보만 복사합니다.';}}
  catch{captureEnabled.checked=false;status.textContent='캡처 권한을 요청하지 못했습니다. 다시 켜주세요.';}
});
document.querySelector('#reset').addEventListener('click',()=>{captureEnabled.checked=false;shortcut={...defaults};show();showFields(fields);status.textContent='기본값입니다. 저장을 눌러 적용하세요.';});
