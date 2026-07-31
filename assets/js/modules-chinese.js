/* =========================================================
   语文模块：生字专区 / 句子积累 / 古诗词 / 小古文
   ========================================================= */
window.Modules = window.Modules || {};

/* 通用：完成打卡按钮 */
function doneBar(key,getInfo,tipText){
  const d=Store.day();
  const done=d.tasks[key]&&d.tasks[key].done;
  const wrap=el('div','card tint');
  wrap.innerHTML=`<div class="btnrow" style="justify-content:space-between">
    <div><b style="font-size:16px;color:var(--ink)">${done?'✅ 今日本项已完成':'🎯 完成后点击右侧打卡'}</b>
    <div class="muted">${tipText||''}</div></div></div>`;
  const btn=el('button','btn lg '+(done?'ghost':'green'),done?'已打卡':'完成打卡 ✓');
  if(done) btn.disabled=true;
  btn.onclick=()=>{
    const info=getInfo?getInfo():{};
    if(info===false) return;
    const r=Store.finish(key,info);
    btn.textContent='已打卡';btn.className='btn lg ghost';btn.disabled=true;
    let msg='打卡成功！';
    if(r.bonus) msg+=` 获得奖励积分 +${r.bonus}（${r.reasons.join('、')}）`;
    toast(msg,'ok',2600);
    App.refreshNav();
    if(Store.allDoneToday()) setTimeout(()=>App.celebrate(),600);
  };
  wrap.querySelector('.btnrow').appendChild(btn);
  return wrap;
}

/* 拍照上传组件 */
function photoUpload(key,label){
  const d=Store.day();
  const box=el('div','card');
  box.innerHTML=`<div class="card-h"><h2>📷 ${label}</h2><span class="tag">拍照上传打卡</span></div>
    <div class="muted" style="margin-bottom:10px">完成纸质作业后拍照上传，家长可随时查看。</div>`;
  const row=el('div','btnrow');
  const inp=el('input');inp.type='file';inp.accept='image/*';inp.capture='environment';inp.style.display='none';
  const btn=el('button','btn ghost','📸 选择/拍摄照片');
  const preview=el('div','btnrow');preview.style.marginTop='10px';
  function draw(){
    preview.innerHTML='';
    const p=Store.day().photos[key];
    if(p){
      const img=el('img','thumb');img.src=p;img.onclick=()=>modal('作业照片',`<img src="${p}" style="width:100%;border-radius:16px">`);
      const del=el('button','btn sm ghost','删除');
      del.onclick=()=>{delete Store.day().photos[key];Store.save();draw();};
      preview.appendChild(img);preview.appendChild(del);
    }else preview.innerHTML='<span class="muted">尚未上传</span>';
  }
  btn.onclick=()=>inp.click();
  inp.onchange=async()=>{
    if(!inp.files[0])return;
    try{
      const url=await compressImage(inp.files[0],560);
      Store.day().photos[key]=url;Store.save();draw();
      toast('照片已保存','ok');
    }catch(e){ toast('图片处理失败','err'); }
  };
  row.appendChild(btn);row.appendChild(inp);
  box.appendChild(row);box.appendChild(preview);draw();
  return box;
}

/* 录音组件 */
function recordBox(label,onDone){
  const box=el('div','card');
  box.innerHTML=`<div class="card-h"><h2>🎙️ ${label}</h2><span class="tag">录音提交</span></div>`;
  const row=el('div','btnrow');
  const btn=el('button','btn pink','● 开始录音');
  const status=el('span','muted','');
  const player=el('div','');player.style.marginTop='10px';
  let timer=null,sec=0;
  btn.onclick=async()=>{
    if(!Recorder.active()){
      try{
        await Recorder.start();
        sec=0;btn.textContent='■ 停止录音';btn.className='btn warm';
        status.innerHTML='<span class="rec-dot"></span> 录音中 0 秒';
        timer=setInterval(()=>{sec++;status.innerHTML=`<span class="rec-dot"></span> 录音中 ${sec} 秒`;},1000);
      }catch(e){ toast('无法使用麦克风，请检查权限','err'); }
    }else{
      clearInterval(timer);
      const blob=await Recorder.stop();
      btn.textContent='● 重新录音';btn.className='btn pink';
      status.textContent=`已录制 ${sec} 秒`;
      if(blob){
        const url=URL.createObjectURL(blob);
        player.innerHTML='';
        const a=el('audio');a.controls=true;a.src=url;a.style.width='100%';a.style.maxWidth='420px';
        player.appendChild(a);
        onDone&&onDone(sec);
      }
    }
  };
  row.appendChild(btn);row.appendChild(status);
  box.appendChild(row);box.appendChild(player);
  return box;
}

