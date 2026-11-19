const queues=new Map();
// A shared tab state lets the pointer move across HTTP(S) iframe boundaries.
async function setState(tabId,active,requestId){
  await chrome.storage.session.set({['tab:'+tabId]:active});
  try{await chrome.tabs.sendMessage(tabId,{type:'element-inspector:set',active,requestId});return true;}
  catch{return false;}
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(!['element-inspector:state','element-inspector:toggle','element-inspector:stop'].includes(message.type))return;
  const tabId=sender.url?.startsWith(chrome.runtime.getURL('')) && Number.isInteger(message.tabId) ? message.tabId : sender.tab?.id;
  if(!Number.isInteger(tabId))return;
  const task=(queues.get(tabId)||Promise.resolve()).then(async()=>{
    const data=await chrome.storage.session.get('tab:'+tabId),active=Boolean(data['tab:'+tabId]);
    if(message.type==='element-inspector:state'){reply({active});return;}
    const next=message.type==='element-inspector:stop'?false:(typeof message.active==='boolean'?message.active:!active);
    const ok=await setState(tabId,next,message.requestId);reply({ok,active:next});
  }).catch(()=>reply({ok:false}));
  queues.set(tabId,task);task.finally(()=>{if(queues.get(tabId)===task)queues.delete(tabId);});
  return true;
});
chrome.tabs.onUpdated.addListener((id,change)=>{if(change.status==='loading')chrome.storage.session.remove('tab:'+id).catch(()=>{});});
chrome.tabs.onRemoved.addListener(id=>chrome.storage.session.remove('tab:'+id).catch(()=>{}));

