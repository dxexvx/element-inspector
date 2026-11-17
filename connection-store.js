// The user explicitly chose persistent PAT storage in this browser profile.
// Extension-origin IndexedDB is separate from web-page/content-script storage.
(() => {
  let opening;
  function database(){
    if(!opening)opening=new Promise((resolve,reject)=>{
      const request=indexedDB.open('element-inspector-private',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('connection');
      request.onerror=()=>{opening=null;reject(Error('storage'));};
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=null;};resolve(db);};
    });
    return opening;
  }
  async function operation(mode,value){
    const db=await database();
    return new Promise((resolve,reject)=>{
      const transaction=db.transaction('connection',mode==='read'?'readonly':'readwrite'),store=transaction.objectStore('connection');
      const request=mode==='read'?store.get('picklog'):mode==='clear'?store.delete('picklog'):store.put(value,'picklog');
      transaction.oncomplete=()=>resolve(mode==='read'?request.result:null);
      transaction.onabort=transaction.onerror=()=>reject(Error('storage'));
    });
  }
  globalThis.ElementInspectorConnectionStore={read:()=>operation('read'),write:value=>operation('write',value),clear:()=>operation('clear')};
})();