/* ---------------- 1. 生字专区 ---------------- */
Modules.hanzi = {
  title:'生字专区', icon:'📝', sub:'统编版五上（2026秋新版）写字表 · 每日20个',
  render(c){
    const di=Store.dayIndex(), n=Store.quota('hanzi');
    const list=pickDaily(DATA_HANZI,di,n);
    const learned=new Set((Store.day().tasks.hanzi&&Store.day().tasks.hanzi.learned)||[]);

    c.appendChild(el('div','hint','⚠️ 2026 秋新版语文教材生字词表已<b>全部更新</b>，旧版生字清单不能用来预习。本表来自新版写字表/识字表。'));

    const head=el('div','card');
    head.innerHTML=`<div class="card-h"><h2>📝 今日生字（第 ${Store.planDay()} 天）</h2>
      <span class="tag">共 ${list.length} 个</span><span class="tag new">2026秋新版</span></div>
      <div class="btnrow" style="margin-bottom:12px">
        <button class="btn sm" id="readAll">🔊 全部朗读</button>
        <button class="btn sm ghost" id="stopAll">⏹ 停止</button>
        <span class="muted">点击任意生字卡片 → 查看笔顺、组词、田字格描红</span>
      </div>`;
    const grid=el('div','grid g5');
    list.forEach((z,i)=>{
      const card=el('div','zi-card'+(learned.has(z.zi)?' learned':''));
      card.innerHTML=`<div class="sp">🔊</div><div class="py">${z.py}</div><div class="zi">${z.zi}</div>
        <div class="cz">${z.cz.join(' · ')}</div>`;
      card.onclick=()=>openZi(z,card,learned);
      card.querySelector('.sp').onclick=e=>{e.stopPropagation();Speech.zh(z.zi+'，'+z.cz[0]);};
      grid.appendChild(card);
    });
    head.appendChild(grid);
    c.appendChild(head);
    head.querySelector('#readAll').onclick=()=>Speech.seq(list.map(z=>z.zi+'，'+z.cz.join('，')),{lang:'zh-CN',rate:.92});
    head.querySelector('#stopAll').onclick=()=>Speech.stop();

    // 抄写词语任务
    const task=el('div','card tint');
    const words=list.flatMap(z=>z.cz).slice(0,20);
    task.innerHTML=`<div class="card-h"><h2>✍️ 抄写词语任务</h2><span class="tag warn">每词 2 遍</span></div>
      <div class="muted" style="margin-bottom:8px">请在作业本上抄写以下词语，每个 2 遍，注意笔顺与结构：</div>
      <div style="font-size:18px;line-height:2.2;color:var(--ink)">${words.map(w=>`<span style="display:inline-block;background:var(--primary-ghost);border-radius:10px;padding:2px 12px;margin:3px 5px 3px 0">${w}</span>`).join('')}</div>`;
    c.appendChild(task);

    c.appendChild(photoUpload('hanzi','抄写作业拍照上传'));

    c.appendChild(doneBar('hanzi',()=>{
      const lc=learned.size;
      if(!Store.day().photos.hanzi){
        let ok=false;
        modal('还没上传作业照片',`<p>建议先完成抄写并拍照上传，再打卡。</p><p class="muted">也可以选择「先打卡，稍后补传」。</p>`,
          [{label:'返回上传',cls:'ghost'},{label:'先打卡',fn:()=>{ok=true;const r=Store.finish('hanzi',{learned:[...learned],right:lc,total:list.length});App.refreshNav();App.go('hanzi');}}]);
        return false;
      }
      return {learned:[...learned],right:lc,total:list.length};
    },`已学会 ${learned.size}/${list.length} 个字 · 点击卡片可标记「学会了」`));
  }
};