// PATs stay in extension-origin persistent storage; replies contain status only.
importScripts('capture.js','connection-store.js');
const captureJobs = new Set(), windowEpochs = new Map(), areaTabs = new Map();
let nextCaptureAt = 0;
chrome.tabs.onActivated.addListener(({ windowId, tabId }) => {
  windowEpochs.set(windowId, (windowEpochs.get(windowId) || 0) + 1);
  const selectingTab = areaTabs.get(windowId);
  if (selectingTab !== undefined && selectingTab !== tabId) {
    areaTabs.delete(windowId);
    chrome.tabs.sendMessage(selectingTab, { type: 'element-inspector:cancel-area' }, { frameId: 0 }).catch(() => {});
  }
});
chrome.windows.onRemoved.addListener(id => {
  windowEpochs.delete(id);
  areaTabs.delete(id);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== 'capture-area' || !Number.isInteger(tab?.id)) return;
  areaTabs.set(tab.windowId, tab.id);
  chrome.tabs.sendMessage(tab.id, { type: 'element-inspector:start-area' }, { frameId: 0 }).catch(() => {});
});
const sessionReady=chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
let connectionQueue=Promise.resolve();
function connectionTask(task){const result=connectionQueue.then(task,task);connectionQueue=result.catch(()=>{});return result;}
async function readConnection(){
  const stored=await ElementInspectorConnectionStore.read();
  const legacy=(await chrome.storage.session.get('picklogConnection')).picklogConnection;
  if(stored){if(legacy)await chrome.storage.session.remove('picklogConnection');return stored;}
  if(legacy && ElementInspectorCapture.validToken(legacy.token) && ElementInspectorCapture.validProject(legacy.project)){
    const migrated={token:legacy.token,project:legacy.project.toUpperCase()};
    await ElementInspectorConnectionStore.write(migrated);await chrome.storage.session.remove('picklogConnection');return migrated;
  }
  return null;
}
function connectionError(error){
  return ({auth:'PAT 인증에 실패했습니다. 토큰의 유효기간과 캔버스 접근 권한을 확인하세요.',forbidden:'Picklog 캔버스 읽기 권한을 확인하세요.',project:'접근 가능한 프로젝트에 없습니다. 프로젝트 키와 접근 권한을 확인하세요.',host_permission:'Picklog 사이트 접근 권한이 허용되지 않았습니다. 다시 연결해 권한을 허용하세요.',storage:'PAT를 이 브라우저에 저장하지 못했습니다. 저장 공간을 확인하고 다시 시도하세요.',invalid_connection:'PAT와 프로젝트 키를 입력해주세요.',rate_limit:'요청이 많습니다. 잠시 뒤 다시 연결을 확인하세요.',invalid_response:'Picklog 응답을 확인하지 못했습니다. 잠시 뒤 다시 확인하세요.'})[error.message] || 'Picklog에 접속하지 못했습니다. 네트워크를 확인한 뒤 다시 연결을 확인하세요.';
}
async function configureConnection(message){
  let stored;
  try{
    stored=await readConnection();
    const saved={saved:Boolean(stored),savedProject:stored?.project || ''};
    if(message.type==='element-inspector:disconnect'){
      await ElementInspectorConnectionStore.clear();await chrome.storage.session.remove('picklogConnection');return {ok:true,saved:false,savedProject:'',connected:false};
    }
    if(message.type==='element-inspector:connection' && (!stored || !message.verify))return {ok:true,...saved,connected:false,project:stored?.project || ''};
    const draft=message.type!=='element-inspector:connection';
    const token=draft?(message.token || stored?.token):stored?.token;
    const project=(draft?message.project:stored?.project)?.trim().toUpperCase();
    if(!ElementInspectorCapture.validToken(token) || !ElementInspectorCapture.validProject(project))throw Error('invalid_connection');
    if(message.type==='element-inspector:save-connection'){
      await ElementInspectorConnectionStore.write({token,project});
      return {ok:true,saved:true,savedProject:project,connected:false,project};
    }
    if(!await chrome.permissions.contains({origins:['https://picklog.devislife.com/*']}))throw Error('host_permission');
    const verification=await ElementInspectorCapture.connect(token,project),checkedAt=new Date().toISOString();
    return {ok:true,...saved,connected:true,project,checkedAt,projectVerified:verification.projectVerified};
  }catch(error){return {ok:false,saved:Boolean(stored),savedProject:stored?.project || '',connected:false,error:connectionError(error)};}
}
function captureError(code, area){
  if (code === 'permission' && area) return '영역 캡처 단축키를 다시 누르고 현재 페이지에서 영역을 선택하세요.';
  if (code === 'document_changed') return '선택한 페이지를 확인할 수 없습니다. 현재 페이지에서 다시 캡처하세요.';
  if (code === 'region_changed') return '캡처하기 전에 화면 위치가 달라졌습니다. 영역을 다시 선택하세요.';
  if (code === 'invalid_region') return '현재 배율이나 크기에서는 캡처할 수 없습니다. 화면에 보이는 범위를 다시 선택하세요.';
  if (area && !['forbidden','auth','rate_limit','upload_unverified','expired','tab_changed','busy','invalid_connection'].includes(code)) return '영역을 캡처하지 못했습니다. 페이지를 새로고침하거나 영역을 다시 선택하세요.';

  return ({auth:'Picklog PAT를 확인하고 고급 설정에서 다시 연결하세요.',forbidden:'Picklog 캔버스·프로젝트의 읽기/쓰기 권한을 확인하세요.',rate_limit:'요청이 많습니다. 잠시 뒤 다시 캡처하세요.',upload_unverified:'업로드 결과를 확인하지 못했습니다. 중복 업로드 전에 Picklog 캔버스를 확인하세요.',frame:'프레임 안 요소는 이미지 캡처를 지원하지 않습니다. 요소 정보는 복사했습니다.',expired:'복사할 이미지의 보관 시간이 끝났습니다. 요소를 다시 캡처하세요.',permission:'설정에서 요소 캡처를 켜고 Chrome 권한을 허용하세요.',tab_changed:'검사하던 탭이 바뀌었습니다. 원래 화면에서 다시 캡처하세요.',busy:'이전 캡처가 끝난 뒤 다시 시도하세요.',invalid_connection:'PAT와 저장 프로젝트 키를 확인하세요.'})[code] || '캡처 또는 업로드를 마치지 못했습니다. 요소 정보는 복사했습니다. Picklog 캔버스를 확인한 뒤 다시 시도하세요.';
}
const clipboardResults=new Map();
chrome.tabs.onRemoved.addListener(id=>clipboardResults.delete(id));
chrome.tabs.onUpdated.addListener((id,change)=>{if(change.status==='loading')clipboardResults.delete(id);});
// The tab URL and loading status can change while this document remains visible.
async function validateCapture(message, sender, epoch) {
  const { id, windowId } = sender.tab;
  const tab = await chrome.tabs.get(id).catch(() => null);
  if (!tab?.active || tab.windowId !== windowId || (windowEpochs.get(windowId) || 0) !== epoch) {
    throw Error('tab_changed');
  }
  const geometry = await chrome.tabs.sendMessage(id, {
    type: 'element-inspector:validate-capture', generation: message.generation,
  }, { documentId: sender.documentId }).catch(() => null);
  if (!geometry?.valid) throw Error('document_changed');
  if (!['x','y','width','height'].every(key => Math.abs(geometry.rect[key] - message.rect?.[key]) < .5)
    || !['width','height','scrollX','scrollY','scale'].every(key => geometry.viewport[key] === message.viewport?.[key])) {
    throw Error('region_changed');
  }
  if ((windowEpochs.get(windowId) || 0) !== epoch) throw Error('tab_changed');
}

async function rememberCapture(tabId, documentId, blob, text, area) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  const result = { handle: crypto.randomUUID(), dataUrl: 'data:image/png;base64,' + btoa(binary), text, area, documentId, expires: Date.now() + 120000 };
  for (const [key, value] of clipboardResults) if (value.expires < Date.now()) clipboardResults.delete(key);
  clipboardResults.delete(tabId);
  if (clipboardResults.size >= 3) clipboardResults.delete(clipboardResults.keys().next().value);
  clipboardResults.set(tabId, result);
  setTimeout(() => {
    if (clipboardResults.get(tabId) === result) clipboardResults.delete(tabId);
  }, 120000);
  return result;
}

async function uploadCapture(blob, region, area) {
  const connection = await readConnection();
  if (!connection) return null;
  return ElementInspectorCapture.upload(blob, region, connection.token, connection.project, area);
}

