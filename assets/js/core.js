/* =========================================================
   核心引擎：数据持久化 / 打卡 / 积分 / 惩罚补救 / 语音 / 工具
   ========================================================= */

/* ---------- 通用工具 ---------- */
const $  = (s,r)=> (r||document).querySelector(s);
const $$ = (s,r)=> Array.from((r||document).querySelectorAll(s));
const el = (tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
const pad = n => String(n).padStart(2,'0');
const todayStr = ()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const dateStr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseDate = s =>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);};
const daysBetween = (a,b)=> Math.round((parseDate(b)-parseDate(a))/86400000);
const addDays = (s,n)=>{const d=parseDate(s);d.setDate(d.getDate()+n);return dateStr(d);};

/* 可复现随机（同一天 → 同一份内容） */
function seedRand(seed){let s=(seed>>>0)||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
/** 从 pool 中按 dayIndex 取 count 条，滚动不重复 */
function pickDaily(pool,dayIndex,count,salt){
  const n=pool.length,out=[];
  if(!n) return out;
  const start=((dayIndex*count)+(salt||0))%n;
  for(let i=0;i<Math.min(count,n);i++) out.push(pool[(start+i)%n]);
  return out;
}
/** 用种子打乱数组（不改原数组） */
function shuffleSeed(arr,seed){
  const a=arr.slice(),r=seedRand(seed);
  for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

/* ---------- Toast ---------- */
function toast(msg,type,ms){
  let box=$('#toast'); if(!box){box=el('div');box.id='toast';document.body.appendChild(box);}
  const t=el('div','toast'+(type?' '+type:''),msg);
  box.appendChild(t);
  setTimeout(()=>{t.style.transition='opacity .3s,transform .3s';t.style.opacity='0';t.style.transform='translateY(-10px)';setTimeout(()=>t.remove(),320);},ms||2000);
}
/* ---------- Modal ---------- */
function modal(title,bodyHTML,actions){
  const mask=el('div','modal-mask');
  const m=el('div','modal');
  m.innerHTML=`<h3>${title}</h3><div class="mbody">${bodyHTML}</div>`;
  const bar=el('div','btnrow');bar.style.marginTop='16px';bar.style.justifyContent='flex-end';
  (actions||[{label:'知道啦',cls:''}]).forEach(a=>{
    const b=el('button','btn '+(a.cls||''),a.label);
    b.onclick=()=>{ if(!a.fn||a.fn(m)!==false) mask.remove(); };
    bar.appendChild(b);
  });
  m.appendChild(bar);mask.appendChild(m);
  mask.addEventListener('click',e=>{if(e.target===mask)mask.remove();});
  document.body.appendChild(mask);
  return m;
}

/* ---------- 语音（Web Speech API） ---------- */
const Speech = (function(){
  let voices=[];
  function load(){ voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; }
  if(window.speechSynthesis){ load(); speechSynthesis.onvoiceschanged = load; }
  /* 优先选择更自然、标准美式/英式嗓音，避开机械音（旧版只取第一个匹配，常选到劣质嗓音） */
  const PREF_EN=['samantha','daniel','google us english','microsoft aria online','microsoft aria','microsoft david','arthur','karen','natural','neural','premium','enhanced'];
  const PREF_ZH=['google','yaoyao','xiaoxiao','huihui','natural','neural','premium','enhanced','yue'];
  function bestVoice(lang){
    if(!voices.length) load();
    const base=(lang||'zh').toLowerCase().split('-')[0];
    const pool=voices.filter(v=>v.lang && v.lang.toLowerCase().startsWith(base));
    const list=pool.length?pool:voices;
    const pref=base==='en'?PREF_EN:PREF_ZH;
    let best=list[0]||null,score=-1;
    list.forEach(v=>{
      const n=(v.name||'').toLowerCase();
      let s=0;
      pref.forEach((p,i)=>{ if(n.indexOf(p)>=0) s=Math.max(s,pref.length-i); });
      if(s>score){score=s;best=v;}
    });
    return best;
  }
  function pickVoice(lang){ return bestVoice(lang); }
  function speak(text,opt){
    opt=opt||{};
    if(!window.speechSynthesis){ toast('当前浏览器不支持语音朗读','warn'); return; }
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang = opt.lang || 'zh-CN';
    u.rate = (opt.rate!=null)?opt.rate:1;
    u.pitch= opt.pitch|| 1;
    const v=bestVoice(u.lang); if(v) u.voice=v;
    if(opt.onend) u.onend=opt.onend;
    if(opt.onstart) u.onstart=opt.onstart;
    speechSynthesis.speak(u);
    return u;
  }
  const zh = (t,o)=>speak(t,Object.assign({lang:'zh-CN'},o||{}));
  const en = (t,o)=>{
    o=o||{};
    const st=(typeof Store!=='undefined' && Store.state && Store.state().settings)||{};
    const rate=(o.rate!=null)?o.rate:(st.enSpeed||1);
    return speak(t,Object.assign({lang:(o.uk||st.uk)?'en-GB':'en-US',rate:rate},o));
  };
  function stop(){ if(window.speechSynthesis) speechSynthesis.cancel(); }
  /** 逐句朗读，每句回调高亮 */
  function seq(list,opt){
    opt=opt||{};let i=0;
    function next(){
      if(i>=list.length){ opt.onAll&&opt.onAll(); return; }
      const item=list[i];
      opt.onEach&&opt.onEach(i);
      speak(item,{lang:opt.lang||'zh-CN',rate:opt.rate||1,onend:()=>{i++;setTimeout(next,opt.gap||260);}});
    }
    next();
  }
  /* iOS 首次朗读常因嗓音列表未加载而用默认劣质音；首次用户交互时预热列表 */
  function warmup(){
    if(!window.speechSynthesis) return;
    load();
    try{ const u=new SpeechSynthesisUtterance(' '); u.volume=0; speechSynthesis.speak(u); speechSynthesis.cancel(); }catch(e){}
  }
  if(window.speechSynthesis){
    ['pointerdown','touchstart','keydown'].forEach(ev=>window.addEventListener(ev,warmup,{once:true,passive:true}));
  }
  return {speak,zh,en,stop,seq,pickVoice,bestVoice,warmup,list:()=>voices};
})();

/* ---------- 录音 ---------- */
const Recorder = (function(){
  let mr=null,chunks=[],stream=null;
  async function start(){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) throw new Error('设备不支持录音');
    stream=await navigator.mediaDevices.getUserMedia({audio:true});
    chunks=[];mr=new MediaRecorder(stream);
    mr.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    mr.start();
  }
  function stop(){
    return new Promise(res=>{
      if(!mr){res(null);return;}
      mr.onstop=()=>{
        const blob=new Blob(chunks,{type:mr.mimeType||'audio/webm'});
        stream&&stream.getTracks().forEach(t=>t.stop());
        mr=null;res(blob);
      };
      mr.stop();
    });
  }
  const active=()=>!!mr;
  return {start,stop,active};
})();

/* ---------- 图片压缩（拍照上传打卡） ---------- */
function compressImage(file,maxW){
  return new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const scale=Math.min(1,(maxW||520)/img.width);
        const c=document.createElement('canvas');
        c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        res(c.toDataURL('image/jpeg',.72));
      };
      img.onerror=rej;img.src=r.result;
    };
    r.onerror=rej;r.readAsDataURL(file);
  });
}

