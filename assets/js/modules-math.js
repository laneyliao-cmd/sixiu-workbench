/* =========================================================
   数学模块：数学计算（40题/日） / 数学思维（5题/日）
   ========================================================= */
window.Modules = window.Modules || {};

/* ---------------- 5. 数学计算 ---------------- */
Modules.calc = {
  title:'数学计算', icon:'🧮', sub:'人教版五上（2026秋新版）小数乘法+小数除法 · 每日40道',
  render(c){
    const di=Store.dayIndex(), n=Store.quota('calc');
    const items=MathGen.daily(di,n);
    const saved=Store.day().tasks.calc||{};

    c.appendChild(el('div','hint',
      '⚠️ 本模块严格按 <b>2026 秋新版</b>命题范围出题：仅含<b>小数乘整数、小数乘小数、除数是整数的小数除法、一个数除以小数、整数/小数四则混合</b>。'+
      '已删除内容 <b>不会出现</b>：积的近似数、商的近似数、循环小数、用计算器探索规律。'));

    // 计时器
    const timerCard=el('div','card tint');
    timerCard.innerHTML=`<div class="btnrow" style="justify-content:space-between">
      <div><b style="font-size:17px;color:var(--ink)">⏱️ 做题计时器</b>
        <div class="muted">建议 40 道在 15 分钟内完成，先求准确再求速度</div></div>
      <div class="btnrow">
        <div class="chip warm" id="clock" style="font-size:20px;padding:8px 20px">00:00</div>
        <button class="btn sm" id="startT">▶ 开始</button>
        <button class="btn sm ghost" id="pauseT">⏸ 暂停</button>
      </div></div>`;
    c.appendChild(timerCard);
    let sec=saved.sec||0,tid=null;
    const clock=timerCard.querySelector('#clock');
    const show=()=>clock.textContent=`${pad(Math.floor(sec/60))}:${pad(sec%60)}`;
    show();
    const startT=()=>{if(tid)return;tid=setInterval(()=>{sec++;show();},1000);};
    timerCard.querySelector('#startT').onclick=startT;
    timerCard.querySelector('#pauseT').onclick=()=>{clearInterval(tid);tid=null;};
    App.onLeave=()=>{clearInterval(tid);tid=null;};

    const box=el('div','card');
    box.innerHTML=`<div class="card-h"><h2>🧮 今日计算（第 ${Store.planDay()} 天）</h2>
      <span class="tag">${items.length} 道</span><span class="tag new">2026秋新版范围</span></div>`;
    const grid=el('div','grid g3');
    const inputs=[];
    items.forEach((it,i)=>{
      const d=el('div','calc-item');
      d.innerHTML=`<div class="no">${i+1}</div><div class="q">${it.q}</div>`;
      const inp=el('input');inp.type='text';inp.inputMode='decimal';inp.placeholder='答案';
      if(saved.answers&&saved.answers[i]!=null) inp.value=saved.answers[i];
      inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&inputs[i+1])inputs[i+1].focus();});
      inp.addEventListener('focus',startT);
      d.appendChild(inp);inputs.push(inp);
      const ans=el('div','ans','');d.appendChild(ans);
      grid.appendChild(d);
      it._el=d;it._inp=inp;it._ans=ans;
    });
    box.appendChild(grid);
    c.appendChild(box);

    const res=el('div','card tint');
    res.innerHTML=`<div class="btnrow" style="justify-content:space-between">
      <div id="score" style="font-size:17px;font-weight:800;color:var(--ink)">尚未批改</div>
      <div class="btnrow">
        <button class="btn green" id="check">✅ 自主批改</button>
        <button class="btn ghost" id="showWrong">📕 只看错题讲解</button>
        <button class="btn ghost" id="clear">🧹 清空重做</button>
      </div></div>`;
    c.appendChild(res);
    const wrongBox=el('div','card');wrongBox.style.display='none';
    wrongBox.innerHTML=`<div class="card-h"><h2>📕 错题答案与讲解</h2></div>`;
    const wrongList=el('div');wrongBox.appendChild(wrongList);
    c.appendChild(wrongBox);

    let checked=false,right=0;
    const norm=v=>String(v==null?'':v).trim().replace(/。/g,'.').replace(/[，,\s]/g,'');
    function equal(a,b){
      if(norm(a)===norm(b)) return true;
      const x=parseFloat(norm(a)),y=parseFloat(norm(b));
      return !isNaN(x)&&!isNaN(y)&&Math.abs(x-y)<1e-9;
    }
    res.querySelector('#check').onclick=()=>{
      clearInterval(tid);tid=null;
      right=0;wrongList.innerHTML='';
      items.forEach((it,i)=>{
        const v=it._inp.value;
        it._el.classList.remove('right','wrong');
        if(!v.trim()){ it._el.classList.add('wrong'); it._ans.textContent='未作答 '+it.a; }
        else if(equal(v,it.a)){ it._el.classList.add('right'); it._ans.textContent='✓'; right++; return; }
        else { it._el.classList.add('wrong'); it._ans.textContent='正确:'+it.a; }
        // 错题
        Store.addWrong('calc',{k:it.q,q:it.q,a:it.a,tip:it.tip,type:it.k});
        const w=el('div','think-q');
        w.innerHTML=`<div class="qt"><span class="badge">${it.k}</span>${it.q} <b style="color:var(--ok)">${it.a}</b>
          <span class="muted">（你的答案：${v.trim()||'空'}）</span></div>
          <div class="reveal tip">💡 ${it.tip}</div>`;
        wrongList.appendChild(w);
      });
      checked=true;
      const rate=Math.round(right/items.length*100);
      res.querySelector('#score').innerHTML=
        `本次得分：<span style="color:${rate>=90?'#2b8f66':rate>=70?'#c9781c':'#d15252'}">${right} / ${items.length}（${rate}%）</span>
         　用时 ${pad(Math.floor(sec/60))}:${pad(sec%60)}　${right===items.length?'🎉 全对！太棒了':'错题已自动进入错题本'}`;
      wrongBox.style.display = right===items.length?'none':'block';
      const t=Store.day().tasks.calc||{};t.answers=items.map(x=>x._inp.value);t.sec=sec;Store.day().tasks.calc=t;Store.save();
      toast(right===items.length?'全部正确！🎉':'批改完成，共 '+(items.length-right)+' 道错题','ok');
    };
    res.querySelector('#showWrong').onclick=()=>{
      if(!checked){toast('请先点击「自主批改」','warn');return;}
      wrongBox.style.display=wrongBox.style.display==='none'?'block':'none';
      wrongBox.scrollIntoView({behavior:'smooth'});
    };
    res.querySelector('#clear').onclick=()=>{
      items.forEach(it=>{it._inp.value='';it._el.classList.remove('right','wrong');it._ans.textContent='';});
      checked=false;right=0;sec=0;show();res.querySelector('#score').textContent='尚未批改';wrongBox.style.display='none';
    };

    c.appendChild(doneBar('calc',()=>{
      if(!checked){ toast('请先完成并点击「自主批改」','warn'); return false; }
      return {right,total:items.length,sec};
    },'做题 → 自主批改 → 看错题讲解 → 打卡'));
  }
};

