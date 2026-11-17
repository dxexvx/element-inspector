// Idea61582: bounds, authenticated fixed-origin upload and readback, never page credentials.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function api(fetch){const ctx={fetch,Blob,FormData,AbortSignal,crypto:require('node:crypto').webcrypto,Uint8Array,TextDecoder,URL,Response};ctx.globalThis=ctx;vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../capture.js'),'utf8'),ctx);return ctx.ElementInspectorCapture;}
test('crop clips visible pixels and uses screenshot scale independently of device pixel ratio',()=>{
 const c=api();assert.deepEqual({...c.cropRegion({x:-10,y:20,width:50,height:40},{width:100,height:80},{width:200,height:160})},{x:0,y:40,width:80,height:80});
 assert.deepEqual({...c.cropRegion({x:90,y:70,width:30,height:30},{width:100,height:80},{width:100,height:80})},{x:90,y:70,width:10,height:10});
 for(const rect of [{x:110,y:0,width:10,height:5},{x:0,y:0,width:NaN,height:2}])assert.throws(()=>c.cropRegion(rect,{width:100,height:80},{width:200,height:160}));
});
test('one upload, fixed origin, no cookies/redirect, verified bytes and actual public ID',async()=>{
 const blob=new Blob(['image bytes'],{type:'image/png'}),calls=[];
 const c=api(async(url,init)=>{calls.push({url,init});return calls.length===1?Response.json({image:{public_id:'cap_01m7testcapture1234567890abc',issue_project_key:'DEV'}},{status:201}):new Response(await blob.arrayBuffer());});
 const result=await c.upload(blob,{width:80,height:40},'synthetic-pat','DEV');
 assert.equal(result.publicId,'cap_01m7testcapture1234567890abc');assert.equal(calls.length,2);
 assert.equal(calls[0].url,'https://picklog.devislife.com/api/captures');assert.equal(calls[0].init.headers['X-Picklog-Token'],'synthetic-pat');
 assert.equal(calls[0].init.body.get('projectKey'),'DEV');assert.equal(calls[0].init.body.get('width'),'80');
 for(const call of calls){assert.equal(call.init.credentials,'omit');assert.equal(call.init.redirect,'error');}
 assert.equal(result.url,'https://picklog.devislife.com/captures/cap_01m7testcapture1234567890abc');
});
test('auth denial, forged ID, project mismatch, changed image and uncertain POST never retry',async()=>{
 for(const mode of ['denied','forged','wrong-project','changed','network']){
 let count=0;const c=api(async()=>{count++;if(mode==='network')throw Error('network');if(mode==='denied')return new Response('',{status:403});
 if(count===1)return Response.json({image:{public_id:mode==='forged'?'https://evil.invalid':'cap_01m7testcapture1234567890abc',issue_project_key:mode==='wrong-project'?'OTHER':'DEV'}},{status:201});return new Response('different');});
 await assert.rejects(c.upload(new Blob(['image'],{type:'image/png'}),{width:1,height:1},'synthetic-pat','DEV'));
 assert.ok(count<=2);if(mode!=='changed')assert.equal(count,1);
 }
});
test('connection checks actual authentication and project access without an upload',async()=>{
 let calls=[];const c=api(async url=>{calls.push(url);return Response.json(url.endsWith('/api/captures')?{images:[]}:{projects:[{project_key:'DEV'}]});});
 assert.equal((await c.connect('synthetic-pat','DEV')).projectVerified,true);assert.equal(calls.length,2);assert.ok(calls.every(url=>url.startsWith('https://picklog.devislife.com/api/')));
 await assert.rejects(c.connect('synthetic-pat','MISSING'),/project/);
 const denied=api(async url=>url.endsWith('/api/captures')?Response.json({images:[]}):new Response('',{status:403}));assert.equal((await denied.connect('synthetic-pat','DEV')).projectVerified,false);
 const expired=api(async()=>new Response('',{status:401}));await assert.rejects(expired.connect('synthetic-pat','DEV'),/auth/);
});