function openZi(z,card,learned){
  const m=modal(`${z.zi}　${z.py}`,`
    <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start">
      <div class="tianzi"><div class="big">${z.zi}</div><div id="hw" style="position:absolute;inset:0"></div></div>
      <div style="flex:1;min-width:200px">
        <div class="note-item"><b>拼音</b><span>${z.py}</span></div>
        <div class="note-item"><b>笔画</b><span>${z.bh} 画</span></div>
        <div class="note-item"><b>组词</b><span>${z.cz.join('、')}</span></div>
        <div class="note-item"><b>出处</b><span>《${z.src}》（2026秋新版）</span></div>
        <div class="btnrow" style="margin-top:14px">
          <button class="btn sm" id="sp1">🔊 读生字</button>
          <button class="btn sm ghost" id="sp2">🔊 读组词</button>
          <button class="btn sm warm" id="stroke">✏️ 笔顺动画</button>
        </div>
        <div class="muted" style="margin-top:10px">笔顺动画需联网加载字形库；若无法加载，可对照右侧田字格描红练习。</div>
      </div>
    </div>`,
    [{label:learned.has(z.zi)?'取消「学会了」':'我学会了 ✓',cls:'green',fn:()=>{
        if(learned.has(z.zi)){learned.delete(z.zi);card.classList.remove('learned');}
        else{learned.add(z.zi);card.classList.add('learned');}
        const t=Store.day().tasks.hanzi||{};t.learned=[...learned];Store.day().tasks.hanzi=t;Store.save();
     }},{label:'关闭',cls:'ghost'}]);
  m.querySelector('#sp1').onclick=()=>Speech.zh(z.zi);
  m.querySelector('#sp2').onclick=()=>Speech.zh(z.cz.join('，'));
  m.querySelector('#stroke').onclick=()=>{
    const host=m.querySelector('#hw'); const big=m.querySelector('.big');
    host.innerHTML='';
    function run(){
      try{
        big.style.opacity='0';
        host.innerHTML='';
        const w=HanziWriter.create(host,z.zi,{width:150,height:150,padding:6,strokeAnimationSpeed:1,delayBetweenStrokes:220,strokeColor:'#3f9df5',showOutline:true});
        w.animateCharacter({onComplete:()=>{}});
      }catch(e){ big.style.opacity='1'; toast('笔顺字形库加载失败，请对照田字格描红','warn'); }
    }
    if(window.HanziWriter) run();
    else{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/hanzi-writer@3.5.0/dist/hanzi-writer.min.js';
      s.onload=run; s.onerror=()=>toast('笔顺动画需要联网，请对照田字格描红','warn');
      document.head.appendChild(s);
    }
  };
}