/* ---------------- 6. 数学思维 ---------------- */
Modules.think = {
  title:'数学思维', icon:'🧠', sub:'五上新增章节思维拓展 · 每日5题',
  render(c){
    const di=Store.dayIndex(), n=Store.quota('think');
    const list=pickDaily(DATA_THINK,di,n);

    const info=el('div','card tint');
    info.innerHTML=`<div class="card-h"><h2>📚 新版章节速览</h2><span class="tag new">2026秋新版</span></div>
      <table class="tb"><tr><th>单元</th><th>内容</th><th>变化说明</th></tr>
      ${DATA_MATH_UNITS.map(u=>`<tr><td><b>${u.u}</b></td><td>${u.name}</td><td class="muted">${u.note}</td></tr>`).join('')}</table>
      <div class="hint red" style="margin-top:12px">❌ 新版已删除：${DATA_MATH_REMOVED.join('、')}</div>`;
    c.appendChild(info);

    let solved=0;
    list.forEach((q,i)=>{
      const box=el('div','think-q');
      box.innerHTML=`<div class="qt"><span class="badge">${q.u}</span><b>第${i+1}题　</b>${q.q}</div>`;
      const bar=el('div','btnrow');bar.style.marginTop='10px';
      const bt=el('button','btn sm warm','💡 思路点拨');
      const ba=el('button','btn sm ghost','📖 详细解析');
      const bok=el('button','btn sm green','✅ 我做对了');
      const bno=el('button','btn sm ghost','📕 加入错题本');
      const tip=el('div','reveal tip');tip.style.display='none';tip.innerHTML=`<b>思路点拨：</b>${q.tip}`;
      const ans=el('div','reveal');ans.style.display='none';ans.innerHTML=`<b>详细解析：</b>${q.ans}`;
      bt.onclick=()=>{tip.style.display=tip.style.display==='none'?'block':'none';};
      ba.onclick=()=>{ans.style.display=ans.style.display==='none'?'block':'none';};
      bok.onclick=()=>{if(!bok.disabled){solved++;bok.textContent='✓ 已标记';bok.disabled=true;bno.disabled=true;toast('太棒了！','ok');}};
      bno.onclick=()=>{Store.addWrong('think',{k:q.q,q:q.q,a:q.ans,tip:q.tip,u:q.u});bno.textContent='已加入错题本';bno.disabled=true;bok.disabled=true;ans.style.display='block';toast('已加入错题本，明天再来挑战','warn');};
      bar.append(bt,ba,bok,bno);
      box.append(bar,tip,ans);
      c.appendChild(box);
    });

    c.appendChild(doneBar('think',()=>({right:solved,total:list.length}),'每题配套「思路点拨 + 详细解析」，先自己想，再看提示'));
  }
};
