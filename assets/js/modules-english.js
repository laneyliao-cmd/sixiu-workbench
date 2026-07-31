/* =========================================================
   英语模块：单词 / 句子 / 阅读 / 听力（人教PEP五上 2026秋新版）
   ========================================================= */
window.Modules = window.Modules || {};

const enSay = (t,o)=>Speech.en(t,Object.assign({uk:Store.state().settings.uk},o||{}));

/* 兼容旧版 Safari/iPad 的英文分句：在「终止符 . ! ? " 之后的空白」处断句（等价于后行断言，但全浏览器安全） */
function enSplit(text){
  const out=[];let buf='';
  const term={'.':1,'!':1,'?':1,'"':1};
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(/\s/.test(ch)){
      const last=buf[buf.length-1];
      if(term[last]){ out.push(buf); buf=''; let j=i; while(j<text.length&&/\s/.test(text[j])) j++; i=j-1; }
      else buf+=ch;
    } else buf+=ch;
  }
  if(buf) out.push(buf);
  return out;
}

/* ---------------- 7. 英语单词 ---------------- */
Modules.word = {
  title:'英语单词', icon:'🔤', sub:'人教PEP五上（2026秋新版）词汇 · 每日20个（10新+10复盘）',
  render(c){
    const di=Store.dayIndex();
    const total=Store.quota('word');                    // 补救时翻倍
    const nNew=Math.round(total/2), nRev=total-nNew;
    const fresh=pickDaily(DATA_WORD,di,nNew);
    // 复盘：优先错题本，不足用前几天学过的词补齐
    const wrongs=Store.reviewWords(nRev).map(w=>({en:w.en,ph:w.ph,cn:w.cn,u:w.u,_rv:true}));
    const back=pickDaily(DATA_WORD,Math.max(0,di-1),nRev,777).map(w=>Object.assign({_rv:true},w));
    const review=[...wrongs,...back.filter(b=>!wrongs.some(w=>w.en===b.en))].slice(0,nRev);
    const list=[...fresh,...review];

    if(Store.state().rescue.pending)
      c.appendChild(el('div','hint','💪 <b>补救模式已开启</b>：今日单词量翻倍复盘（${total} 个），完成后可追回一半被扣积分。'.replace('${total}',total)));

    const uInfo=DATA_EN_UNITS.find(u=>u.u===fresh[0].u)||DATA_EN_UNITS[0];
    const head=el('div','card tint');
    head.innerHTML=`<div class="card-h"><h2>📗 ${uInfo.u} ${uInfo.now}</h2><span class="tag new">2026秋新版主题</span></div>
      <div class="muted">旧版主题：<s>${uInfo.old}</s>　→　新版：<b style="color:var(--primary-deep)">${uInfo.now}</b></div>
      <div class="muted">核��语法：${uInfo.gram}　|　Big Question：<i>${uInfo.big}</i></div>`;
    c.appendChild(head);

    /* --- 阶段一：认读 --- */
    const box=el('div','card');
    box.innerHTML=`<div class="card-h"><h2>🔤 今日词汇（第 ${Store.planDay()} 天）</h2>
      <span class="tag">${nNew} 新词 + ${review.length} 复盘</span></div>
      <div class="btnrow" style="margin-bottom:12px">
        <button class="btn sm" id="all">🔊 全部朗读</button>
        <button class="btn sm ghost" id="hide">🙈 遮住中文</button>
        <button class="btn sm ghost" id="uk">🇬🇧 切换英/美音</button>
        <button class="btn sm ghost" id="stop">⏹ 停止</button></div>`;
    const grid=el('div','grid g4');
    list.forEach(w=>{
      const d=el('div','word-card');
      d.innerHTML=`<div class="u">${w.u}</div>${w._rv?'<div class="rv">复盘</div>':''}
        <div class="en">${w.en}</div><div class="ph">${w.ph}</div><div class="cn">${w.cn}</div>`;
      d.onclick=()=>enSay(w.en);
      grid.appendChild(d);
    });
    box.appendChild(grid);c.appendChild(box);
    box.querySelector('#all').onclick=()=>Speech.seq(list.map(w=>w.en),{lang:Store.state().settings.uk?'en-GB':'en-US',rate:.85,gap:500});
    box.querySelector('#hide').onclick=e=>{const on=grid.classList.toggle('hidden-cn');$$('.word-card',grid).forEach(x=>x.classList.toggle('hide-cn'));e.target.textContent=on?'👀 显示中文':'🙈 遮住中文';};
    box.querySelector('#uk').onclick=()=>{const s=Store.state().settings;s.uk=!s.uk;Store.save();toast('已切换为 '+(s.uk?'英式发音 🇬🇧':'美式发音 🇺🇸'),'ok');};
    box.querySelector('#stop').onclick=()=>Speech.stop();

    /* --- 阶段二：中文释义默写 --- */
    const t2=el('div','card');
    t2.innerHTML=`<div class="card-h"><h2>✍️ 第二关：中文释义默写</h2><span class="tag">看英文写中文</span></div>
      <div class="muted" style="margin-bottom:10px">填写词义关键词即可（如 "勤奋" 可匹配 "勤奋的"）。</div>`;
    const g2=el('div','grid g3');
    const cnInputs=[];
    list.forEach(w=>{
      const d=el('div','calc-item');
      d.innerHTML=`<div class="q" style="font-size:17px">${w.en}</div>`;
      const inp=el('input');inp.style.width='130px';inp.placeholder='中文意思';
      d.appendChild(inp);const a=el('div','ans','');d.appendChild(a);
      g2.appendChild(d);cnInputs.push({w,inp,d,a});
    });
    t2.appendChild(g2);
    const b2=el('div','btnrow');b2.style.marginTop='12px';
    const chk2=el('button','btn green','✅ 检测释义');
    const sc2=el('span','muted','');
    b2.append(chk2,sc2);t2.appendChild(b2);
    c.appendChild(t2);
    let cnRight=0,cnChecked=false;
    chk2.onclick=()=>{
      cnRight=0;
      cnInputs.forEach(o=>{
        const v=o.inp.value.trim();
        const key=o.w.cn.replace(/^[a-z]+\.\s*/,'').replace(/（.*?）/g,'');
        const ok=v&&(key.includes(v)||v.includes(key.slice(0,2)));
        o.d.classList.remove('right','wrong');
        o.d.classList.add(ok?'right':'wrong');
        o.a.textContent=ok?'✓':o.w.cn;
        if(ok)cnRight++; else Store.addWrong('word',{k:o.w.en,en:o.w.en,ph:o.w.ph,cn:o.w.cn,u:o.w.u});
      });
      cnChecked=true;
      sc2.innerHTML=`释义正确 <b>${cnRight}/${list.length}</b>`;
    };

    /* --- 阶段三：拼写检测 --- */
    const t3=el('div','card');
    t3.innerHTML=`<div class="card-h"><h2>🔠 第三关：拼写检测</h2><span class="tag">看中文拼英文</span></div>`;
    const g3=el('div','grid g3');
    const spInputs=[];
    shuffleSeed(list,di*13+5).forEach(w=>{
      const d=el('div','calc-item');
      d.innerHTML=`<div class="q" style="font-size:15px">${w.cn}</div>`;
      const inp=el('input');inp.style.width='150px';inp.placeholder='英文';inp.autocapitalize='off';inp.spellcheck=false;
      d.appendChild(inp);const a=el('div','ans','');d.appendChild(a);
      g3.appendChild(d);spInputs.push({w,inp,d,a});
    });
    t3.appendChild(g3);
    const b3=el('div','btnrow');b3.style.marginTop='12px';
    const chk3=el('button','btn green','✅ 检测拼写');
    const sc3=el('span','muted','');
    b3.append(chk3,sc3);t3.appendChild(b3);
    c.appendChild(t3);
    let spRight=0,spChecked=false;
    chk3.onclick=()=>{
      spRight=0;
      spInputs.forEach(o=>{
        const ok=o.inp.value.trim().toLowerCase()===o.w.en.toLowerCase();
        o.d.classList.remove('right','wrong');
        o.d.classList.add(ok?'right':'wrong');
        o.a.textContent=ok?'✓':o.w.en;
        if(ok)spRight++; else Store.addWrong('word',{k:o.w.en,en:o.w.en,ph:o.w.ph,cn:o.w.cn,u:o.w.u});
      });
      spChecked=true;
      sc3.innerHTML=`拼写正确 <b>${spRight}/${list.length}</b>`;
      if(spRight<list.length) toast('错词已自动进入错题本，明天优先复盘','warn',2600);
    };

    /* --- 阶段四：听写 --- */
    const t4=el('div','card tint');
    t4.innerHTML=`<div class="card-h"><h2>🎧 第四关：听写</h2><span class="tag">听发音写单词</span></div>
      <div class="btnrow" style="margin-bottom:10px">
        <button class="btn" id="dstart">▶ 开始听写（每词读2遍）</button>
        <button class="btn ghost" id="dagain">🔁 重听本词</button>
        <button class="btn ghost" id="dstop">⏹ 停止</button>
        <span class="chip" id="dpos">0 / ${list.length}</span></div>`;
    const dInp=el('input','inp');dInp.placeholder='听到什么就写什么，回车确认下一个';dInp.style.maxWidth='420px';
    const dLog=el('div','grid g4');dLog.style.marginTop='12px';
    t4.append(dInp,dLog);c.appendChild(t4);
    let dIdx=0,dRight=0,dOrder=shuffleSeed(list,di*7+3),dRunning=false;
    const dpos=t4.querySelector('#dpos');
    function dSay(){ enSay(dOrder[dIdx].en,{rate:.8}); setTimeout(()=>enSay(dOrder[dIdx].en,{rate:.72}),1200); }
    t4.querySelector('#dstart').onclick=()=>{dIdx=0;dRight=0;dLog.innerHTML='';dRunning=true;dpos.textContent=`1 / ${dOrder.length}`;dInp.value='';dInp.focus();dSay();};
    t4.querySelector('#dagain').onclick=()=>{if(dRunning)dSay();};
    t4.querySelector('#dstop').onclick=()=>{dRunning=false;Speech.stop();};
    dInp.addEventListener('keydown',e=>{
      if(e.key!=='Enter'||!dRunning)return;
      const w=dOrder[dIdx];
      const ok=dInp.value.trim().toLowerCase()===w.en.toLowerCase();
      if(ok)dRight++; else Store.addWrong('word',{k:w.en,en:w.en,ph:w.ph,cn:w.cn,u:w.u});
      const chip=el('div','word-card');
      chip.style.borderColor=ok?'#8fdcbb':'#ffa8a8';
      chip.innerHTML=`<div class="en" style="font-size:16px">${w.en}</div><div class="cn">${ok?'✓ 正确':'✗ 你写：'+(dInp.value.trim()||'空')}</div>`;
      dLog.appendChild(chip);
      dIdx++;dInp.value='';
      if(dIdx>=dOrder.length){dRunning=false;dpos.textContent=`完成 ${dRight}/${dOrder.length}`;toast(`听写完成：${dRight}/${dOrder.length}`,'ok');return;}
      dpos.textContent=`${dIdx+1} / ${dOrder.length}`;
      setTimeout(dSay,400);
    });

    c.appendChild(photoUpload('word','默写作业本拍照上传'));

    c.appendChild(doneBar('word',()=>{
      if(!cnChecked&&!spChecked){toast('请至少完成「释义默写」或「拼写检测」','warn');return false;}
      const right=cnRight+spRight+dRight, tot=list.length*(1+(spChecked?1:0)+(dIdx>0?1:0))||list.length;
      return {right,total:cnChecked&&spChecked?list.length*2+(dIdx>0?list.length:0):tot,cnRight,spRight,dRight};
    },'认读 → 释义默写 → 拼写检测 → 听写 → 拍照上传'));
  }
};