const optionsSender=sender=>sender.id===chrome.runtime.id && sender.url===chrome.runtime.getURL('options.html');
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(!['element-inspector:connection','element-inspector:test-connection','element-inspector:save-connection','element-inspector:disconnect','element-inspector:capture','element-inspector:open-preview','element-inspector:preview'].includes(message?.type))return;
  const area = message.area === true;
  (async()=>{
    await sessionReady;
    if(message.type==='element-inspector:preview'){
      const page = chrome.runtime.getURL('capture-preview.html');
      if (sender.id !== chrome.runtime.id || ![page, page + '?copy'].includes(sender.url?.split('#')[0])) throw Error('permission');
      const result=[...clipboardResults.values()].find(value=>value.handle===message.handle && value.expires>Date.now());
      if(!result)throw Error('expired');return {ok:true,dataUrl:result.dataUrl,text:result.text,area:result.area};
    }
    if(!['element-inspector:capture','element-inspector:open-preview','element-inspector:preview'].includes(message.type)){
      if(!optionsSender(sender))throw Error('permission');
      return connectionTask(()=>configureConnection(message));
    }
    if(sender.id!==chrome.runtime.id || !sender.tab || !/^https?:/.test(sender.url || ''))throw Error('permission');
    if(sender.frameId!==0)throw Error('frame');
    if (!sender.documentId) throw Error('document_changed');
    const { id: tabId, windowId } = sender.tab;
    if (message.type === 'element-inspector:open-preview') {
      const result = clipboardResults.get(tabId);
      if (!result || result.handle !== message.handle || result.documentId !== sender.documentId || result.expires < Date.now()) throw Error('expired');
      const autoCopy = result.area && message.autoCopy === true;
      if (autoCopy && !(await chrome.tabs.get(tabId)).active) throw Error('tab_changed');
      await chrome.tabs.create({ url: chrome.runtime.getURL('capture-preview.html') + (autoCopy ? '?copy' : '') + '#' + result.handle });
      return { ok: true };
    }
    if (!area && (typeof message.text !== 'string' || message.text.length > 20000)) throw Error('invalid_text');
    if (captureJobs.has(tabId)) throw Error('busy');
    if (message.viewport?.scale !== 1) throw Error('invalid_region');
    captureJobs.add(tabId);
    const epoch = windowEpochs.get(windowId) || 0;
    try {
      if (!area) {
        const settings = await chrome.storage.local.get('captureEnabled');
        if (!settings.captureEnabled || !await chrome.permissions.contains({ origins: ['<all_urls>'] })) throw Error('permission');
      }
      const wait = Math.max(0, nextCaptureAt - Date.now());
      nextCaptureAt = Date.now() + wait + 550;
      if (wait) await new Promise(resolve => setTimeout(resolve, wait));
      await validateCapture(message, sender, epoch);
      const raw = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' }).catch(async () => {
        await validateCapture(message, sender, epoch);
        throw Error(area ? 'permission' : 'capture_failed');
      });
      await validateCapture(message, sender, epoch);
      const bitmap=await createImageBitmap(await (await fetch(raw)).blob());
      let region,blob;
      try{
        region=ElementInspectorCapture.cropRegion(message.rect,message.viewport,bitmap);
        const canvas=new OffscreenCanvas(region.width,region.height);
        canvas.getContext('2d').drawImage(bitmap,region.x,region.y,region.width,region.height,0,0,region.width,region.height);
        blob=await canvas.convertToBlob({type:'image/png'});
      }finally{bitmap.close();}
      if(blob.size>16*1024*1024)throw Error('invalid_region');
      const { width, height } = region;
      const notify = data => chrome.tabs.sendMessage(tabId, {
        type: 'element-inspector:capture-progress', generation: message.generation, ...data,
      }, { documentId: sender.documentId }).catch(() => null);
      if (area) {
        const { handle, dataUrl } = await rememberCapture(tabId, sender.documentId, blob, '', true);
        const delivered = await notify({ image: { handle, dataUrl, width, height } });
        if (!delivered?.ok) throw Error('document_changed');
        try {
          const reference = await uploadCapture(blob, region, true);
          await notify({ upload: reference });
        } catch (error) {
          const known = ['auth','forbidden','rate_limit','upload_unverified','invalid_connection'].includes(error.message);
          await notify({ uploadError: known ? captureError(error.message, true) : 'Picklog에 저장하지 못했습니다. 다시 캡처하기 전에 캔버스를 확인하세요.' });
        }
        return { ok: true };
      }
      await notify({});
      const reference = await uploadCapture(blob, region, false);
      const text = message.text + (reference ? `\nPicklog 캔버스 ID: ${reference.publicId}\nPicklog 캔버스: ${reference.url}` : '');
      const { handle } = await rememberCapture(tabId, sender.documentId, blob, text, false);
      return { ok: true, ...reference, handle, width, height };
    } finally {
      captureJobs.delete(tabId);
    }
  })().then(reply).catch(error=>reply({ok:false,error:captureError(error.message, area)}));
  return true;
});