/* =========================================================
   Store：状态管理与持久化
   ========================================================= */
const Store = (function(){
  const KEY='sswx_workbench_v1';
  const MODULES=['hanzi','sentence','poem','guwen','calc','think','word','ensent','enread','enlisten'];

  const blankDay = ()=>({
    tasks:{},        // 模块key -> {done, score, right, total, extra}
    base:false,      // 是否已发放 100 基础积分
    gained:0,        // 当日获得积分
    penalty:0,       // 当日被扣积分
    feed:0,          // 当日获得饲料
    photos:{},       // 模块key -> dataURL
    doubled:false,   // 是否完成了双倍补救任务
    minutes:0
  });

  const def = ()=>({
    v:1,
    startDate: todayStr(),
    child:{name:'小学员',grade:'四升五',city:'广东·中山'},
    points:0, totalEarned:0,
    streak:0, bestStreak:0, lastFullDay:null,
    days:{},
    wrong:{ word:[], calc:[], think:[], listen:[], read:[] },
    inventory:{},       // itemId -> {n, perm}
    gifts:{},           // '3','7','30' -> true
    pet:{ id:'lanlan', name:'蓝蓝', stage:0, exp:0, food:0, mood:80, clean:80, lastCare:null, unlocked:['lanlan'] },
    settings:{ reminders:['08:30','15:00','19:30'], remindOn:true, autoSpeak:true, uk:false, enSpeed:0.95 },
    penaltyLog:{},      // date -> true 已结算
    rescue:{ pending:false, from:null }
  });

  let S = load();

  function load(){
    try{
      const raw=localStorage.getItem(KEY);
      if(!raw) return def();
      const o=JSON.parse(raw);
      return Object.assign(def(),o);
    }catch(e){ return def(); }
  }
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){ toast('存储空间不足，请清理部分打卡照片','err'); } }
  function state(){ return S; }
  function day(d){ d=d||todayStr(); if(!S.days[d]) S.days[d]=blankDay(); return S.days[d]; }
  function dayIndex(){ return Math.max(0, daysBetween(S.startDate, todayStr())); }
  function planDay(){ return Math.min(30, dayIndex()+1); }   // 第几天（1-30）

  /* --- 任务量（含补救双倍） --- */
  const BASE_QUOTA = {hanzi:20,sentence:5,poem:1,guwen:1,calc:40,think:5,word:20,ensent:8,enread:1,enlisten:3};
  function quota(k){
    const q=BASE_QUOTA[k];
    if(!S.rescue.pending) return q;
    if(k==='word') return q*2;           // 单词加倍复盘
    if(k==='enread') return q+1;         // 额外加练 1 篇短文
    return q;
  }

  /* --- 完成一个模块 --- */
  function finish(k,info){
    const d=day();
    if(d.tasks[k] && d.tasks[k].done) { Object.assign(d.tasks[k],info||{}); save(); return {repeat:true}; }
    d.tasks[k]=Object.assign({done:true,ts:Date.now()},info||{});
    let bonus=0,reasons=[];
    // 奖励积分：全对 / 满分 / 零错题
    if(info && info.total>0){
      const rate=info.right/info.total;
      if(rate>=1)      { bonus=50; reasons.push('全对'); }
      else if(rate>=.9){ bonus=35; reasons.push('优秀（≥90%）'); }
      else if(rate>=.8){ bonus=20; reasons.push('良好（≥80%）'); }
    }
    if(info && info.perfectRead){ bonus=Math.max(bonus,40); reasons.push('跟读满分'); }
    d.gained += bonus;
    addPoints(bonus,'模块奖励:'+k);
    // 饲料：每完成一个模块 +2
    d.feed += 2; S.pet.food += 2;
    checkAllDone();
    save();
    return {bonus,reasons};
  }

  function allDoneToday(){
    const d=day();
    return MODULES.every(k=>d.tasks[k]&&d.tasks[k].done);
  }
  function doneCount(dt){
    const d=day(dt);
    return MODULES.filter(k=>d.tasks[k]&&d.tasks[k].done).length;
  }

  /* --- 全部完成 → 100 基础分 + 打卡 + 连续奖励 --- */
  function checkAllDone(){
    const t=todayStr(), d=day(t);
    if(d.base || !allDoneToday()) return false;
    d.base=true; d.gained+=100; addPoints(100,'当日全部完成');
    S.pet.food += 8;
    // 连续打卡
    if(S.lastFullDay && daysBetween(S.lastFullDay,t)===1) S.streak++;
    else if(S.lastFullDay===t){}
    else S.streak=1;
    S.lastFullDay=t;
    S.bestStreak=Math.max(S.bestStreak,S.streak);
    // 阶梯礼包
    const gifts={3:{p:80,item:'sticker',label:'连续3天'},7:{p:200,item:'hat',label:'连续7天'},30:{p:800,item:'crown',label:'连续30天'}};
    [3,7,30].forEach(n=>{
      if(S.streak>=n && !S.gifts[n]){
        S.gifts[n]=true; addPoints(gifts[n].p,'阶梯礼包'+n+'天');
        addItem(gifts[n].item,1,true);
        setTimeout(()=>modal('🎁 阶梯打卡礼包',
          `<p style="font-size:17px">恭喜达成 <b>${gifts[n].label}</b> 打卡！</p>
           <p>获得 <b style="color:#ff9a3c">+${gifts[n].p}</b> 积分 与 永久道具 <b>${ITEMS[gifts[n].item].name}</b>。</p>`),400);
      }
    });
    // 补救成功判定
    if(S.rescue.pending){
      const back=Math.round((S.rescue.deducted||0)/2);
      addPoints(back,'补救追回');
      S.inventory.__frozen=false;
      S.rescue={pending:false,from:null,deducted:0};
      setTimeout(()=>modal('💪 挽回成功',
        `<p>你完成了双倍任务，成功触发挽回机制：</p>
         <ul><li>追回积分 <b>+${back}</b></li><li>已恢复道具与兑换权限</li></ul>
         <p class="muted">断卡不可怕，补回来就是好样的。</p>`),500);
    }
    save();
    return true;
  }

  function addPoints(n,why){
    if(!n) return;
    S.points=Math.max(0,S.points+n);
    if(n>0) S.totalEarned+=n;
    save();
  }

  /* --- 道具 --- */
  const ITEMS = {
    // 永久道具（不受惩罚回收）
    crown:  {name:'黄金皇冠',ic:'👑',price:800,perm:true,desc:'宠物专属头饰，永久保留'},
    hat:    {name:'探险帽',  ic:'🎩',price:300,perm:true,desc:'宠物头饰，永久保留'},
    house:  {name:'小木屋',  ic:'🏡',price:500,perm:true,desc:'家园装饰，永久保留'},
    tree:   {name:'许愿树',  ic:'🌳',price:400,perm:true,desc:'家园装饰，永久保留'},
    role:   {name:'宇航员装',ic:'👨‍🚀',price:600,perm:true,desc:'专属角色皮肤，永久保留'},
    // 限时/签到/消耗型（断卡会被回收或减半）
    sticker:{name:'闪亮贴纸',ic:'✨',price:60, perm:false,desc:'签到限定装饰，断卡会清零'},
    ball:   {name:'弹力球',  ic:'🏐',price:40, perm:false,desc:'与宠物互动，消耗型'},
    cake:   {name:'生日蛋糕',ic:'🎂',price:120,perm:false,desc:'限时装饰，断卡会回收'},
    ticket: {name:'游戏次数券',ic:'🎫',price:80,perm:false,desc:'兑换1次小游戏机会，消耗型'},
    key:    {name:'关卡钥匙',ic:'🔑',price:150,perm:false,desc:'解锁1个新关卡，消耗型'},
    fish:   {name:'豪华鱼干',ic:'🐟',price:50, perm:false,desc:'高级饲料，+20成长值'}
  };
  function addItem(id,n,perm){
    if(!S.inventory[id]) S.inventory[id]={n:0,perm:!!ITEMS[id].perm};
    S.inventory[id].n+=(n||1); save();
  }
  function buy(id){
    const it=ITEMS[id]; if(!it) return false;
    if(S.inventory.__frozen){ toast('积分商城兑换权限已冻结，完成今日任务即可恢复','err'); return false; }
    if(S.points<it.price){ toast('积分不够呀，再完成一些任务吧','warn'); return false; }
    addPoints(-it.price,'兑换'+it.name); addItem(id,1);
    toast('兑换成功：'+it.name,'ok'); return true;
  }
  function useItem(id){
    if(!S.inventory[id]||S.inventory[id].n<=0) return false;
    if(ITEMS[id].perm) return true;   // 永久道具不消耗
    S.inventory[id].n--; save(); return true;
  }

  /* --- 惩罚结算（温和自律导向） --- */
  function settlePenalty(){
    const t=todayStr();
    const start=S.startDate;
    if(daysBetween(start,t)<1) return null;
    let msgs=[];
    // 逐日检查历史（不含今天）
    for(let i=0;i<daysBetween(start,t);i++){
      const ds=addDays(start,i);
      if(S.penaltyLog[ds]) continue;
      const d=S.days[ds];
      const full = d && d.base;
      S.penaltyLog[ds]=true;
      if(full) continue;
      // 该日未完成 → 计算连续未完成天数
      let miss=1;
      for(let j=i-1;j>=0;j--){
        const ps=addDays(start,j);
        const pd=S.days[ps];
        if(pd&&pd.base) break;
        miss++;
      }
      let ded=0;
      if(miss===1){
        ded=(d?d.gained:0);
        // 扣除当日基础积分（若已得）+ 清零签到类/限时装饰
        ded=Math.min(S.points, Math.max(ded, 0));
        addPoints(-ded,'单日未完成');
        clearTempDecor();
        msgs.push(`${ds}：单日未完成 → 扣除当日基础积分 ${ded}，签到类/限时装饰道具已清零（永久道具保留）`);
      }else if(miss===2){
        let sum=0; for(let k=0;k<3;k++){const dd=S.days[addDays(ds,-k)];if(dd)sum+=dd.gained;}
        ded=Math.round(sum*0.5); addPoints(-ded,'连续2天未完成');
        halveConsumables(); S.lockLevel=true;
        msgs.push(`${ds}：连续2天未完成 → 扣除近3天累计积分的50%（${ded}分），消耗型道具减半，暂停1次关卡解锁资格`);
      }else{
        S.gifts={}; S.streak=0;
        S.inventory.__frozen=true; S.frozenUntil=addDays(ds,1);
        recallTempItems();
        msgs.push(`${ds}：连续${miss}天未完成 → 连续打卡礼包已清空，积分商城兑换权限冻结1天，限时活动道具全部回收（永久道具不受影响）`);
      }
      S.rescue={pending:true,from:ds,deducted:(S.rescue.deducted||0)+ded};
    }
    // 解冻
    if(S.frozenUntil && daysBetween(S.frozenUntil,t)>=1){ S.inventory.__frozen=false; S.frozenUntil=null; }
    save();
    return msgs.length?msgs:null;
  }
  function clearTempDecor(){
    ['sticker','cake'].forEach(id=>{ if(S.inventory[id]) S.inventory[id].n=0; });
  }
  function halveConsumables(){
    ['ball','ticket','key','fish'].forEach(id=>{ if(S.inventory[id]) S.inventory[id].n=Math.floor(S.inventory[id].n/2); });
  }
  function recallTempItems(){
    Object.keys(S.inventory).forEach(id=>{ if(ITEMS[id]&&!ITEMS[id].perm) S.inventory[id].n=0; });
  }

  /* --- 错题本 --- */
  function addWrong(type,item){
    if(!S.wrong[type]) S.wrong[type]=[];
    const key=JSON.stringify(item.k||item.q||item.en);
    const ex=S.wrong[type].find(x=>x._k===key);
    if(ex){ ex.n=(ex.n||1)+1; ex.date=todayStr(); }
    else S.wrong[type].push(Object.assign({_k:key,n:1,date:todayStr()},item));
    save();
  }
  function removeWrong(type,k){
    S.wrong[type]=(S.wrong[type]||[]).filter(x=>x._k!==k); save();
  }
  /** 次日优先复盘：取昨天及以前的错词 */
  function reviewWords(n){
    const list=(S.wrong.word||[]).slice().sort((a,b)=>(b.n||1)-(a.n||1));
    return list.slice(0,n);
  }

  function reset(){ localStorage.removeItem(KEY); S=def(); save(); }
  function exportJSON(){ return JSON.stringify(S,null,2); }
  function importJSON(txt){ try{ S=Object.assign(def(),JSON.parse(txt)); save(); return true;}catch(e){ return false; } }

  return {state,save,day,dayIndex,planDay,quota,BASE_QUOTA,MODULES,
          finish,allDoneToday,doneCount,checkAllDone,addPoints,
          ITEMS,addItem,buy,useItem,settlePenalty,
          addWrong,removeWrong,reviewWords,reset,exportJSON,importJSON};
})();

/* ---------- 宠物系统数据 ---------- */
const PETS = {
  lanlan:{name:'蓝蓝',type:'小蓝龙',stages:['🥚','🐣','🐲','🐉'],stageName:['蛋宝宝','初生龙','小飞龙','守护巨龙'],desc:'温和爱学习的小蓝龙，喜欢听你朗读。'},
  mimi: {name:'咪咪',type:'书虫猫',stages:['🥚','🐱','😺','🦁'],stageName:['蛋宝宝','小奶猫','读书猫','智慧狮'],desc:'一只爱看书的小猫，最喜欢古诗。'},
  doudou:{name:'豆豆',type:'算术兔',stages:['🥚','🐰','🐇','🦄'],stageName:['蛋宝宝','小奶兔','算术兔','独角兽'],desc:'算得飞快的小兔子，喜欢陪你做计算。'},
  pipi:{name:'皮皮',type:'英语鹦鹉',stages:['🥚','🐤','🦜','🦚'],stageName:['蛋宝宝','小黄鸟','英语鹦鹉','七彩孔雀'],desc:'会说英语的鹦鹉，跟读时它会一起念。'}
};
const PET_EXP = [0,60,200,500];   // 各阶段所需成长值
