const image=document.querySelector('#image'),status=document.querySelector('[role=status]'),copy=document.querySelector('#copy'),textCopy=document.querySelector('#copy-text');
let data;
(async()=>{
  const handle=location.hash.slice(1);if(!/^[0-9a-f-]{36}$/.test(handle))throw Error('expired');
  data=await chrome.runtime.sendMessage({type:'element-inspector:preview',handle});if(!data?.ok)throw Error('expired');
  image.src=data.dataUrl;await image.decode();image.hidden=false;
  document.querySelector('#dimensions').textContent=`${image.naturalWidth} × ${image.naturalHeight}px`;
  document.querySelector('#info').textContent=data.text;copy.disabled=false;textCopy.disabled=false;
  if (data.area) {
    document.title = document.querySelector('h1').textContent = '캡처한 영역';
    image.alt = '선택한 영역의 캡처';
    copy.textContent = '이미지 복사';
    textCopy.hidden = true;
    if (location.search === '?copy') {
      if (document.hasFocus()) await copyImage();
      else status.textContent = '이미지 복사를 눌러 클립보드에 저장하세요.';
    }
  }
})().catch(()=>{status.textContent='이미지 보관 시간이 끝났습니다. 원래 페이지에서 다시 캡처하세요.';});
async function copyImage() {
  try {
    const blob = await (await fetch(data.dataUrl)).blob();
    const items = { 'image/png': blob };
    if (!data.area) items['text/plain'] = new Blob([data.text], { type: 'text/plain' });
    await navigator.clipboard.write([new ClipboardItem(items)]);
    status.textContent = data.area ? '이미지를 클립보드에 복사했습니다.' : '이미지와 정보를 복사했습니다.';
  } catch {
    status.textContent = '이미지를 복사하지 못했습니다. 이 탭에서 다시 눌러주세요.';
  }
}
copy.addEventListener('click', copyImage);
textCopy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(data.text);status.textContent='요소 정보를 복사했습니다.';}catch{status.textContent='복사하지 못했습니다. 다시 눌러주세요.';}});
