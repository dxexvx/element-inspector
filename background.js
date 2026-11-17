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

// PATs stay in trusted extension session memory; never reply with credentials.
importScripts('capture.js');
const captureJobs=new Set(),windowEpochs=new Map();
let nextCaptureAt=0;
chrome.tabs.onActivated.addListener(info=>windowEpochs.set(info.windowId,(windowEpochs.get(info.windowId)||0)+1));
const sessionReady=chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
function captureError(code){
  return ({auth:'Picklog PAT를 확인하고 고급 설정에서 다시 연결하세요.',forbidden:'Picklog 캔버스·프로젝트의 읽기/쓰기 권한을 확인하세요.',rate_limit:'요청이 많습니다. 잠시 뒤 다시 캡처하세요.',upload_unverified:'업로드 결과를 확인하지 못했습니다. 중복 업로드 전에 Picklog 캔버스를 확인하세요.',frame:'프레임 안 요소는 이미지 캡처를 지원하지 않습니다. 요소 정보는 복사했습니다.',expired:'복사할 이미지의 보관 시간이 끝났습니다. 요소를 다시 캡처하세요.',permission:'설정에서 요소 캡처를 켜고 Chrome 권한을 허용하세요.',tab_changed:'검사하던 탭이 바뀌었습니다. 원래 화면에서 다시 캡처하세요.',busy:'이전 캡처가 끝난 뒤 다시 시도하세요.',invalid_connection:'PAT와 저장 프로젝트 키를 확인하세요.'})[code] || '캡처 또는 업로드를 마치지 못했습니다. 요소 정보는 복사했습니다. Picklog 캔버스를 확인한 뒤 다시 시도하세요.';
}
const clipboardResults=new Map();
chrome.tabs.onRemoved.addListener(id=>clipboardResults.delete(id));
chrome.tabs.onUpdated.addListener((id,change)=>{if(change.status==='loading')clipboardResults.delete(id);});
const optionsSender=sender=>sender.id===chrome.runtime.id && sender.url===chrome.runtime.getURL('options.html');
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(!['element-inspector:connection','element-inspector:connect','element-inspector:disconnect','element-inspector:capture','element-inspector:open-preview','element-inspector:preview'].includes(message?.type))return;
  (async()=>{
    await sessionReady;
    if(message.type==='element-inspector:preview'){
      if(sender.id!==chrome.runtime.id || sender.url?.split('#')[0]!==chrome.runtime.getURL('capture-preview.html'))throw Error('permission');
      const result=[...clipboardResults.values()].find(value=>value.handle===message.handle && value.expires>Date.now());
      if(!result)throw Error('expired');return {ok:true,dataUrl:result.dataUrl,text:result.text};
    }
    if(!['element-inspector:capture','element-inspector:open-preview','element-inspector:preview'].includes(message.type)){
      if(!optionsSender(sender))throw Error('permission');
      if(message.type==='element-inspector:disconnect'){await chrome.storage.session.remove('picklogConnection');return {ok:true,connected:false};}
      if(message.type==='element-inspector:connect'){
        const granted=await chrome.permissions.contains({origins:['<all_urls>']});
        if(!granted)throw Error('permission');
        await ElementInspectorCapture.connect(message.token,message.project);
        await chrome.storage.session.set({picklogConnection:{token:message.token,project:message.project}});
      }
      const data=await chrome.storage.session.get('picklogConnection');
      return {ok:true,connected:Boolean(data.picklogConnection),project:data.picklogConnection?.project || ''};
    }
    if(sender.id!==chrome.runtime.id || !sender.tab || !/^https?:/.test(sender.url || ''))throw Error('permission');
    if(sender.frameId!==0)throw Error('frame');
    if(message.type==='element-inspector:capture' && (typeof message.text!=='string' || message.text.length>20000))throw Error('invalid_text');
    if(message.type==='element-inspector:open-preview'){const result=clipboardResults.get(sender.tab.id);if(!result || result.handle!==message.handle || result.documentId!==sender.documentId || result.expires<Date.now())throw Error('expired');await chrome.tabs.create({url:chrome.runtime.getURL('capture-preview.html')+'#'+result.handle});return {ok:true};}
    const tabId=sender.tab.id;
    if(captureJobs.has(tabId))throw Error('busy');
    captureJobs.add(tabId);
    try{
      const settings=await chrome.storage.local.get('captureEnabled');
      if(!settings.captureEnabled || !await chrome.permissions.contains({origins:['<all_urls>']}))throw Error('permission');
      const wait=Math.max(0,nextCaptureAt-Date.now());nextCaptureAt=Date.now()+wait+550;
      if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
      const tab=await chrome.tabs.get(tabId);
      if(!tab.active || tab.url!==sender.url || tab.status!=='complete')throw Error('tab_changed');
      if(message.viewport?.scale!==1)throw Error('invalid_region');
      const epoch=windowEpochs.get(tab.windowId)||0;
      const raw=await chrome.tabs.captureVisibleTab(tab.windowId,{format:'png'});
      const current=await chrome.tabs.get(tabId);
      if(!current.active || current.url!==tab.url || current.status!=='complete' || (windowEpochs.get(tab.windowId)||0)!==epoch)throw Error('tab_changed');
      const geometry=await chrome.tabs.sendMessage(tabId,{type:'element-inspector:validate-capture',generation:message.generation},{documentId:sender.documentId});
      if(!geometry?.valid || !['x','y','width','height'].every(key=>Math.abs(geometry.rect[key]-message.rect?.[key])<.5) || !['width','height','scrollX','scrollY','scale'].every(key=>geometry.viewport[key]===message.viewport?.[key]))throw Error('tab_changed');
      const bitmap=await createImageBitmap(await (await fetch(raw)).blob());
      let region,blob;
      try{
        region=ElementInspectorCapture.cropRegion(message.rect,message.viewport,bitmap);
        const canvas=new OffscreenCanvas(region.width,region.height);
        canvas.getContext('2d').drawImage(bitmap,region.x,region.y,region.width,region.height,0,0,region.width,region.height);
        blob=await canvas.convertToBlob({type:'image/png'});
      }finally{bitmap.close();}
      if(blob.size>16*1024*1024)throw Error('invalid_region');
      await chrome.tabs.sendMessage(tabId,{type:'element-inspector:capture-progress',generation:message.generation},{documentId:sender.documentId}).catch(()=>{});
      const connection=(await chrome.storage.session.get('picklogConnection')).picklogConnection;
      let reference=null;
      if(connection)reference=await ElementInspectorCapture.upload(blob,region,connection.token,connection.project);
      const text=message.text+(reference?`\nPicklog 캔버스 ID: ${reference.publicId}\nPicklog 캔버스: ${reference.url}`:'');
      const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';
      for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
      const dataUrl='data:image/png;base64,'+btoa(binary),handle=crypto.randomUUID();
      // One short-lived result per tab, bound to the document that selected it.
      for(const [key,value] of clipboardResults)if(value.expires<Date.now())clipboardResults.delete(key);
      if(clipboardResults.size>=3)clipboardResults.delete(clipboardResults.keys().next().value);
      clipboardResults.set(tabId,{handle,dataUrl,text,documentId:sender.documentId,expires:Date.now()+120000});
      setTimeout(()=>{if(clipboardResults.get(tabId)?.handle===handle)clipboardResults.delete(tabId);},120000);
      return {ok:true,...reference,handle,width:region.width,height:region.height};
    }finally{captureJobs.delete(tabId);}
  })().then(reply).catch(error=>reply({ok:false,error:captureError(error.message)}));
  return true;
});