/* ---------------- 8. 英语句子 ---------------- */
Modules.ensent = {
  title:'英语句子', icon:'💬', sub:'新版各单元 Let\'s talk 核心句型 · 每日8句',
  render(c){
    const di=Store.dayIndex(), n=Store.quota('ensent');
    const list=pickDaily(DATA_EN_SENT,di,n);
    const box=el('div','card');
    box.innerHTML=`<div class="card-h"><h2>💬 今日句型（第 ${Store.planDay()} 天）</h2>
      <span class="tag">${list.length} 句</span><span class="tag new">2026秋新版</span></div>
      <div class="btnrow" style="margin-bottom:12px">
        <button class="btn sm" id="all">🔊 全部朗读</button>
        <button class="btn sm ghost" id="hide">🙈 遮住中文</button>
        <button class="btn sm ghost" id="stop">⏹ 停止</button></div>`;
    list.forEach((s,i)=>{
      const d=el('div','en-sent');
      d.innerHTML=`<div class="btnrow" style="justify-content:space-between;align-items:flex-start">
          <div style="flex:1"><div class="en">${i+1}. ${s.en}</div><div class="cn">${s.cn}</div></div>
          <div class="btnrow">
            <span class="chip">${s.u}</span>
            <button class="btn sm ghost sp">🔊</button>
            <button class="btn sm ghost sl">🐢</button></div>
        </div>
        <div class="ex"><b style="color:var(--primary-deep)">【${s.type}】</b>${s.task}</div>`;
      const inp=el('input','inp');inp.placeholder='在这里写下你的答案…';inp.style.marginTop='8px';
      d.querySelector('.ex').appendChild(inp);
      d.querySelector('.sp').onclick=()=>enSay(s.en);
      d.querySelector('.sl').onclick=()=>enSay(s.en,{rate:.62});
      box.appendChild(d);
    });
    c.appendChild(box);
    box.querySelector('#all').onclick=()=>Speech.seq(list.map(s=>s.en),{lang:Store.state().settings.uk?'en-GB':'en-US',rate:.85,gap:600});
    box.querySelector('#hide').onclick=e=>{const on=box.classList.toggle('hc');$$('.en-sent .cn',box).forEach(x=>x.style.filter=on?'blur(6px)':'none');e.target.textContent=on?'👀 显示中文':'🙈 遮住中文';};
    box.querySelector('#stop').onclick=()=>Speech.stop();

    // 句型转换小练习（自动生成填空）
    const q=el('div','card tint');
    q.innerHTML=`<div class="card-h"><h2>🧩 句型转换小练</h2><span class="tag">一般现在时三单 / 现在进行时</span></div>`;
    const drills=[
      {q:"She ____ (go) to school at seven.",a:"goes",tip:"主语是第三人称单数 She，动词用三单形式；go 以 o 结尾加 es。"},
      {q:"He ____ (do) his homework carefully.",a:"does",tip:"do 的三单形式是 does。"},
      {q:"My father ____ (watch) TV after dinner.",a:"watches",tip:"watch 以 ch 结尾，三单加 es。"},
      {q:"Look! They ____ (play) football now.",a:"are playing",tip:"看到 Look! / now 用现在进行时：be + doing。"},
      {q:"The baby ____ (sleep) at the moment.",a:"is sleeping",tip:"at the moment 表示此刻，用现在进行时；主语单数用 is。"},
      {q:"____ she like drawing? Yes, she ____ .",a:"Does / does",tip:"三单一般疑问句用 Does 提问，肯定回答 Yes, she does."},
      {q:"I ____ (not like) carrots.",a:"don't like",tip:"主语 I 用 don't + 动词原形。"},
      {q:"Tom and Amy ____ (be) good friends.",a:"are",tip:"主语是复数，be 动词用 are。"}
    ];
    const dl=pickDaily(drills,di,4,3);
    const dins=[];
    dl.forEach(d=>{
      const row=el('div','calc-item');row.style.marginBottom='9px';
      row.innerHTML=`<div class="q" style="font-size:16px">${d.q}</div>`;
      const i=el('input');i.style.width='150px';i.placeholder='填空';
      row.appendChild(i);const a=el('div','ans','');row.appendChild(a);
      q.appendChild(row);dins.push({d,i,row,a});
    });
    const bar=el('div','btnrow');bar.style.marginTop='10px';
    const ck=el('button','btn green','✅ 批改');const sc=el('span','muted','');
    bar.append(ck,sc);q.appendChild(bar);
    const tipBox=el('div');q.appendChild(tipBox);
    c.appendChild(q);
    let dRight=0,dChecked=false;
    ck.onclick=()=>{
      dRight=0;tipBox.innerHTML='';
      dins.forEach(o=>{
        const ok=o.i.value.trim().toLowerCase().replace(/\s+/g,' ')===o.d.a.toLowerCase();
        o.row.classList.remove('right','wrong');o.row.classList.add(ok?'right':'wrong');
        o.a.textContent=ok?'✓':o.d.a;
        if(ok)dRight++;
        else{ const t=el('div','reveal tip');t.innerHTML=`<b>${o.d.q}</b>　答案：<b>${o.d.a}</b><br>💡 ${o.d.tip}`;tipBox.appendChild(t); }
      });
      dChecked=true;sc.innerHTML=`正确 <b>${dRight}/${dins.length}</b>`;
    };

    c.appendChild(doneBar('ensent',()=>({right:dRight,total:dins.length}),'听读句型 → 完成仿写/翻译 → 句型转换小练'));
  }
};

