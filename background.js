const queues=new Map();
// A shared tab state lets the pointer move across HTTP(S) iframe boundaries.
async function setState(tabId,active){
  await chrome.storage.session.set({['tab:'+tabId]:active});
  try{await chrome.tabs.sendMessage(tabId,{type:'element-inspector:set',active});return true;}
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
    const ok=await setState(tabId,next);reply({ok,active:next});
  }).catch(()=>reply({ok:false}));
  queues.set(tabId,task);task.finally(()=>{if(queues.get(tabId)===task)queues.delete(tabId);});
  return true;
});
chrome.tabs.onUpdated.addListener((id,change)=>{if(change.status==='loading')chrome.storage.session.remove('tab:'+id).catch(()=>{});});
chrome.tabs.onRemoved.addListener(id=>chrome.storage.session.remove('tab:'+id).catch(()=>{}));
