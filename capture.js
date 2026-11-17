// Idea61582: the sole network destination and image/readback contract.
(() => {
  const origin='https://picklog.devislife.com';
  const validProject=value=>typeof value==='string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value) && value.toLowerCase()!=='all';
  const validToken=value=>typeof value==='string' && /^[\x21-\x7e]{8,512}$/.test(value);
  function cropRegion(rect,viewport,image){
    if(!rect || !viewport || !image || ![rect.x,rect.y,rect.width,rect.height,viewport.width,viewport.height,image.width,image.height].every(Number.isFinite) || rect.width<=0 || rect.height<=0 || viewport.width<=0 || viewport.height<=0 || image.width<=0 || image.height<=0)throw Error('invalid_region');
    const sx=image.width/viewport.width,sy=image.height/viewport.height;
    if(Math.abs(sx-sy)>Math.max(sx,sy)*.02)throw Error('invalid_region');
    const x=Math.max(0,Math.floor(rect.x*sx)),y=Math.max(0,Math.floor(rect.y*sy));
    const right=Math.min(image.width,Math.ceil((rect.x+rect.width)*sx)),bottom=Math.min(image.height,Math.ceil((rect.y+rect.height)*sy));
    if(right<=x || bottom<=y || (right-x)*(bottom-y)>32*1024*1024)throw Error('invalid_region');
    return {x,y,width:right-x,height:bottom-y};
  }
  async function request(path,token,init={},limit=4*1024*1024){
    const response=await fetch(origin+path,{...init,credentials:'omit',redirect:'error',cache:'no-store',headers:{Accept:'application/json','X-Picklog-Token':token},signal:AbortSignal.timeout(15000)});
    if(!response.ok){const error=Error(response.status===401?'auth':response.status===403?'forbidden':response.status===429?'rate_limit':'network');error.status=response.status;throw error;}
    const reader=response.body.getReader(),parts=[];let size=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('response_too_large');parts.push(value);}}
    finally{await reader.cancel().catch(()=>{});}
    const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
    return bytes;
  }
  async function connect(token,project){
    if(!validToken(token) || !validProject(project))throw Error('invalid_connection');
    const data=JSON.parse(new TextDecoder().decode(await request('/api/captures',token)));
    if(!Array.isArray(data.images))throw Error('invalid_response');
    let projects;
    try{projects=JSON.parse(new TextDecoder().decode(await request('/api/issue-projects',token)));}
    catch(error){if(error.status===403 || error.status===404)return {projectVerified:false};throw error;}
    if(!Array.isArray(projects.projects))throw Error('invalid_response');
    if(!projects.projects.some(row=>row.project_key===project))throw Error('project');
    return {projectVerified:true};
  }
  async function upload(blob,dimensions,token,project){
    if(!validToken(token) || !validProject(project) || blob.type!=='image/png' || blob.size>16*1024*1024)throw Error('invalid_connection');
    const body=new FormData();body.set('file',blob,'element.png');body.set('title','엘리먼트 캡처');body.set('projectKey',project);body.set('width',String(dimensions.width));body.set('height',String(dimensions.height));
    const data=JSON.parse(new TextDecoder().decode(await request('/api/captures',token,{method:'POST',body},65536)));
    const image=data?.image;
    if(!/^cap_[A-Za-z0-9]{10,80}$/.test(image?.public_id) || image.issue_project_key!==project)throw Error('upload_unverified');
    try{
      const bytes=await request(`/api/captures/${image.public_id}/asset?kind=original`,token,{},16*1024*1024);
      const expected=new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()));
      const actual=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
      if(!expected.every((value,i)=>value===actual[i]))throw Error('image_mismatch');
    }catch{throw Error('upload_unverified');}
    return {publicId:image.public_id,url:`${origin}/captures/${image.public_id}`};
  }
  globalThis.ElementInspectorCapture={cropRegion,validProject,validToken,connect,upload};
})();