/* ---------------- 9. 英语阅读 ---------------- */
Modules.enread = {
  title:'英语阅读', icon:'📚', sub:'Reading time 板块 + 趣味小故事 · 每日1篇（100-150词）',
  render(c){
    const di=Store.dayIndex(), n=Store.quota('enread');
    const arts=[];
    for(let i=0;i<n;i++) arts.push(DATA_EN_READ[(di+i)%DATA_EN_READ.length]);
    if(n>1) c.appendChild(el('div','hint','💪 <b>补救模式</b>：今日额外加练 1 篇短文，完成后可追回一半被扣积分。'));

    let allRight=0,allTotal=0,readSec=0;
    arts.forEach((a,ai)=>{
      const box=el('div','card');
      box.innerHTML=`<div class="card-h"><h2>📚 ${a.t}</h2><span class="tag">${a.u}</span>
        <span class="tag warn">难度 ${a.lv}</span>${ai>0?'<span class="tag new">加练</span>':''}</div>
        <div class="btnrow" style="margin-bottom:12px">
          <button class="btn sm rall">🔊 全文朗读</button>
          <button class="btn sm ghost rslow">🐢 慢速复读</button>
          <button class="btn sm ghost rfollow">🔁 逐句跟读</button>
          <button class="btn sm ghost racc">🇬🇧/🇺🇸 双发音</button>
          <button class="btn sm ghost rstop">⏹ 停止</button>
          <span class="muted">👆 点句子听整句，点单词听单词</span>
        </div>`;
      const art=el('div','reading');
      const sents=[];
      a.p.forEach(par=>{
        const p=el('p');
        enSplit(par).forEach(s=>{
          const sp=el('span','s');
          s.split(/(\s+)/).forEach(tk=>{
            if(/^\s+$/.test(tk)){sp.appendChild(document.createTextNode(tk));return;}
            const w=el('span','w',tk);
            w.onclick=e=>{e.stopPropagation();enSay(tk.replace(/[^A-Za-z'-]/g,''));};
            sp.appendChild(w);
          });
          sp.appendChild(document.createTextNode(' '));
          sp.onclick=()=>{ $$('.s',art).forEach(x=>x.classList.remove('playing')); sp.classList.add('playing');
            enSay(s,{rate:.85}); setTimeout(()=>sp.classList.remove('playing'),s.length*70); };
          p.appendChild(sp); sents.push({s,sp});
        });
        art.appendChild(p);
      });
      box.appendChild(art);
      c.appendChild(box);

      const lang=()=>Store.state().settings.uk?'en-GB':'en-US';
      box.querySelector('.rall').onclick=()=>Speech.seq(sents.map(x=>x.s),{lang:lang(),rate:.88,gap:220,
        onEach:i=>{sents.forEach(x=>x.sp.classList.remove('playing'));sents[i].sp.classList.add('playing');},
        onAll:()=>sents.forEach(x=>x.sp.classList.remove('playing'))});
      box.querySelector('.rslow').onclick=()=>Speech.seq(sents.map(x=>x.s),{lang:lang(),rate:.62,gap:400,
        onEach:i=>{sents.forEach(x=>x.sp.classList.remove('playing'));sents[i].sp.classList.add('playing');},
        onAll:()=>sents.forEach(x=>x.sp.classList.remove('playing'))});
      box.querySelector('.rfollow').onclick=()=>{
        toast('每句读一遍后留白，请跟读','ok',2400);
        Speech.seq(sents.map(x=>x.s),{lang:lang(),rate:.8,gap:1600,
          onEach:i=>{sents.forEach(x=>x.sp.classList.remove('playing'));sents[i].sp.classList.add('playing');},
          onAll:()=>sents.forEach(x=>x.sp.classList.remove('playing'))});
      };
      box.querySelector('.racc').onclick=()=>{
        const s=Store.state().settings;s.uk=!s.uk;Store.save();
        toast('已切换为 '+(s.uk?'英式 🇬🇧':'美式 🇺🇸')+' 发音','ok');
      };
      box.querySelector('.rstop').onclick=()=>Speech.stop();

      // 理解题
      const qz=el('div','card tint');
      qz.innerHTML=`<div class="card-h"><h2>❓ 阅读理解</h2><span class="tag">${a.q.length} 题</span></div>`;
      a.q.forEach((qq,qi)=>{
        allTotal++;
        const d=el('div');d.style.marginBottom='14px';
        d.innerHTML=`<div style="font-size:16px;font-weight:700;color:var(--ink);margin-bottom:8px">${qi+1}. ${qq.q}</div>`;
        let done=false;
        shuffleSeed(qq.o.map((t,i)=>({t,i})),di*17+qi*5+ai).forEach(o=>{
          const b=el('button','opt',o.t);
          b.onclick=()=>{
            if(done)return;
            if(o.i===qq.a){b.classList.add('ok');allRight++;done=true;toast('Correct! 👏','ok');}
            else{b.classList.add('no');done=true;
              Store.addWrong('read',{k:a.t+qq.q,q:qq.q,a:qq.o[qq.a],art:a.t});
              $$('button.opt',d).forEach(x=>{if(x.textContent===qq.o[qq.a])x.classList.add('ok');});
              toast('再读一遍原文找答案','warn');}
          };
          d.appendChild(b);
        });
        qz.appendChild(d);
      });
      c.appendChild(qz);
    });

    // 录音对比打分
    const rec=el('div','card');
    rec.innerHTML=`<div class="card-h"><h2>🎙️ 朗读录音 · 对比打分</h2><span class="tag warn">录音提交</span></div>
      <div class="muted" style="margin-bottom:10px">先听示范，再录下自己的朗读，播放对比。系统按时长与流利度给出参考分。</div>`;
    const rrow=el('div','btnrow');
    const rbtn=el('button','btn pink','● 开始录音');
    const rst=el('span','muted','');
    const rply=el('div','');rply.style.marginTop='10px';
    let rtimer=null,rsec=0,score=0;
    const expect=Math.round(arts[0].p.join(' ').split(/\s+/).length/2.2); // 期望秒数
    rbtn.onclick=async()=>{
      if(!Recorder.active()){
        try{ await Recorder.start(); rsec=0;rbtn.textContent='■ 停止录音';rbtn.className='btn warm';
          rst.innerHTML='<span class="rec-dot"></span> 录音中 0 秒';
          rtimer=setInterval(()=>{rsec++;rst.innerHTML=`<span class="rec-dot"></span> 录音中 ${rsec} 秒`;},1000);
        }catch(e){toast('无法使用麦克风，请检查权限','err');}
      }else{
        clearInterval(rtimer);
        const blob=await Recorder.stop();
        rbtn.textContent='● 重新录音';rbtn.className='btn pink';
        const diff=Math.abs(rsec-expect)/expect;
        score=Math.max(50,Math.round(100-diff*70));
        readSec=rsec;
        rst.innerHTML=`录制 ${rsec} 秒（参考时长约 ${expect} 秒）　参考评分 <b style="color:${score>=90?'#2b8f66':'#c9781c'}">${score} 分</b>`;
        if(blob){ rply.innerHTML='';const au=el('audio');au.controls=true;au.src=URL.createObjectURL(blob);au.style.width='100%';au.style.maxWidth='440px';rply.appendChild(au); }
      }
    };
    rrow.append(rbtn,rst);rec.append(rrow,rply);c.appendChild(rec);

    c.appendChild(doneBar('enread',()=>({right:allRight,total:allTotal,recSec:readSec,perfectRead:score>=90}),
      '点读单词 → 逐句跟读 → 做理解题 → 录音对比打分'));
  }
};

/* ---------------- 10. 英语听力 ---------------- */
Modules.enlisten = {
  title:'英语听力', icon:'🎧', sub:'新版单元配套听力 · 每日3分钟短句训练',
  render(c){
    const di=Store.dayIndex();
    const list=pickDaily(DATA_EN_LISTEN,di,8);   // 约3分钟
    let idx=0,right=0,answered=0;

    c.appendChild(el('div','hint blue','🎧 题型完全贴合<b>单元测试听力</b>：听句选意 / 听问选答 / 听对话选答案 / 听句判断 / 听词选义。每题可重听 3 次。'));

    const box=el('div','card');
    box.innerHTML=`<div class="card-h"><h2>🎧 听力训练（第 ${Store.planDay()} 天）</h2>
      <span class="tag">${list.length} 题 · 约3分钟</span></div>
      <div class="btnrow" style="justify-content:space-between;margin-bottom:14px">
        <div><b style="font-size:17px;color:var(--ink)" id="qtype"></b>
          <div class="muted" id="qpos"></div></div>
        <div class="btnrow">
          <button class="btn" id="playb">🔊 播放</button>
          <button class="btn ghost" id="slowb">🐢 慢速</button>
          <span class="chip warm" id="left">可重听 3 次</span>
        </div></div>`;
    const optBox=el('div');box.appendChild(optBox);
    const navBar=el('div','btnrow');navBar.style.marginTop='14px';navBar.style.justifyContent='space-between';
    navBar.innerHTML=`<div class="muted" id="prog"></div>`;
    const nextB=el('button','btn green','下一题 →');
    navBar.appendChild(nextB);box.appendChild(navBar);
    c.appendChild(box);

    const scriptBox=el('div','card');
    scriptBox.innerHTML=`<div class="card-h"><h2>📄 听力原文（做完再看）</h2></div>`;
    const scWrap=el('div');scWrap.style.display='none';
    const scBtn=el('button','btn sm ghost','👀 显示原文');
    scBtn.onclick=()=>{const s=scWrap.style.display==='none';scWrap.style.display=s?'block':'none';scBtn.textContent=s?'🙈 隐藏原文':'👀 显示原文';};
    scriptBox.append(scBtn,scWrap);
    c.appendChild(scriptBox);

    let plays=0;
    function render(){
      const q=list[idx];plays=0;
      box.querySelector('#qtype').textContent=q.type;
      box.querySelector('#qpos').textContent=`单元 ${q.u}　第 ${idx+1} 题 / 共 ${list.length} 题`;
      box.querySelector('#left').textContent='可重听 3 次';
      box.querySelector('#prog').innerHTML=`已答 <b>${answered}</b> 题　正确 <b style="color:var(--ok)">${right}</b> 题`;
      optBox.innerHTML='';
      let done=false;
      shuffleSeed(q.o.map((t,i)=>({t,i})),di*23+idx*11).forEach(o=>{
        const b=el('button','opt',o.t);
        b.onclick=()=>{
          if(done)return;done=true;answered++;
          if(o.i===q.a){b.classList.add('ok');right++;toast('答对了！','ok');}
          else{b.classList.add('no');
            Store.addWrong('listen',{k:q.audio,q:q.audio,a:q.o[q.a],type:q.type});
            $$('button.opt',optBox).forEach(x=>{if(x.textContent===q.o[q.a])x.classList.add('ok');});
            toast('再听一遍原文','warn');}
          box.querySelector('#prog').innerHTML=`已答 <b>${answered}</b> 题　正确 <b style="color:var(--ok)">${right}</b> 题`;
          const line=el('div','note-item');
          line.innerHTML=`<b>${idx+1}.</b><span>${q.audio}　<span class="muted">（答案：${q.o[q.a]}）</span></span>`;
          scWrap.appendChild(line);
        };
        optBox.appendChild(b);
      });
      setTimeout(()=>play(),350);
    }
    function play(slow){
      const q=list[idx];
      if(plays>=3){toast('本题重听次数已用完','warn');return;}
      plays++;box.querySelector('#left').textContent=`可重听 ${3-plays} 次`;
      enSay(q.audio,{rate:slow?.65:.85});
    }
    box.querySelector('#playb').onclick=()=>play(false);
    box.querySelector('#slowb').onclick=()=>play(true);
    nextB.onclick=()=>{
      if(idx>=list.length-1){toast('全部听力题已完成！','ok');return;}
      idx++;render();
    };
    render();

    c.appendChild(doneBar('enlisten',()=>{
      if(answered<list.length){toast(`还有 ${list.length-answered} 题未作答`,'warn');return false;}
      return {right,total:list.length};
    },'每题最多重听 3 次，做完再看原文'));
  }
};