/* ---------------- 2. 句子积累 ---------------- */
Modules.sentence = {
  title:'句子积累', icon:'📖', sub:'新版课文经典句段 + 名言警句 · 每日5句',
  render(c){
    const di=Store.dayIndex(), n=Store.quota('sentence');
    const list=pickDaily(DATA_SENTENCE,di,n);
    const box=el('div','card');
    box.innerHTML=`<div class="card-h"><h2>📖 今日积累（第 ${Store.planDay()} 天）</h2>
      <span class="tag">${list.length} 句</span><span class="tag new">2026秋新版课文</span></div>
      <div class="btnrow" style="margin-bottom:12px">
        <button class="btn sm" id="all">🔊 示范朗读全部</button>
        <button class="btn sm ghost" id="slow">🐢 慢速朗读</button>
        <button class="btn sm ghost" id="stop">⏹ 停止</button></div>`;
    list.forEach((s,i)=>{
      const d=el('div','sentence');
      d.innerHTML=`<div class="acts"><button class="btn sm ghost">🔊</button></div>
        <div class="txt">${i+1}. ${s.t}</div>
        <div class="src">—— ${s.s}　<span style="color:#b48a3c">💡 ${s.tip}</span></div>`;
      d.querySelector('button').onclick=()=>Speech.zh(s.t,{rate:.92});
      box.appendChild(d);
    });
    c.appendChild(box);
    box.querySelector('#all').onclick=()=>Speech.seq(list.map(s=>s.t),{lang:'zh-CN',rate:.95});
    box.querySelector('#slow').onclick=()=>Speech.seq(list.map(s=>s.t),{lang:'zh-CN',rate:.7});
    box.querySelector('#stop').onclick=()=>Speech.stop();

    let secs=0;
    c.appendChild(recordBox('朗读作业：连读今日 5 句',s=>{secs=s;}));
    c.appendChild(doneBar('sentence',()=>({right:list.length,total:list.length,recSec:secs}),'先听示范 → 再自己朗读录音 → 打卡'));
  }
};

/* ---------------- 3. 古诗词 ---------------- */
Modules.poem = {
  title:'古诗词', icon:'🎋', sub:'统编版五上（2026秋新版）必背古诗 · 每日1首',
  render(c){
    const di=Store.dayIndex();
    const p=DATA_POEM[di%DATA_POEM.length];
    if(p.isNew) c.appendChild(el('div','hint','⭐ <b>新版新增篇目</b>：《早春呈水部张十八员外》由六年级下册移入五上，<b>替换已删除的《长相思》</b>。这是 2026 秋新教材的重点变化，务必掌握。'));

    const box=el('div','card');
    box.innerHTML=`<div class="card-h"><h2>🎋 今日古诗（第 ${Store.planDay()} 天）</h2>
      ${p.isNew?'<span class="tag new">⭐新增</span>':'<span class="tag">必背</span>'}</div>`;
    const poem=el('div','poem');
    poem.innerHTML=`<div class="title">${p.title}</div><div class="author">${p.author}</div>`;
    const lines=el('div');
    p.lines.forEach((L,i)=>{
      const s=el('div');
      const sp=el('span','line',L);
      sp.onclick=()=>{Speech.zh(L,{rate:.75});};
      s.appendChild(sp);lines.appendChild(s);
    });
    poem.appendChild(lines);
    box.appendChild(poem);
    const bar=el('div','btnrow');bar.style.justifyContent='center';bar.style.marginTop='12px';
    bar.innerHTML=`<button class="btn" id="recite">🎵 配乐朗诵示范</button>
      <button class="btn ghost" id="follow">🔁 逐句跟读</button>
      <button class="btn ghost" id="stop">⏹ 停止</button>`;
    box.appendChild(bar);
    c.appendChild(box);

    const lineEls=$$('.line',poem);
    bar.querySelector('#recite').onclick=()=>{
      Speech.seq(p.lines,{lang:'zh-CN',rate:.72,gap:400,
        onEach:i=>{lineEls.forEach(x=>x.classList.remove('playing'));lineEls[i].classList.add('playing');},
        onAll:()=>lineEls.forEach(x=>x.classList.remove('playing'))});
    };
    bar.querySelector('#follow').onclick=()=>{
      Speech.seq(p.lines.flatMap(l=>[l,l]),{lang:'zh-CN',rate:.7,gap:900,
        onEach:i=>{lineEls.forEach(x=>x.classList.remove('playing'));lineEls[Math.floor(i/2)].classList.add('playing');},
        onAll:()=>lineEls.forEach(x=>x.classList.remove('playing'))});
      toast('每句读两遍，第二遍请跟着一起读','ok',2600);
    };
    bar.querySelector('#stop').onclick=()=>Speech.stop();

    const ex=el('div','card');
    ex.innerHTML=`<div class="card-h"><h2>📘 注释与诗意</h2></div>
      ${p.notes.map(nn=>`<div class="note-item"><b>${nn[0]}</b><span>${nn[1]}</span></div>`).join('')}
      <div class="reveal" style="margin-top:12px"><b>诗意：</b>${p.mean}</div>
      <div class="reveal tip"><b>主题赏析：</b>${p.theme}</div>`;
    c.appendChild(ex);

    let secs=0;
    c.appendChild(recordBox('背诵录音提交',s=>{secs=s;}));
    c.appendChild(doneBar('poem',()=>{
      if(secs<5){ toast('先完成背诵录音（至少 5 秒）再打卡哦','warn'); return false; }
      return {right:1,total:1,recSec:secs,perfectRead:secs>=15};
    },'听示范 → 逐句跟读 → 背诵录音 → 打卡'));
  }
};

