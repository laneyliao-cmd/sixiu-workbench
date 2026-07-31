/* =========================================================
   App：布局 / 路由 / 首页 / 宠物 / 商城 / 报告 / 设置 / 提醒
   ========================================================= */
const NAV = [
  {k:'home',    ic:'🏠', name:'今日总览', q:''},
  {k:'hanzi',   ic:'📝', name:'生字专区', q:'20个/日'},
  {k:'sentence',ic:'📖', name:'句子积累', q:'5句/日'},
  {k:'poem',    ic:'🎋', name:'古诗词',   q:'1首/日'},
  {k:'guwen',   ic:'📜', name:'小古文',   q:'1篇/日'},
  {k:'calc',    ic:'🧮', name:'数学计算', q:'40道/日'},
  {k:'think',   ic:'🧠', name:'数学思维', q:'5题/日'},
  {k:'word',    ic:'🔤', name:'英语单词', q:'20个/日'},
  {k:'ensent',  ic:'💬', name:'英语句子', q:'8句/日'},
  {k:'enread',  ic:'📚', name:'英语阅读', q:'1篇/日'},
  {k:'enlisten',ic:'🎧', name:'英语听力', q:'3分钟/日'},
  {k:'pet',     ic:'🐾', name:'小宠物中心', q:'养成系统'},
  {k:'report',  ic:'📊', name:'学习报告', q:'日/周/月'},
  {k:'settings',ic:'⚙️', name:'设置',     q:''}
];

