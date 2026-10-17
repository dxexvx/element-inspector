chrome.storage.local.get('shortcut').then(data=>{const s=ElementInspectorSettings;document.querySelector('#shortcut').textContent=`단축키: ${s.label(s.valid(data.shortcut)?data.shortcut:s.defaults)}`;});
document.querySelector('#settings').addEventListener('click',()=>chrome.runtime.openOptionsPage());
document.querySelector('#toggle').addEventListener('click',async()=>{
  try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const result=await chrome.runtime.sendMessage({type:'element-inspector:toggle',tabId:tab.id});if(!result.ok)throw Error('unavailable');window.close();}
  catch{document.querySelector('[role=status]').textContent='이 페이지에서는 검사기를 실행할 수 없습니다. 일반 웹페이지를 열어주세요. 설치 직후라면 페이지를 새로고침하세요.';}
});
