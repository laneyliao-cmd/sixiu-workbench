/* =========================================================
   二维码一键传档（免后端）
   发送端：备份(剔除照片) → LZ 压缩 → 分片 → 多张二维码
   接收端：摄像头扫码 → 按序拼回 → 解压 → 导入
   依赖：QRCode(qrcodejs) / jsQR / LZString（在 index.html 中先于本文件加载）
   ========================================================= */
const Transfer = (function(){
  const PREFIX = 'SWX1|';        // 分片协议标识
  const CHUNK  = 700;            // 每张二维码承载的 base64 字符数（控制在可扫范围内）
  const MAXQR  = 60;             // 超过此数量建议改用文件导出

  /* ---------- 发送端 ---------- */
  function openSender(){
    if(typeof QRCode==='undefined' || typeof LZString==='undefined'){
      toast('二维码组件未加载，请刷新页面','err',4000); return;
    }
    const S = Store.state();
    // 剔除作业照片，避免二维码体积爆掉
    const clone = JSON.parse(JSON.stringify(S));
    Object.keys(clone.days||{}).forEach(d=>{ if(clone.days[d] && clone.days[d].photos) delete clone.days[d].photos; });
    const json  = JSON.stringify(clone);
    const comp  = LZString.compressToBase64(json);
    const total = Math.max(1, Math.ceil(comp.length / CHUNK));

    const note = el('div','hint', `请在另一台设备打开「设置 → 扫码导入」，将下方 <b>${total}</b> 张二维码<b>依次扫完</b>（顺序不限，扫到自动记录）。<br>为控制体积，作业<b>照片</b>不通过二维码传输；照片可用「导出备份」文件保留。`);
    if(total>MAXQR) note.insertAdjacentHTML('beforeend', `<div class="muted" style="margin-top:6px">⚠️ 内容较多（${total} 张），如不方便可改用「导出备份」文件传输。</div>`);

    const area = el('div','qr-grid');
    for(let i=0;i<total;i++){
      const chunk = comp.slice(i*CHUNK,(i+1)*CHUNK);
      const payload = PREFIX + total + '|' + (i+1) + '|' + chunk;
      const cell = el('div','qr-cell');
      const box  = el('div','qr-box');
      cell.appendChild(box);
      cell.appendChild(el('div','qr-idx', (i+1)+'/'+total));
      area.appendChild(cell);
      // qrcodejs 需要元素已在文档中，延后一帧生成
      setTimeout(()=>{ try{ new QRCode(box,{text:payload,width:120,height:120,correctLevel:QRCode.CorrectLevel.M}); }
        catch(e){ box.textContent='生成失败'; } }, 0);
    }

    const m = modal('📤 传档二维码（'+total+' 张）', '', [{label:'完成',cls:'green'}]);
    m.classList.add('wide');
    const body = m.querySelector('.mbody'); body.innerHTML=''; body.appendChild(note); body.appendChild(area);
  }

  /* ---------- 接收端 ---------- */
  function openReceiver(){
    if(typeof jsQR==='undefined' || typeof LZString==='undefined'){
      toast('扫码组件未加载，请刷新页面','err',4000); return;
    }
    const wrap = el('div');
    wrap.innerHTML =
      `<div class="hint">将摄像头对准发送端屏幕上的二维码，按序扫描全部分片（顺序不限）。</div>
       <div class="scan-wrap"><video id="sv" class="scan-video" playsinline></video><canvas id="sc" class="scan-canvas"></canvas></div>
       <div class="scan-prog" id="sp">已接收 0 / ?</div>`;

    const m = modal('📷 扫码导入', '', [{label:'取消',cls:'ghost',fn:()=>{ stop(); m.remove(); return false; }}]);
    m.classList.add('wide');
    const body = m.querySelector('.mbody'); body.innerHTML=''; body.appendChild(wrap);

    const chunks = {}; let total=0, done=0, stream=null, raf=null;
    const video = wrap.querySelector('#sv'), canvas = wrap.querySelector('#sc'), sp = wrap.querySelector('#sp');
    function stop(){ if(raf) cancelAnimationFrame(raf); if(stream) stream.getTracks().forEach(t=>t.stop()); }
    // 点击遮罩关闭时也停止摄像头
    if(m.parentNode) m.parentNode.addEventListener('click', e=>{ if(e.target===m.parentNode) stop(); });

    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      sp.textContent='摄像头不可用（需用 https 或 localhost 打开本页面）';
      toast('当前环境不支持摄像头','err',5000); return;
    }
    navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(s=>{
      stream=s; video.srcObject=s; video.play();
      const tick=()=>{
        if(video.readyState===video.HAVE_ENOUGH_DATA){
          canvas.width=video.videoWidth; canvas.height=video.videoHeight;
          const ctx=canvas.getContext('2d'); ctx.drawImage(video,0,0,canvas.width,canvas.height);
          const img=ctx.getImageData(0,0,canvas.width,canvas.height);
          const res=jsQR(img.data,img.width,img.height);
          if(res && res.data && res.data.indexOf(PREFIX)===0){
            const p=res.data.split('|');
            if(p.length>=4){ const t=+p[1], idx=+p[2], ch=p.slice(3).join('|');
              if(idx>=1 && idx<=t && !chunks[idx]){ chunks[idx]=ch; done++; total=t; sp.textContent='已接收 '+done+' / '+total;
                if(done>=total) finish();
              }
            }
          }
        }
        raf=requestAnimationFrame(tick);
      };
      tick();
    }).catch(e=>{ sp.textContent='无法访问摄像头：'+(e.message||e); toast('摄像头打开失败','err',5000); });

    function finish(){
      stop();
      try{
        const comp = Object.keys(chunks).sort((a,b)=>a-b).map(k=>chunks[k]).join('');
        const json = LZString.decompressFromBase64(comp);
        if(!json || !Store.importJSON(json)){ toast('二维码数据损坏，请重新扫描','err',5000); return; }
        toast('导入成功！正在刷新…','ok');
        setTimeout(()=>location.reload(), 900);
      }catch(e){ toast('导入失败：'+(e.message||e),'err',5000); }
    }
  }

  return {openSender, openReceiver};
})();