/* ---------------- 4. 小古文 ---------------- */
Modules.guwen = {
  title:'小古文', icon:'📜', sub:'《小学生小古文100课》· 每日1篇',
  render(c){
    const di=Store.dayIndex();
    const g=DATA_GUWEN[di%DATA_GUWEN.length];
    const box=el('div','card');
    box.innerHTML=`<div class="card-h"><h2>📜 ${g.title}</h2><span class="tag">${g.vol}</span>
      <span class="tag warn">第 ${Store.planDay()} 天</span></div>
      <div class="gw-text">${g.text}</div>
      <div class="btnrow" style="margin-top:14px">
        <button class="btn" id="read">🔊 诵读示范</button>
        <button class="btn ghost" id="slow">🐢 慢速逐句</button>
        <button class="btn ghost" id="stop">⏹ 停止</button></div>`;
    c.appendChild(box);
    const sents=[];let _b='';
    for(let i=0;i<g.text.length;i++){_b+=g.text[i];if(g.text[i]==='。'||g.text[i]==='！'||g.text[i]==='？'){sents.push(_b);_b='';}}
    if(_b)sents.push(_b);
    box.querySelector('#read').onclick=()=>Speech.seq(sents,{lang:'zh-CN',rate:.8,gap:320});
    box.querySelector('#slow').onclick=()=>Speech.seq(sents,{lang:'zh-CN',rate:.62,gap:700});
    box.querySelector('#stop').onclick=()=>Speech.stop();

    const ex=el('div','card');
    ex.innerHTML=`<div class="card-h"><h2>📘 注释</h2></div>
      ${g.notes.map(nn=>`<div class="note-item"><b>${nn[0]}</b><span>${nn[1]}</span></div>`).join('')}`;
    const rv=el('div','reveal');rv.style.display='none';rv.innerHTML=`<b>译文：</b>${g.trans}`;
    const tb=el('button','btn sm ghost','👀 显示译文');tb.style.marginTop='12px';
    tb.onclick=()=>{const s=rv.style.display==='none';rv.style.display=s?'block':'none';tb.textContent=s?'🙈 隐藏译文':'👀 显示译文';};
    ex.appendChild(tb);ex.appendChild(rv);
    c.appendChild(ex);

    // 趣味测试
    let quizOK=false;
    const qz=el('div','card tint');
    qz.innerHTML=`<div class="card-h"><h2>🧩 趣味小测试</h2><span class="tag">理解检测</span></div>
      <div style="font-size:16.5px;margin-bottom:12px;color:var(--ink)">${g.quiz.q}</div>`;
    const opts=shuffleSeed(g.quiz.o.map((t,i)=>({t,i})),di*31+7);
    opts.forEach(o=>{
      const b=el('button','opt',o.t);
      b.onclick=()=>{
        if(quizOK) return;
        if(o.i===g.quiz.a){b.classList.add('ok');quizOK=true;toast('答对啦！👏','ok');}
        else{b.classList.add('no');toast('再想想～可以看看注释','warn');}
      };
      qz.appendChild(b);
    });
    c.appendChild(qz);

    let secs=0;
    c.appendChild(recordBox('朗读录音提交',s=>{secs=s;}));
    c.appendChild(doneBar('guwen',()=>({right:quizOK?1:0,total:1,recSec:secs}),'诵读示范 → 看注释译文 → 做小测试 → 朗读录音'));
  }
};