const App = (function(){
  let cur='home';

  function boot(){
    renderSidebar();
    const msgs=Store.settlePenalty();
    go(location.hash.replace('#','')||'home');
    if(msgs) setTimeout(()=>showPenalty(msgs),700);
    startReminder();
    window.addEventListener('hashchange',()=>go(location.hash.replace('#','')||'home'));
    $('.menu-toggle').onclick=()=>{$('.sidebar').classList.toggle('open');$('.mask-mobile').classList.toggle('show');};
    $('.mask-mobile').onclick=()=>{$('.sidebar').classList.remove('open');$('.mask-mobile').classList.remove('show');};
  }

  function renderSidebar(){
    const list=$('#navlist');list.innerHTML='';
    NAV.forEach(n=>{
      const a=el('a','navitem'+(n.k===cur?' active':''));
      a.href='#'+n.k;a.dataset.k=n.k;
      a.innerHTML=`<span class="ico">${n.ic}</span><span class="lb">${n.name}</span>`;
      if(Store.MODULES.includes(n.k)){ const dot=el('i','dot');a.appendChild(dot); }
      a.onclick=()=>{$('.sidebar').classList.remove('open');$('.mask-mobile').classList.remove('show');};
      list.appendChild(a);
    });
    refreshNav();
  }

  function refreshNav(){
    const d=Store.day();
    $$('#navlist .navitem').forEach(a=>{
      const k=a.dataset.k;
      a.classList.toggle('active',k===cur);
      if(Store.MODULES.includes(k)) a.classList.toggle('done',!!(d.tasks[k]&&d.tasks[k].done));
    });
    const done=Store.doneCount(),tot=Store.MODULES.length;
    $('#navProg').innerHTML=`<span>今日 ${done}/${tot}</span><span>${Math.round(done/tot*100)}%</span>`;
    $('#navBar').style.width=(done/tot*100)+'%';
    const S=Store.state();
    $('#topPoints').textContent='⭐ '+S.points;
    $('#topStreak').textContent='🔥 连续 '+S.streak+' 天';
    $('#topDay').textContent='第 '+Store.planDay()+'/30 天';
  }

  function go(k){
    if(!NAV.some(n=>n.k===k)) k='home';
    if(App.onLeave){App.onLeave();App.onLeave=null;}
    Speech.stop();
    cur=k;location.hash=k;
    const nav=NAV.find(n=>n.k===k);
    $('#pageTitle').textContent=nav.ic+' '+nav.name;
    const m=Modules[k];
    $('#pageSub').textContent = m&&m.sub ? m.sub : (k==='home'?'广东·中山 · 四升五暑期30天预习计划 · 2026秋新版教材':'');
    const c=$('#content');c.innerHTML='';
    const wrap=el('div','wrap');c.appendChild(wrap);
    c.scrollTop=0;
    try{
      if(k==='home') renderHome(wrap);
      else if(k==='pet') renderPet(wrap);
      else if(k==='report') renderReport(wrap);
      else if(k==='settings') renderSettings(wrap);
      else if(m) m.render(wrap);
      else wrap.appendChild(el('div','hint','该模块暂未就绪'));
    }catch(err){
      console.error('render fail:',k,err);
      wrap.appendChild(el('div','card tint',`<div class="card-h"><h2>⚠️ 该模块加载出错</h2></div>
        <p class="muted">渲染时发生错误：${(err&&err.message)||err}</p>
        <p class="muted">请尝试刷新页面；若反复出现，可在「设置 → 数据管理」导出备份后联系开发者。</p>`));
    }
    refreshNav();
  }

  /* ---------------- 首页 ---------------- */
  function renderHome(c){
    const S=Store.state(),d=Store.day();
    const done=Store.doneCount(),tot=Store.MODULES.length;
    const hero=el('div','hero');
    const hh=new Date().getHours();
    const greet=hh<9?'早上好':hh<12?'上午好':hh<14?'中午好':hh<18?'下午好':'晚上好';
    hero.innerHTML=`<div style="min-width:230px">
        <h2>${greet}，${S.child.name}！</h2>
        <p>今天是 30 天计划的第 <b>${Store.planDay()}</b> 天　·　${todayStr()}</p>
        <p style="margin-top:6px;font-size:13px;opacity:.9">📍 ${S.child.city}　教材：语文统编版 · 数学人教版 · 英语人教PEP版（2026秋新版）</p>
      </div>
      <div class="stats">
        <div class="stat"><b>${done}/${tot}</b><span>今日任务</span></div>
        <div class="stat"><b>${S.points}</b><span>积分</span></div>
        <div class="stat"><b>${S.streak}</b><span>连续打卡</span></div>
        <div class="stat"><b>${S.pet.food}</b><span>饲料</span></div>
      </div>`;
    c.appendChild(hero);

    if(S.rescue.pending){
      const r=el('div','hint');
      r.innerHTML=`💪 <b>补救模式进行中</b>：因 ${S.rescue.from} 未完成打卡，今日<b>单词量翻倍 (${Store.quota('word')}个)</b>、<b>英语阅读额外加练 1 篇</b>。
        全部完成后可<b>追回一半被扣积分（约 ${Math.round((S.rescue.deducted||0)/2)} 分）</b>并恢复道具与兑换权限。`;
      c.appendChild(r);
    }
    if(S.inventory.__frozen){
      c.appendChild(el('div','hint red','🚫 积分商城兑换权限已<b>冻结</b>（连续3天及以上未完成）。完成今日全部任务即可解冻。'));
    }

    // 任务卡片
    const grid=el('div','grid g5');
    NAV.filter(n=>Store.MODULES.includes(n.k)).forEach(n=>{
      const t=d.tasks[n.k];
      const isDone=t&&t.done;
      const tile=el('div','tile'+(isDone?' done':''));
      let extra='';
      if(isDone&&t.total) extra=`<div class="muted" style="font-size:11.5px;margin-top:4px">正确 ${t.right}/${t.total}</div>`;
      tile.innerHTML=`<div class="state">${isDone?'已完成':'待完成'}</div>
        <div class="ti">${n.ic}</div><h3>${n.name}</h3>
        <div class="q">${Store.quota(n.k)}${unitOf(n.k)}</div>${extra}
        <div class="mini"><i style="width:${isDone?100:0}%"></i></div>`;
      tile.onclick=()=>go(n.k);
      grid.appendChild(tile);
    });
    c.appendChild(grid);

    // 教材变动提醒
    const warn=el('div','card');
    warn.innerHTML=`<div class="card-h"><h2>⚠️ 2026 秋新版教材重要变动</h2><span class="tag new">务必知晓</span></div>
      <div class="grid g3">
        <div class="hint red"><b>语文（统编版）</b><br>删除 8 篇课文：${DATA_CN_REMOVED.join('、')}；新增 7 篇课文和 2 个习作；单元顺序全部重排；生字词表全部更新。</div>
        <div class="hint"><b>数学（人教版）</b><br>整章删除旧版第2单元「位置」；删去积/商的近似数、循环小数、用计算器探索规律；新增「观察简单组合体」「图形的运动」；简易方程重组为「用字母表示数和数量关系」；植树问题降为选学。</div>
        <div class="hint blue"><b>英语（人教PEP）</b><br>6 个单元主题全部重新设计（4 个重构 + 2 个全新）；语法重新编排；词汇增加跨学科与德育内容；新增 Big Question、Project、Self-check、Reading time 板块。</div>
      </div>
      <div class="hint" style="margin-top:12px">📌 <b>旧版教辅全部失效</b>：2025 年及以前的旧教辅、旧练习册、旧课件均不适用 2026 秋季新版课本。7 月底国家中小学智慧教育平台会上线官方电子课本，如有细节调整请以官方电子课本为准。</div>`;
    c.appendChild(warn);

    // 30天打卡日历
    const cal=el('div','card');
    cal.innerHTML=`<div class="card-h"><h2>📅 30 天打卡日历</h2><span class="tag">起始 ${S.startDate}</span></div>`;
    const cg=el('div','cal');
    for(let i=0;i<30;i++){
      const ds=addDays(S.startDate,i);
      const dd=S.days[ds];
      const isToday=ds===todayStr();
      const future=daysBetween(todayStr(),ds)>0;
      let cls='d';
      if(dd&&dd.base) cls+=' ok';
      else if(dd&&Store.doneCount(ds)>0) cls+=' part';
      else if(!future&&!isToday) cls+=' miss';
      if(isToday) cls+=' today';
      const cell=el('div',cls,String(i+1));
      cell.title=ds;
      cg.appendChild(cell);
    }
    cal.appendChild(cg);
    cal.appendChild(el('div','muted','<span style="color:#38b184">■</span> 全部完成　<span style="color:#c9781c">■</span> 部分完成　<span style="color:#d15252">■</span> 未完成　<span style="color:#3f9df5">□</span> 今天'));
    c.appendChild(cal);

    // 错题速览
    const w=Store.state().wrong;
    const wn=Object.values(w).reduce((a,b)=>a+b.length,0);
    if(wn){
      const wb=el('div','card');
      wb.innerHTML=`<div class="card-h"><h2>📕 错题本</h2><span class="tag warn">共 ${wn} 条</span></div>
        <div class="grid g4">
          ${[['word','英语单词'],['calc','数学计算'],['think','数学思维'],['listen','英语听力'],['read','英语阅读']]
            .map(([k,n])=>`<div class="shop-item"><div class="ic">📕</div><h4>${n}</h4><div class="p">${(w[k]||[]).length} 条</div></div>`).join('')}
        </div>
        <div class="btnrow" style="margin-top:12px"><button class="btn ghost" id="toRep">查看完整错题本 →</button></div>`;
      wb.querySelector('#toRep').onclick=()=>go('report');
      c.appendChild(wb);
    }
  }
  function unitOf(k){
    return {hanzi:'个',sentence:'句',poem:'首',guwen:'篇',calc:'道',think:'题',word:'个',ensent:'句',enread:'篇',enlisten:'分钟'}[k]||'';
  }

  /* ---------------- 庆祝 ---------------- */
  function celebrate(){
    const S=Store.state();
    modal('🎉 今日全部完成！',`
      <div style="text-align:center">
        <div style="font-size:64px">${PETS[S.pet.id].stages[S.pet.stage]}</div>
        <p style="font-size:19px;font-weight:800;color:var(--ink)">恭喜完成第 ${Store.planDay()} 天全部 10 项任务！</p>
        <p>获得基础积分 <b style="color:#ff9a3c">+100</b>　饲料 <b style="color:#38b184">+8</b></p>
        <p>连续打卡 <b>${S.streak}</b> 天　当前积分 <b>${S.points}</b></p>
        <p class="muted">去「小宠物中心」喂养你的伙伴吧～</p>
      </div>`,[{label:'去喂宠物',cls:'green',fn:()=>go('pet')},{label:'太棒了',cls:'ghost'}]);
    refreshNav();
  }

  function showPenalty(msgs){
    modal('📋 打卡结算通知',
      `<p class="muted">系统按「温和自律」规则对未完成的日期进行了结算：</p>
       ${msgs.map(m=>`<div class="hint red" style="margin-bottom:8px">${m}</div>`).join('')}
       <div class="hint" style="margin-top:10px">💪 <b>补救机制</b>：今日完成双倍任务（单词加倍复盘 + 额外加练 1 篇短文），即可<b>追回一半扣除积分</b>，并恢复道具与兑换权限。</div>`,
      [{label:'我知道了，开始补救',cls:'green',fn:()=>go('home')}]);
  }

  /* ---------------- 小宠物中心 ---------------- */
  function renderPet(c){
    const S=Store.state(),P=S.pet,def=PETS[P.id];
    // 成长阶段
    while(P.stage<3 && P.exp>=PET_EXP[P.stage+1]) P.stage++;
    const nextExp=P.stage<3?PET_EXP[P.stage+1]:PET_EXP[3];
    const stage=el('div','pet-stage');
    const deco=Object.keys(S.inventory).filter(k=>S.inventory[k].n>0&&Store.ITEMS[k]&&Store.ITEMS[k].perm).map(k=>Store.ITEMS[k].ic).join(' ');
    stage.innerHTML=`<div class="ground"></div>
      <div class="pet-bubble" id="bubble">${bubbleText()}</div>
      <div class="pet-avatar" id="avatar">${def.stages[P.stage]}</div>
      <div class="pet-name">${P.name}　<span class="chip green">${def.stageName[P.stage]}</span></div>
      <div class="muted" style="z-index:2">${def.desc}</div>
      ${deco?`<div style="z-index:2;font-size:26px;margin-top:6px">${deco}</div>`:''}`;
    c.appendChild(stage);
    stage.querySelector('#avatar').onclick=()=>{
      const a=stage.querySelector('#avatar');a.classList.add('happy');setTimeout(()=>a.classList.remove('happy'),1600);
      P.mood=Math.min(100,P.mood+3);Store.save();
      stage.querySelector('#bubble').textContent=['好开心呀！','再摸摸我～','今天学得真棒！','我们一起加油！','要不要读首古诗给我听？'][Math.floor(Math.random()*5)];
    };

    const status=el('div','card');
    status.innerHTML=`<div class="card-h"><h2>📈 成长状态</h2><span class="tag">${P.exp} / ${nextExp} 成长值</span></div>
      <div class="meter"><div class="lb"><span>成长进度</span><span>${def.stageName[P.stage]}${P.stage<3?' → '+def.stageName[P.stage+1]:'（已满级）'}</span></div>
        <div class="bar"><i style="width:${Math.min(100,P.exp/nextExp*100)}%"></i></div></div>
      <div class="meter"><div class="lb"><span>心情 😊</span><span>${P.mood}%</span></div><div class="bar"><i style="width:${P.mood}%;background:linear-gradient(90deg,#ffb865,#ff9a3c)"></i></div></div>
      <div class="meter"><div class="lb"><span>清洁 🫧</span><span>${P.clean}%</span></div><div class="bar"><i style="width:${P.clean}%;background:linear-gradient(90deg,#7fd1c8,#4bbdb0)"></i></div></div>
      <div class="btnrow" style="margin-top:16px">
        <span class="chip warm">🍚 饲料 ${P.food}</span>
        <button class="btn green" id="feed">🍚 喂养 (-5饲料 +12成长)</button>
        <button class="btn ghost" id="play">🎮 玩耍 (+8心情)</button>
        <button class="btn ghost" id="bath">🫧 洗澡 (+15清洁)</button>
        <button class="btn warm" id="fish">🐟 豪华鱼干 (+20成长)</button>
      </div>
      <div class="hint blue" style="margin-top:12px">🍚 <b>饲料获取</b>：每完成 1 个学习模块 +2，当日全部完成额外 +8。温和益智、无暴力、<b>无任何充值通道</b>。</div>`;
    c.appendChild(status);
    status.querySelector('#feed').onclick=()=>{
      if(P.food<5){toast('饲料不够啦，去完成学习任务吧','warn');return;}
      P.food-=5;P.exp+=12;P.mood=Math.min(100,P.mood+4);Store.save();toast('喂养成功！成长值 +12','ok');go('pet');
    };
    status.querySelector('#play').onclick=()=>{
      if(!S.inventory.ball||S.inventory.ball.n<=0){toast('需要「弹力球」，可在积分商城兑换','warn');return;}
      Store.useItem('ball');P.mood=Math.min(100,P.mood+8);P.exp+=4;Store.save();toast('玩得很开心！','ok');go('pet');
    };
    status.querySelector('#bath').onclick=()=>{P.clean=Math.min(100,P.clean+15);P.mood=Math.min(100,P.mood+2);Store.save();toast('干干净净～','ok');go('pet');};
    status.querySelector('#fish').onclick=()=>{
      if(!S.inventory.fish||S.inventory.fish.n<=0){toast('需要「豪华鱼干」，可在积分商城兑换','warn');return;}
      Store.useItem('fish');P.exp+=20;Store.save();toast('成长值 +20！','ok');go('pet');
    };

    // 选择宠物
    const pick=el('div','card');
    pick.innerHTML=`<div class="card-h"><h2>🐾 我的伙伴</h2><span class="tag">可随时切换</span></div>`;
    const pg=el('div','grid g4');
    Object.keys(PETS).forEach(id=>{
      const p=PETS[id];const owned=P.unlocked.includes(id);
      const d=el('div','shop-item');
      d.style.borderColor=id===P.id?'var(--primary)':'';
      d.innerHTML=`<div class="ic">${p.stages[id===P.id?P.stage:1]}</div><h4>${p.name}</h4>
        <div class="muted" style="font-size:12px">${p.type}</div>
        <div class="p">${owned?(id===P.id?'当前伙伴':'点击切换'):'300 积分解锁'}</div>`;
      d.onclick=()=>{
        if(owned){P.id=id;P.name=p.name;Store.save();go('pet');}
        else{ if(S.points<300){toast('积分不足 300','warn');return;}
          Store.addPoints(-300,'解锁宠物');P.unlocked.push(id);P.id=id;P.name=p.name;Store.save();toast('解锁成功！','ok');go('pet');}
      };
      pg.appendChild(d);
    });
    pick.appendChild(pg);
    const ren=el('div','btnrow');ren.style.marginTop='12px';
    const rb=el('button','btn sm ghost','✏️ 给宠物改名');
    rb.onclick=()=>{const n=prompt('给宠物取个名字',P.name);if(n&&n.trim()){P.name=n.trim().slice(0,8);Store.save();go('pet');}};
    ren.appendChild(rb);pick.appendChild(ren);
    c.appendChild(pick);

    // 积分商城
    const shop=el('div','card');
    shop.innerHTML=`<div class="card-h"><h2>🛍️ 积分商城</h2><span class="tag green">当前积分 ${S.points}</span>
      <span class="tag warn">🚫 无任何付费通道</span></div>`;
    const sg=el('div','grid g4');
    Object.keys(Store.ITEMS).forEach(id=>{
      const it=Store.ITEMS[id];const have=(S.inventory[id]&&S.inventory[id].n)||0;
      const d=el('div','shop-item');
      d.innerHTML=`<div class="ic">${it.ic}</div><h4>${it.name}</h4>
        <div class="muted" style="font-size:11.5px;min-height:32px">${it.desc}</div>
        <div class="p">⭐ ${it.price}</div>
        <div style="margin:6px 0">${it.perm?'<span class="badge-perm">永久保留</span>':'<span class="badge-temp">限时/消耗</span>'}</div>
        <div class="muted" style="font-size:12px">已拥有 ${have}</div>`;
      const b=el('button','btn sm');b.textContent='兑换';b.style.marginTop='8px';
      b.onclick=()=>{ if(Store.buy(id)) go('pet'); };
      d.appendChild(b);sg.appendChild(d);
    });
    shop.appendChild(sg);
    c.appendChild(shop);

    function bubbleText(){
      const done=Store.doneCount();
      if(done===0) return '今天还没开始学呢，一起加油吧！';
      if(done<10) return `已经完成 ${done} 项啦，还差 ${10-done} 项！`;
      return '今天全部完成，你真棒！';
    }
  }

  /* ---------------- 学习报告 ---------------- */
  function renderReport(c){
    const S=Store.state();
    const tabs=el('div','btnrow');tabs.style.marginBottom='16px';
    ['日报','周报','月报','错题本'].forEach((t,i)=>{
      const b=el('button','btn'+(i?' ghost':''),t);
      b.onclick=()=>{$$('button',tabs).forEach(x=>x.className='btn ghost');b.className='btn';draw(i);};
      tabs.appendChild(b);
    });
    c.appendChild(tabs);
    const body=el('div');c.appendChild(body);
    draw(0);

    function draw(i){
      body.innerHTML='';
      if(i===0) daily();else if(i===1) weekly();else if(i===2) monthly();else wrongBook();
    }
    function statRow(days){
      let base=0,gain=0,pen=0,items={};
      days.forEach(ds=>{
        const d=S.days[ds];if(!d)return;
        if(d.base)base++;gain+=d.gained;pen+=d.penalty||0;
        Object.keys(d.tasks).forEach(k=>{
          const t=d.tasks[k];if(!t.done)return;
          items[k]=items[k]||{n:0,r:0,t:0};
          items[k].n++;items[k].r+=t.right||0;items[k].t+=t.total||0;
        });
      });
      return {base,gain,pen,items};
    }
    function tableOf(items){
      const names={hanzi:'生字专区',sentence:'句子积累',poem:'古诗词',guwen:'小古文',calc:'数学计算',think:'数学思维',word:'英语单词',ensent:'英语句子',enread:'英语阅读',enlisten:'英语听力'};
      return `<table class="tb"><tr><th>模块</th><th>完成次数</th><th>正确率</th><th>评价</th></tr>
        ${Store.MODULES.map(k=>{
          const it=items[k];
          if(!it) return `<tr><td>${names[k]}</td><td>0</td><td>—</td><td class="muted">未完成</td></tr>`;
          const rate=it.t?Math.round(it.r/it.t*100):100;
          const cm=rate>=95?'🌟 优秀':rate>=85?'👍 良好':rate>=70?'🙂 合格':'⚠️ 需加强';
          return `<tr><td>${names[k]}</td><td>${it.n}</td><td>${it.t?rate+'%':'—'}</td><td>${cm}</td></tr>`;
        }).join('')}</table>`;
    }
    function daily(){
      const t=todayStr(),d=Store.day();
      const st=statRow([t]);
      const box=el('div','card');
      box.innerHTML=`<div class="card-h"><h2>📄 每日学习日报</h2><span class="tag">${t}　第 ${Store.planDay()} 天</span></div>
        <div class="grid g4" style="margin-bottom:14px">
          <div class="shop-item"><div class="ic">✅</div><h4>${Store.doneCount()}/10</h4><div class="muted">完成模块</div></div>
          <div class="shop-item"><div class="ic">⭐</div><h4>+${d.gained}</h4><div class="muted">今日积分</div></div>
          <div class="shop-item"><div class="ic">🍚</div><h4>+${d.feed}</h4><div class="muted">获得饲料</div></div>
          <div class="shop-item"><div class="ic">⏱️</div><h4>${d.tasks.calc?Math.round((d.tasks.calc.sec||0)/60)+'分':'—'}</h4><div class="muted">计算用时</div></div>
        </div>
        ${tableOf(st.items)}
        <div class="hint blue" style="margin-top:14px">${dailyComment(st)}</div>`;
      body.appendChild(box);
      const ph=Object.keys(d.photos||{});
      if(ph.length){
        const p=el('div','card');
        p.innerHTML=`<div class="card-h"><h2>📷 今日作业照片</h2></div>`;
        const g=el('div','btnrow');
        ph.forEach(k=>{const img=el('img','thumb');img.src=d.photos[k];img.onclick=()=>modal('作业照片',`<img src="${d.photos[k]}" style="width:100%;border-radius:16px">`);g.appendChild(img);});
        p.appendChild(g);body.appendChild(p);
      }
    }
    function dailyComment(st){
      const n=Store.doneCount();
      if(n===10) return '🎉 今日全部完成！保持这个节奏，30 天后开学摸底考一定稳。';
      if(n>=7) return `已完成 ${n}/10 项，还差 ${10-n} 项就能拿到 100 基础积分，加把劲！`;
      if(n>=3) return `完成 ${n}/10 项。建议先做「英语单词 + 数学计算」这两个核心模块，它们分值最高。`;
      return '今天还没怎么开始，先从最轻松的「古诗词」或「句子积累」入手吧。';
    }
    function weekly(){
      const days=[];for(let i=6;i>=0;i--)days.push(addDays(todayStr(),-i));
      const st=statRow(days);
      const box=el('div','card');
      box.innerHTML=`<div class="card-h"><h2>📈 每周学情总结</h2><span class="tag">${days[0]} ~ ${days[6]}</span></div>
        <div class="grid g4" style="margin-bottom:14px">
          <div class="shop-item"><div class="ic">📅</div><h4>${st.base}/7</h4><div class="muted">完整打卡天数</div></div>
          <div class="shop-item"><div class="ic">⭐</div><h4>+${st.gain}</h4><div class="muted">本周积分</div></div>
          <div class="shop-item"><div class="ic">🔥</div><h4>${S.streak}</h4><div class="muted">当前连续</div></div>
          <div class="shop-item"><div class="ic">📕</div><h4>${Object.values(S.wrong).reduce((a,b)=>a+b.length,0)}</h4><div class="muted">错题累计</div></div>
        </div>
        ${tableOf(st.items)}`;
      body.appendChild(box);
      // 薄弱知识点
      const weak=el('div','card');
      const wk=[];
      Object.keys(st.items).forEach(k=>{
        const it=st.items[k];if(!it.t)return;
        const rate=it.r/it.t;
        if(rate<0.85) wk.push({k,rate:Math.round(rate*100)});
      });
      const calcTypes={};(S.wrong.calc||[]).forEach(w=>calcTypes[w.type]=(calcTypes[w.type]||0)+1);
      const thinkU={};(S.wrong.think||[]).forEach(w=>thinkU[w.u]=(thinkU[w.u]||0)+1);
      const wordU={};(S.wrong.word||[]).forEach(w=>wordU[w.u]=(wordU[w.u]||0)+1);
      weak.innerHTML=`<div class="card-h"><h2>🎯 薄弱知识点 & 易错题型</h2></div>
        ${wk.length?`<div class="hint">正确率偏低的模块：${wk.map(w=>`<b>${w.k}</b>(${w.rate}%)`).join('、')}</div>`:'<div class="hint blue">本周各模块正确率均在 85% 以上，非常稳定 👍</div>'}
        <div class="grid g3" style="margin-top:12px">
          <div><b>数学计算易错题型</b>${listTop(calcTypes)}</div>
          <div><b>数学思维薄弱章节</b>${listTop(thinkU)}</div>
          <div><b>英语易错单元</b>${listTop(wordU)}</div>
        </div>`;
      body.appendChild(weak);
    }
    function listTop(obj){
      const arr=Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,4);
      if(!arr.length) return '<div class="muted">暂无错题 🎉</div>';
      return '<div>'+arr.map(([k,v])=>`<div class="note-item"><b>${v}次</b><span>${k}</span></div>`).join('')+'</div>';
    }
    function monthly(){
      const days=[];for(let i=0;i<30;i++)days.push(addDays(S.startDate,i));
      const st=statRow(days);
      const rate=Math.round(st.base/30*100);
      const box=el('div','card');
      box.innerHTML=`<div class="card-h"><h2>📊 月度汇总 · 暑期预习报告</h2><span class="tag new">贴合开学摸底考考点</span></div>
        <div class="grid g4" style="margin-bottom:14px">
          <div class="shop-item"><div class="ic">🏆</div><h4>${st.base}/30</h4><div class="muted">完整打卡</div></div>
          <div class="shop-item"><div class="ic">⭐</div><h4>${S.totalEarned}</h4><div class="muted">累计获得积分</div></div>
          <div class="shop-item"><div class="ic">🔥</div><h4>${S.bestStreak}</h4><div class="muted">最长连续</div></div>
          <div class="shop-item"><div class="ic">📈</div><h4>${rate}%</h4><div class="muted">计划完成度</div></div>
        </div>
        ${tableOf(st.items)}`;
      body.appendChild(box);
      const exam=el('div','card');
      exam.innerHTML=`<div class="card-h"><h2>📝 开学摸底考 · 考点覆盖清单</h2></div>
        <table class="tb"><tr><th>学科</th><th>高频考点（2026秋新版）</th><th>本计划覆盖</th></tr>
        <tr><td>语文</td><td>五上新版写字表生字（约 ${DATA_HANZI.length} 字）、必背古诗 ${DATA_POEM.length} 首（含新增《早春呈水部张十八员外》）、课文经典句段默写、小古文实词理解</td><td>✅ 生字/句子/古诗/小古文 四模块</td></tr>
        <tr><td>数学</td><td>小数乘法、小数除法、四则混合运算；观察组合体、图形的运动、用字母表示数、多边形面积、可能性</td><td>✅ 计算 40 题/日 + 思维 5 题/日</td></tr>
        <tr><td>英语</td><td>PEP 五上新版 6 单元词汇（${DATA_WORD.length} 词）、Let's talk 核心句型、一般现在时三单与现在进行时、Reading time 阅读、单元测试听力题型</td><td>✅ 单词/句子/阅读/听力 四模块</td></tr>
        </table>
        <div class="hint" style="margin-top:14px">${monthAdvice(rate,st)}</div>
        <div class="hint blue" style="margin-top:10px">📌 <b>预习建议</b>：重点提前预习新版生字、新增古诗《早春呈水部张十八员外》，并提前阅读新增课文《航天员写给孩子的信》《梅兰芳蓄须明志》原文。7 月底国家中小学智慧教育平台上线官方电子课本后，请以官方版本为准核对。</div>
        <div class="btnrow" style="margin-top:14px"><button class="btn" id="print">🖨️ 打印 / 导出 PDF</button></div>`;
      body.appendChild(exam);
      exam.querySelector('#print').onclick=()=>window.print();
    }
    function monthAdvice(rate,st){
      if(rate>=90) return '🌟 完成度极高，30 天预习计划执行得非常扎实。开学摸底考建议再重点复习错题本中的高频错题即可。';
      if(rate>=60) return '👍 完成度良好。建议在开学前一周集中攻克错题本，尤其是数学计算的易错题型和英语单词的高频错词。';
      return '⚠️ 计划完成度偏低。建议缩减为「英语单词 + 数学计算 + 生字」三个核心模块每日必做，先保证核心知识点不落下。';
    }
    function wrongBook(){
      const names={word:'英语单词',calc:'数学计算',think:'数学思维',listen:'英语听力',read:'英语阅读'};
      Object.keys(names).forEach(k=>{
        const list=S.wrong[k]||[];
        const box=el('div','card');
        box.innerHTML=`<div class="card-h"><h2>📕 ${names[k]}错题</h2><span class="tag warn">${list.length} 条</span></div>`;
        if(!list.length){box.appendChild(el('div','muted','暂无错题 🎉'));body.appendChild(box);return;}
        const tb=el('table','tb');
        tb.innerHTML=`<tr><th>内容</th><th>正确答案</th><th>错误次数</th><th>操作</th></tr>`;
        list.slice(0,60).forEach(w=>{
          const tr=el('tr');
          tr.innerHTML=`<td>${w.q||w.en||''}${w.cn?'　<span class="muted">'+w.cn+'</span>':''}</td>
            <td><b style="color:var(--ok)">${w.a||w.en||''}</b></td><td>${w.n||1}</td>`;
          const td=el('td');
          const b1=el('button','btn sm ghost','🔊');
          b1.onclick=()=>{ k==='calc'||k==='think' ? Speech.zh(w.q) : Speech.en(w.en||w.q); };
          const b2=el('button','btn sm ghost','✓ 已掌握');
          b2.onclick=()=>{Store.removeWrong(k,w._k);draw(3);};
          td.append(b1,b2);tr.appendChild(td);tb.appendChild(tr);
        });
        box.appendChild(tb);
        if(list.length>60) box.appendChild(el('div','muted',`仅显示前 60 条，共 ${list.length} 条`));
        body.appendChild(box);
      });
    }
  }

  /* ---------------- 设置 ---------------- */
  function renderSettings(c){
    const S=Store.state();
    const b1=el('div','card');
    b1.innerHTML=`<div class="card-h"><h2>👤 学员信息</h2></div>
      <div class="grid g3">
        <div><label class="fl">姓名/昵称</label><input class="inp" id="nm" value="${S.child.name}"></div>
        <div><label class="fl">年级</label><input class="inp" id="gr" value="${S.child.grade}"></div>
        <div><label class="fl">城市</label><input class="inp" id="ct" value="${S.child.city}"></div>
      </div>
      <div><label class="fl">计划起始日期（30天连续打卡起点）</label><input class="inp" id="sd" type="date" value="${S.startDate}" style="max-width:220px"></div>
      <div class="btnrow" style="margin-top:14px"><button class="btn" id="save1">保存</button></div>`;
    c.appendChild(b1);
    b1.querySelector('#save1').onclick=()=>{
      S.child.name=$('#nm').value.trim()||'小学员';
      S.child.grade=$('#gr').value.trim();S.child.city=$('#ct').value.trim();
      const nd=$('#sd').value;if(nd)S.startDate=nd;
      Store.save();toast('已保存','ok');refreshNav();
    };

    const b2=el('div','card');
    b2.innerHTML=`<div class="card-h"><h2>⏰ 自定义时间提醒</h2><span class="tag">适配暑期作息</span></div>
      <div class="muted" style="margin-bottom:10px">到点后浏览器会弹出提醒（需允许通知权限）。建议：上午学语文、下午学数学、晚上学英语。</div>
      <div class="grid g4" id="remWrap"></div>
      <div class="btnrow" style="margin-top:14px">
        <button class="btn ghost" id="addRem">＋ 添加时间</button>
        <button class="btn" id="saveRem">保存提醒</button>
        <label class="btnrow" style="gap:6px;font-size:14px"><input type="checkbox" id="remOn" ${S.settings.remindOn?'checked':''}> 开启提醒</label>
        <button class="btn ghost" id="perm">🔔 申请通知权限</button>
      </div>`;
    c.appendChild(b2);
    function drawRem(){
      const w=b2.querySelector('#remWrap');w.innerHTML='';
      S.settings.reminders.forEach((t,i)=>{
        const d=el('div','btnrow');
        const inp=el('input','inp');inp.type='time';inp.value=t;inp.style.maxWidth='130px';
        inp.onchange=()=>S.settings.reminders[i]=inp.value;
        const del=el('button','btn sm ghost','✕');
        del.onclick=()=>{S.settings.reminders.splice(i,1);drawRem();};
        d.append(inp,del);w.appendChild(d);
      });
    }
    drawRem();
    b2.querySelector('#addRem').onclick=()=>{S.settings.reminders.push('20:00');drawRem();};
    b2.querySelector('#saveRem').onclick=()=>{S.settings.remindOn=b2.querySelector('#remOn').checked;Store.save();toast('提醒已保存','ok');};
    b2.querySelector('#perm').onclick=()=>{
      if(!('Notification' in window)){toast('当前浏览器不支持系统通知','warn');return;}
      Notification.requestPermission().then(p=>toast(p==='granted'?'已开启通知 🔔':'未授予通知权限',p==='granted'?'ok':'warn'));
    };

    const b3=el('div','card');
    b3.innerHTML=`<div class="card-h"><h2>🔊 语音与朗读</h2></div>
      <div class="btnrow">
        <label class="btnrow" style="gap:6px"><input type="checkbox" id="uk" ${S.settings.uk?'checked':''}> 英语使用<b>英式发音 🇬🇧</b>（不勾选为美式 🇺🇸）</label>
        <button class="btn sm ghost" id="test">🔊 试听</button>
      </div>
      <div class="btnrow" style="margin-top:12px;align-items:center">
        <label class="fl" style="font-size:14px">英语朗读语速</label>
        <select id="enSp" class="inp" style="max-width:180px">
          <option value="0.8">慢速（适合跟读）</option>
          <option value="0.95">较慢（推荐）</option>
          <option value="1">标准</option>
        </select>
        <span class="muted" style="font-size:12px">豆包音色上线后亦可在此切换</span>
      </div>
      <div class="muted" style="margin-top:8px">当前可用语音引擎：${(Speech.list()||[]).length} 个。若无中文/英文语音，请在系统设置中安装对应语音包。iOS 设备请在「设置 → 辅助功能 → 语音内容 → 语音」中下载英文嗓音。</div>`;
    c.appendChild(b3);
    b3.querySelector('#uk').onchange=e=>{S.settings.uk=e.target.checked;Store.save();};
    const enSp=b3.querySelector('#enSp'); enSp.value=String(S.settings.enSpeed||0.95);
    enSp.onchange=()=>{S.settings.enSpeed=parseFloat(enSp.value)||0.95;Store.save();toast('语速已保存','ok');};
    b3.querySelector('#test').onclick=()=>{Speech.zh('你好，我们开始今天的学习吧。');setTimeout(()=>Speech.en('Hello! Let us start today\'s lesson.',{uk:S.settings.uk}),2200);};

    const b4=el('div','card');
    b4.innerHTML=`<div class="card-h"><h2>💾 数据管理</h2><span class="tag">本地存储 + 备份导出</span></div>
      <div class="muted" style="margin-bottom:10px">所有学习进度、积分、错题本、宠物数据均保存在本机浏览器中。建议每周导出一次备份文件，换设备时导入即可继续。</div>
      <div class="btnrow">
        <button class="btn" id="exp">⬇️ 导出备份（JSON）</button>
        <button class="btn ghost" id="imp">⬆️ 导入备份</button>
        <button class="btn" id="qrs">📤 生成传档二维码</button>
        <button class="btn ghost" id="qri">📷 扫码导入</button>
        <button class="btn ghost" id="rst" style="color:#d15252">🗑️ 清空全部数据</button>
      </div>`;
    c.appendChild(b4);
    b4.querySelector('#exp').onclick=()=>{
      const blob=new Blob([Store.exportJSON()],{type:'application/json'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);
      a.download=`学习工作台备份_${todayStr()}.json`;a.click();toast('已导出备份','ok');
    };
    b4.querySelector('#imp').onclick=()=>{
      const i=document.createElement('input');i.type='file';i.accept='.json';
      i.onchange=()=>{const f=i.files[0];if(!f)return;const r=new FileReader();
        r.onload=()=>{ if(Store.importJSON(r.result)){toast('导入成功','ok');setTimeout(()=>location.reload(),800);} else toast('文件格式错误','err'); };
        r.readAsText(f);};
      i.click();
    };
    b4.querySelector('#qrs').onclick=()=>Transfer.openSender();
    b4.querySelector('#qri').onclick=()=>Transfer.openReceiver();
    b4.querySelector('#rst').onclick=()=>{
      modal('确认清空？','<p>将删除全部学习记录、积分、错题本和宠物数据，<b>此操作不可恢复</b>。</p><p class="muted">建议先导出备份。</p>',
        [{label:'取消',cls:'ghost'},{label:'确认清空',cls:'pink',fn:()=>{Store.reset();location.reload();}}]);
    };

    const b5=el('div','card tint');
    b5.innerHTML=`<div class="card-h"><h2>📐 积分与惩罚规则</h2></div>
      <table class="tb"><tr><th>项目</th><th>积分</th></tr>
        <tr><td>完整完成当日全部学习任务</td><td><b>100</b> 基础积分</td></tr>
        <tr><td>单词全对 / 跟读满分 / 练习零错题</td><td>+20 ~ 50 奖励积分</td></tr>
        <tr><td>连续打卡 3 / 7 / 30 天</td><td>阶梯积分礼包（+80 / +200 / +800，含永久道具）</td></tr>
      </table>
      <table class="tb" style="margin-top:14px"><tr><th>未完成情况</th><th>惩罚措施</th></tr>
        <tr><td>单日未完成</td><td>扣除当日基础积分；签到类/限时装饰道具清零（<b>永久道具保留</b>）</td></tr>
        <tr><td>连续 2 天未完成</td><td>扣除近 3 天 50% 累计积分；消耗型道具减半；暂停 1 次关卡解锁资格</td></tr>
        <tr><td>连续 3 天及以上</td><td>清空连续打卡礼包；冻结积分商城兑换权限 1 天；限时活动道具全部回收（<b>永久道具不受影响</b>）</td></tr>
      </table>
      <div class="hint" style="margin-top:12px">💪 <b>补救机制</b>：断卡后通过<b>双倍完成次日学习任务</b>（单词加倍复盘 + 额外加练 1 篇短文）触发挽回机制 → <b>追回一半扣除积分</b>，恢复道具与兑换权限。</div>`;
    c.appendChild(b5);
  }

  /* ---------------- 提醒 ---------------- */
  let lastRemind='';
  function startReminder(){
    setInterval(()=>{
      const S=Store.state();
      if(!S.settings.remindOn) return;
      const now=new Date();
      const hm=pad(now.getHours())+':'+pad(now.getMinutes());
      if(S.settings.reminders.includes(hm) && lastRemind!==hm){
        lastRemind=hm;
        const left=10-Store.doneCount();
        if(left<=0) return;
        const msg=`该学习啦！今天还有 ${left} 项任务没完成～`;
        toast('⏰ '+msg,'warn',5000);
        if('Notification' in window && Notification.permission==='granted')
          new Notification('专属学习工作台',{body:msg});
      }
    },30000);
  }

  return {boot,go,refreshNav,celebrate,onLeave:null};
})();

document.addEventListener('DOMContentLoaded',App.boot);
