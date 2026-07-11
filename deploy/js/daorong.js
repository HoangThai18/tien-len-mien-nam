/* =========================================================================
   ĐẢO RỒNG — game nuôi/lai rồng, gắn tài khoản (users/<uid>/daorong).
   Đầy đủ màn: Đảo · Chi tiết rồng (cho ăn/bán) · Lai rồng · Sách rồng ·
   Đấu trường · Shop/Thức ăn · cấp người chơi + XP. Vẽ bằng CSS/SVG.
   File CHỈ khai báo; mọi wiring nằm trong hàm (không chạy code top-level).
   ========================================================================= */
let drState=null, drActive=false, drBuilt=false, drReduce=false;
let drSaveT=null, drCoinTimer=null, drTick=null, drServerOffset=0;
// Giờ server ước lượng — timer lai rồng dùng cái này, KHÔNG dùng Date.now() thuần
// để đổi đồng hồ máy không tua được timer. (Không có sinh-vàng-offline nên vàng an toàn.)
function drNow(){ return Date.now()+drServerOffset; }

/* ---------- Nguyên tố ---------- */
const DR_PAL={
  fire:    {body:'#ff7a4d', bd:'#ffd7b3', wg:'#ffb27a', st:'#d1481f', horn:'#c23c17'},
  water:   {body:'#4db4ec', bd:'#d3effb', wg:'#8fd6f5', st:'#2378b8', horn:'#1e6ba3'},
  plant:   {body:'#6ece63', bd:'#e0f7cf', wg:'#a6e58a', st:'#3f9a44', horn:'#357c39'},
  earth:   {body:'#cf9a5c', bd:'#f0dcbe', wg:'#e0be8e', st:'#8a5a2b', horn:'#734419'},
  electric:{body:'#ffcf4d', bd:'#fff3c2', wg:'#ffe285', st:'#d89a12', horn:'#b97f0d'},
  ice:     {body:'#8fdcea', bd:'#e2f8fc', wg:'#bfeef6', st:'#3f9fb8', horn:'#2f8296'},
  dark:    {body:'#8f78d8', bd:'#e4dcff', wg:'#b6a4ee', st:'#5a41a3', horn:'#472f86'},
  light:   {body:'#ffe08a', bd:'#fff7d6', wg:'#ffeeb0', st:'#d9a516', horn:'#b9860d'},
};
const DR_ELNAME={fire:'Lửa',water:'Nước',plant:'Cây',earth:'Đất',electric:'Điện',ice:'Băng',dark:'Bóng tối',light:'Ánh sáng'};
const DR_RAR={
  common:   {n:'Thường',    c:'#7c8f8b', mult:1},
  rare:     {n:'Hiếm',      c:'#2f9fb8', mult:2},
  epic:     {n:'Cực hiếm',  c:'#8a5cc4', mult:4},
  legendary:{n:'Huyền thoại',c:'#e0972a', mult:8},
};
const DR_ICON_ROOT='assets/dragon-island/items/';
const DR_ICONS={
  shop:'shop.webp', quest:'quest.webp', breed:'breed.webp', food:'food.webp',
  arena:'arena.webp', codex:'codex.webp', egg:'egg.webp', gem:'gem.webp',
  gold:'gold.webp', rock:'rock.webp', star:'star.webp', gift:'gift.webp',
};
function drIcon(id,cls){
  const file=DR_ICONS[id]||DR_ICONS.gift;
  return `<img class="dr-ui-icon ${cls||''}" src="${DR_ICON_ROOT}${file}" alt="" draggable="false">`;
}
/* ---------- Loài rồng (đồ giám) ---------- */
const DR_SPECIES={
  fire:    {name:'Rồng Lửa',       el:'fire',    els:['fire'],           rar:'common', gold:10, atk:42, hp:100, range:3, spd:6, sheet:{url:'assets/dragons/fire.png', frames:6, fps:5}},
  water:   {name:'Rồng Nước',      el:'water',   els:['water'],          rar:'common', gold:10, atk:38, hp:112, range:4, spd:5, sheet:{url:'assets/dragons/water.png', frames:8, fps:9}},
  plant:   {name:'Rồng Cây',       el:'plant',   els:['plant'],          rar:'common', gold:10, atk:36, hp:118, range:3, spd:5},
  earth:   {name:'Rồng Đất',       el:'earth',   els:['earth'],          rar:'common', gold:11, atk:46, hp:126, range:2, spd:4},
  electric:{name:'Rồng Điện',      el:'electric',els:['electric'],       rar:'rare',   gold:16, atk:54, hp:100, range:5, spd:8},
  ice:     {name:'Rồng Băng',      el:'ice',     els:['ice'],            rar:'rare',   gold:16, atk:50, hp:110, range:4, spd:6},
  lava:    {name:'Rồng Dung Nham', el:'fire',    els:['fire','earth'],   rar:'rare',   gold:22, atk:62, hp:132, range:3, spd:5},
  steam:   {name:'Rồng Hơi Nước',  el:'water',   els:['fire','water'],   rar:'rare',   gold:22, atk:56, hp:120, range:4, spd:6},
  swamp:   {name:'Rồng Đầm Lầy',   el:'plant',   els:['water','plant'],  rar:'rare',   gold:22, atk:52, hp:138, range:3, spd:5},
  storm:   {name:'Rồng Bão',       el:'electric',els:['electric','water'],rar:'epic',  gold:34, atk:74, hp:130, range:5, spd:9},
  dark:    {name:'Hắc Long',       el:'dark',    els:['dark'],           rar:'epic',   gold:40, atk:86, hp:150, range:4, spd:7, sheet:{url:'assets/dragons/dark.png', frames:5, fps:4}},
  light:   {name:'Thần Long',      el:'light',   els:['light'],          rar:'legendary',gold:70,atk:110,hp:180, range:5, spd:8},
};
const DR_SP_ORDER=['fire','water','plant','earth','electric','ice','lava','steam','swamp','storm','dark','light'];
/* Bảng lai: cặp nguyên tố (sắp xếp) -> loài có thể ra (ngẫu nhiên) */
const DR_BREED={
  'fire+fire':['fire','fire','lava'],
  'water+water':['water','water','steam'],
  'plant+plant':['plant','plant','swamp'],
  'earth+earth':['earth','earth','lava'],
  'earth+fire':['lava','fire','earth'],
  'fire+water':['steam','fire','water'],
  'plant+water':['swamp','ice','water','plant'],
  'electric+water':['storm','water','electric'],
  'electric+earth':['electric','earth','storm'],
  'ice+plant':['ice','plant','swamp'],
  'dark+fire':['dark','lava','fire'],
  'dark+dark':['dark','dark','light'],
  'electric+electric':['electric','electric','storm'],
  'ice+ice':['ice','ice','storm'],
};
/* Khắc chế nguyên tố (đấu trường) */
const DR_ADV={water:'fire', fire:'plant', plant:'water', earth:'electric', electric:'ice', ice:'plant', dark:'light', light:'dark'};

const DR_SLOTS=[[30,32],[58,28],[44,47],[31,61],[66,56],[48,68],[73,40],[21,47],
  [15,58],[85,52],[38,24],[62,70]];      // 8 ô gốc + 4 ô mở ra khi dọn chướng ngại
const DR_DECO=[['🌴',12,20,1.5],['🌸',82,42,1],['🍄',20,72,1],['🌷',75,73,1],['✨',52,17,.9],['🌿',88,60,1.1]];
const DR_BASE_CAP=8;                      // số ô nuôi rồng ban đầu (giữ nguyên như bản cũ, không nerf save cũ)
const DR_MAX=12;                          // trần tối đa sau khi mở rộng đảo
// Chướng ngại quanh đảo: dọn tốn vàng -> thưởng 💎/🍖/XP + mở thêm 1 ô nuôi rồng. Giá tăng dần.
const DR_OBSTACLES=[
  {id:'rock',    ic:'🪨', name:'Tảng đá',        x:16, y:40, cost:500,  gems:3,  food:20, xp:30},
  {id:'cactus',  ic:'🌵', name:'Bụi xương rồng', x:84, y:40, cost:1500, gems:5,  food:30, xp:60},
  {id:'log',     ic:'🪵', name:'Khúc gỗ mục',    x:22, y:73, cost:3500, gems:8,  food:45, xp:110},
  {id:'boulder', ic:'⛰️', name:'Gò đá lớn',      x:78, y:73, cost:7000, gems:14, food:70, xp:180},
];
// Sức chứa rồng hiện tại = ô gốc + số chướng ngại đã dọn (không tụt dưới số rồng đang có).
function drCapacity(){
  const cleared=(drState&&drState.cleared)?drState.cleared.length:0;
  return Math.max(drState?drState.dragons.length:0, Math.min(DR_MAX, DR_BASE_CAP+cleared));
}

/* ---------- SVG rồng chibi ---------- */
function drDragonSVG(el){
  const p=DR_PAL[el]||DR_PAL.fire;
  return '<svg class="dr-drg" viewBox="0 0 100 104" xmlns="http://www.w3.org/2000/svg">'
    +'<ellipse class="shadow" cx="50" cy="99" rx="30" ry="6"/>'
    +'<g class="wing"><path d="M74 44 q26 -14 22 12 q-4 16 -22 8 z" fill="'+p.wg+'" stroke="'+p.st+'" stroke-width="2.5" stroke-linejoin="round"/></g>'
    +'<g class="tail"><path d="M30 74 q-24 2 -22 -20 q10 12 20 6 z" fill="'+p.body+'" stroke="'+p.st+'" stroke-width="2.5" stroke-linejoin="round"/>'
      +'<path d="M6 52 l-9 -8 l11 -1 l1 -10 l7 10 z" fill="'+p.wg+'" stroke="'+p.st+'" stroke-width="2.5" stroke-linejoin="round"/></g>'
    +'<g class="body">'
      +'<path d="M50 20 l6 12 l-12 0 z M62 26 l6 11 l-11 1 z M38 26 l5 12 l-11 0 z" fill="'+p.st+'"/>'
      +'<path d="M34 24 l-3 -14 l10 9 z" fill="'+p.horn+'"/><path d="M66 24 l3 -14 l-10 9 z" fill="'+p.horn+'"/>'
      +'<ellipse cx="50" cy="60" rx="31" ry="29" fill="'+p.body+'" stroke="'+p.st+'" stroke-width="3"/>'
      +'<ellipse cx="50" cy="70" rx="18" ry="16" fill="'+p.bd+'"/>'
      +'<ellipse cx="38" cy="88" rx="9" ry="6" fill="'+p.body+'" stroke="'+p.st+'" stroke-width="2.5"/>'
      +'<ellipse cx="62" cy="88" rx="9" ry="6" fill="'+p.body+'" stroke="'+p.st+'" stroke-width="2.5"/>'
      +'<circle cx="33" cy="62" r="5" fill="#ff8fa3" opacity=".55"/><circle cx="67" cy="62" r="5" fill="#ff8fa3" opacity=".55"/>'
      +'<circle cx="40" cy="52" r="8" fill="#fff"/><circle cx="60" cy="52" r="8" fill="#fff"/>'
      +'<circle cx="42" cy="53" r="4" fill="#22303a"/><circle cx="62" cy="53" r="4" fill="#22303a"/>'
      +'<circle cx="43.4" cy="51.4" r="1.5" fill="#fff"/><circle cx="63.4" cy="51.4" r="1.5" fill="#fff"/>'
      +'<rect class="lid" x="32" y="44" width="16" height="9" rx="4" fill="'+p.body+'"/>'
      +'<rect class="lid" x="52" y="44" width="16" height="9" rx="4" fill="'+p.body+'" style="animation-delay:.15s"/>'
      +'<circle cx="46" cy="64" r="1.3" fill="'+p.st+'"/><circle cx="54" cy="64" r="1.3" fill="'+p.st+'"/>'
      +'<path d="M44 68 q6 6 12 0" stroke="'+p.st+'" stroke-width="2.2" stroke-linecap="round" fill="none"/>'
    +'</g></svg>';
}
// Chọn hình rồng: sprite-sheet (nhiều khung, vẫy cánh/nhấp mắt) > ảnh tĩnh (CSS animate) > SVG (fallback).
// Hoạ sĩ chỉ cần khai báo species.sheet hoặc species.art là tự thay — không đụng code khác.
function drDragonArt(sp){
  const s=DR_SPECIES[sp]||DR_SPECIES.fire;
  if(s.sheet) return `<div class="dr-sprite" style="--url:url('${s.sheet.url}'); --frames:${s.sheet.frames}; --dur:${(s.sheet.frames/(s.sheet.fps||8)).toFixed(2)}s"></div>`;
  if(s.art)   return `<img class="dr-img" src="${s.art}" alt="" draggable="false">`;
  return drDragonSVG(s.el);
}
function drElChip(el){ return `<span class="dr-chip el-${el}">${DR_ELNAME[el]||el}</span>`; }
function drRarChip(rar){ const r=DR_RAR[rar]||DR_RAR.common; return `<span class="dr-rar" style="--rc:${r.c}">${r.n}</span>`; }

/* ---------- State ---------- */
function drDefault(){
  return {gold:800, gems:20, food:60, level:1, xp:0,
    dragons:[{sp:'fire',lv:1,fed:0},{sp:'water',lv:1,fed:0},{sp:'plant',lv:1,fed:0}], breed:null, cleared:[],
    qc:{tap:0,feed:0,breed:0,win:0,clear:0}, qClaimed:[],
    ore:0, forge:{gold:0,power:0}, mails:[], spinDay:0, mailSeeded:false};
}
function drNormDragons(arr){
  return (arr||[]).map(d=>{
    if(typeof d==='string'){ const sp=d==='violet'?'dark':(DR_SPECIES[d]?d:'fire'); return {sp,lv:1,fed:0}; }
    if(d&&d.sp&&DR_SPECIES[d.sp]) return {sp:d.sp, lv:d.lv||1, fed:d.fed||0, star:Math.min(5,Math.max(1,d.star||1))};
    if(d&&d.el&&DR_SPECIES[d.el]) return {sp:d.el, lv:d.lv||1, fed:d.fed||0};
    return {sp:'fire',lv:1,fed:0};
  }).slice(0,DR_MAX);
}
function drUid(){ return (auth&&auth.currentUser)?auth.currentUser.uid:'guest'; }
function drLsKey(){ return 'daorong-'+drUid(); }
function drNorm(v){
  const validIds=new Set(DR_OBSTACLES.map(o=>o.id));
  return {gold:v.gold||0, gems:v.gems||0, food:v.food||0, level:v.level||1, xp:v.xp||0,
    dragons:drNormDragons(v.dragons).length?drNormDragons(v.dragons):drDefault().dragons,
    breed:(v.breed&&v.breed.readyAt)?v.breed:null,
    cleared:Array.isArray(v.cleared)?v.cleared.filter(id=>validIds.has(id)):[],
    qc:Object.assign({tap:0,feed:0,breed:0,win:0,clear:0}, (v.qc&&typeof v.qc==='object')?v.qc:{}),
    qClaimed:Array.isArray(v.qClaimed)?v.qClaimed:[],
    ore:v.ore||0,
    forge:{gold:(v.forge&&v.forge.gold)||0, power:(v.forge&&v.forge.power)||0},
    mails:Array.isArray(v.mails)?v.mails:[],
    spinDay:v.spinDay||0, mailSeeded:!!v.mailSeeded};
}
async function drLoad(){
  // 1) ưu tiên cloud (đồng bộ đa thiết bị)
  if(auth&&auth.currentUser&&db){
    try{ const s=await db.ref('users/'+auth.currentUser.uid+'/daorong').get(); const v=s.val(); if(v) return drNorm(v); }
    catch(e){ console.error('daorong load(cloud)',e); }
  }
  // 2) fallback cục bộ — chắc ăn kể cả khi Rules chặn users/ hoặc offline
  try{ const raw=localStorage.getItem(drLsKey()); if(raw){ const v=JSON.parse(raw); if(v) return drNorm(v); } }catch(_){}
  return null;
}
function drSave(){ clearTimeout(drSaveT); drSaveT=setTimeout(drSaveNow,700); }
function drSaveNow(){
  if(!drState) return;
  const obj={gold:Math.round(drState.gold), gems:drState.gems, food:drState.food,
    level:drState.level, xp:Math.round(drState.xp),
    dragons:drState.dragons.map(d=>({sp:d.sp,lv:d.lv,fed:d.fed,star:drStar(d)})),
    breed:drState.breed||null, cleared:(drState.cleared||[]).slice(),
    qc:Object.assign({tap:0,feed:0,breed:0,win:0,clear:0}, drState.qc||{}), qClaimed:(drState.qClaimed||[]).slice(),
    ore:Math.round(drState.ore||0), forge:{gold:(drState.forge&&drState.forge.gold)||0, power:(drState.forge&&drState.forge.power)||0},
    mails:(drState.mails||[]).slice(), spinDay:drState.spinDay||0, mailSeeded:!!drState.mailSeeded,
    updatedAt:Date.now()};
  try{ localStorage.setItem(drLsKey(), JSON.stringify(obj)); }catch(_){}   // LUÔN lưu cục bộ trước
  if(auth&&auth.currentUser&&db){                                          // rồi mới đồng bộ cloud (best-effort)
    db.ref('users/'+auth.currentUser.uid+'/daorong').set(obj).catch(e=>console.error('daorong save(cloud)',e));
  }
}

/* ---------- Công thức ---------- */
function drFoodToNext(lv){ return Math.round(20*Math.pow(1.5,lv-1)); }
function drXpToNext(lvl){ return Math.round(100*Math.pow(1.3,lvl-1)); }
function drGoldPerTap(d){ return Math.round(DR_SPECIES[d.sp].gold * d.lv * (2+Math.random()*2) * drStarMult(d) * drForgeGoldMult()); }
function drSellPrice(d){ return Math.round(DR_SPECIES[d.sp].gold * 25 * d.lv * DR_RAR[DR_SPECIES[d.sp].rar].mult/ (DR_SPECIES[d.sp].rar==='common'?1:1)); }
function drPower(d){ const s=DR_SPECIES[d.sp]; return Math.round((s.atk*1.6 + s.hp*0.4)*(1+0.18*(d.lv-1)) * drStarMult(d) * drForgePowerMult()); }
/* ---------- Lò rèn: bùa toàn đảo (mỗi cấp +5%) ---------- */
const DR_FORGE_MAX=10;
function drForgeGoldMult(){ return 1 + 0.05*(((drState&&drState.forge)?drState.forge.gold:0)||0); }
function drForgePowerMult(){ return 1 + 0.05*(((drState&&drState.forge)?drState.forge.power:0)||0); }
function drForgeCost(level){ return {gems:3+level*2, ore:5+level*4}; }   // Lv0→1:3💎/5⛏️ … Lv9→10:21💎/41⛏️
/* ---------- Hệ sao rồng: nâng sao -> tăng sinh vàng & sức mạnh ---------- */
const DR_STAR_MAX=5;
function drStar(d){ return Math.min(DR_STAR_MAX, Math.max(1, (d&&d.star)||1)); }
function drStarMult(d){ return 1 + 0.25*(drStar(d)-1); }                    // 1★=1.0 → 5★=2.0
function drStarCost(star){ return {gold:400*star*(star+1), gems:2*star}; }  // 1→2:800🪙/2💎 … 4→5:8000🪙/8💎
function drStarPips(d){ const s=drStar(d); return '★'.repeat(s)+'☆'.repeat(DR_STAR_MAX-s); }
const DR_BLESS_COST=5;                                   // 💎 để "chúc phúc" khi lai
function drRarRank(sp){ return ['common','rare','epic','legendary'].indexOf((DR_SPECIES[sp]||DR_SPECIES.fire).rar); }
function drBreedResult(elA,elB,blessed){
  const key=[elA,elB].sort().join('+');
  const pool=DR_BREED[key]|| [elA===elB?elA:(Math.random()<.5?elA:elB)];
  if(blessed){                                           // chúc phúc: ưu tiên loài hiếm nhất trong pool
    const best=pool.slice().sort((x,y)=>drRarRank(y)-drRarRank(x))[0];
    if(Math.random()<0.65) return best;
  }
  return pool[Math.floor(Math.random()*pool.length)];
}
function drAddXp(n){
  drState.xp+=n; let up=false;
  while(drState.xp>=drXpToNext(drState.level)){ drState.xp-=drXpToNext(drState.level); drState.level++; drState.gems+=5; up=true; }
  if(up) toast('⭐ Lên cấp '+drState.level+'! +5 💎');
  drRenderHud();
}

/* ---------- Nhiệm vụ (dẫn dắt người chơi) ---------- */
const DR_QUESTS=[
  {id:'tap',    ic:'gold',  name:'Thu vàng',    desc:'Chạm thu vàng 20 lần',    type:'tap',    target:20, gold:400, gems:2},
  {id:'feed',   ic:'food',  name:'Nuôi nấng',   desc:'Cho rồng ăn 10 lần',      type:'feed',   target:10, food:40,  gems:2},
  {id:'level',  ic:'star',  name:'Rồng lớn',     desc:'Nuôi 1 rồng đạt Lv3',     type:'level',  target:3,  gold:600, gems:3},
  {id:'breed',  ic:'breed', name:'Nhà lai tạo', desc:'Lai/nở 1 rồng mới',       type:'breed',  target:1,  gems:5},
  {id:'clear',  ic:'rock',  name:'Khai hoang',  desc:'Dọn 1 chướng ngại',       type:'clear',  target:1,  gold:500, gems:3},
  {id:'win',    ic:'arena', name:'Chiến binh',  desc:'Thắng 3 trận đấu trường', type:'win',    target:3,  gold:800, gems:4},
  {id:'species',ic:'codex', name:'Nhà sưu tầm', desc:'Sưu tầm đủ 5 loài rồng',   type:'species',target:5,  gems:8},
];
function drQC(type){ if(!drState.qc) drState.qc={}; drState.qc[type]=(drState.qc[type]||0)+1; }
function drQuestVal(q){
  if(q.type==='level')   return drState.dragons.reduce((m,d)=>Math.max(m,d.lv),0);
  if(q.type==='species') return new Set(drState.dragons.map(d=>d.sp)).size;
  return (drState.qc&&drState.qc[q.type])||0;
}
function drQuestDone(q){ return drQuestVal(q)>=q.target; }
function drQuestClaimable(q){ return drQuestDone(q) && !(drState.qClaimed||[]).includes(q.id); }
function drQuestCount(){ return DR_QUESTS.filter(drQuestClaimable).length; }
function drUpdateQuestDot(){ const d=$('drQuestDot'); if(!d) return; const n=drQuestCount(); d.textContent=n; d.hidden=(n<=0);
}

/* ---------- Dựng khung cảnh ---------- */
function drBuild(){
  if(drBuilt) return;
  drReduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const app=document.createElement('div'); app.id='drApp'; app.className='dr-screen'; app.style.display='none';
  let deco=DR_DECO.map(d=>`<span class="dr-deco" style="left:${d[1]}%; top:${d[2]}%; font-size:${26*d[3]}px">${d[0]}</span>`).join('');
  let sparks=''; for(let i=0;i<10;i++) sparks+=`<span class="dr-sparkle" style="left:${Math.floor(Math.random()*100)}%; top:${58+Math.floor(Math.random()*38)}%; animation-delay:${(-Math.random()*3.5).toFixed(1)}s"></span>`;
  const dock=[
    ['shop','shop','Shop'],['quest','quest','Nhiệm vụ'],['wheel','🎡','Vòng quay'],['forge','🔨','Lò rèn'],['breed','breed','Lai rồng'],['feed','food','Cho ăn'],['arena','arena','Đấu'],['codex','codex','Sách rồng'],['mail','📬','Thư']
  ].map(d=>`<button class="dr-dock-btn" data-act="${d[0]}" type="button"><span class="di">${DR_ICONS[d[1]]?drIcon(d[1]):`<span class="dr-di-emoji">${d[1]}</span>`}</span><span class="dl">${d[2]}</span>${d[0]==='quest'?'<span class="dr-dock-badge" id="drQuestDot" hidden></span>':(d[0]==='mail'?'<span class="dr-dock-badge" id="drMailDot" hidden></span>':'')}</button>`).join('');
  app.innerHTML=`
    <div class="dr-sun" aria-hidden="true"></div>
    <div class="dr-cloud a" aria-hidden="true"></div><div class="dr-cloud b" aria-hidden="true"></div><div class="dr-cloud c" aria-hidden="true"></div>
    <div class="dr-shimmer" aria-hidden="true"></div>${sparks}
    <div class="dr-island" id="drIsland">
      <div class="dr-foam" aria-hidden="true"></div><div class="dr-beach" aria-hidden="true"></div><div class="dr-grass" aria-hidden="true"></div>
      ${deco}
      <div class="dr-egg" id="drEgg" aria-label="Trứng"><span class="dr-egg-art">${drIcon('egg')}</span>
        <div class="dr-egg-tag" id="drEggTag">🥚 Ổ ấp</div></div>
      <div class="dr-obstacles" id="drObstacles"></div>
      <div class="dr-dragons" id="drDragons"></div>
    </div>
    <div class="dr-hud">
      <div class="dr-top">
        <button class="dr-back" id="drBack" type="button" aria-label="Về sảnh">←</button>
        <div class="dr-who"><span class="dr-ava" aria-hidden="true">🐲</span>
          <span class="dr-col"><b id="drName">Người chơi</b>
            <span class="dr-xp"><i id="drXpFill"></i><em id="drLvl">Cấp 1</em></span></span></div>
        <div class="dr-pills">
          <span class="dr-pill">${drIcon('gold')}<b id="drGold">0</b></span>
          <span class="dr-pill">${drIcon('gem')}<b id="drGems">0</b></span>
          <span class="dr-pill">${drIcon('food')}<b id="drFood">0</b></span>
          <span class="dr-pill">${drIcon('rock')}<b id="drOre">0</b></span>
        </div>
      </div>
    </div>
    <div class="dr-dock" id="drDock">${dock}</div>
    <div class="dr-hint" id="drHint">Chạm rồng để xem/nuôi · chạm 🪙 để thu vàng</div>`;
  document.body.appendChild(app);
  drBuilt=true;
  try{ if(db) db.ref('.info/serverTimeOffset').on('value',s=>{ drServerOffset=s.val()||0; }); }catch(_){}

  $('drBack').onclick=leaveDragonIsland;
  $('drDock').addEventListener('click',e=>{ const b=e.target.closest('.dr-dock-btn'); if(!b) return; drOpen(b.dataset.act); });
  $('drDragons').addEventListener('click',e=>{
    if(e.target.closest('.dr-coin-bubble')) return;
    const roam=e.target.closest('.dr-roam'); if(!roam) return;
    const bob=roam.querySelector('.dr-bob');
    bob.classList.remove('hop'); void bob.offsetWidth; bob.classList.add('hop'); setTimeout(()=>bob.classList.remove('hop'),560);
    drShowDragon(+roam.dataset.idx);
  });
  $('drObstacles').addEventListener('click',e=>{ const o=e.target.closest('.dr-obstacle'); if(o) drClearObstacle(o.dataset.id); });
  $('drEgg').onclick=()=>drOpen('breed');
  if(!drReduce){ const sv=$('drEgg').querySelector('.dr-egg-art'); sv.style.transformOrigin='50% 90%';
    sv.animate([{transform:'rotate(0)'},{transform:'rotate(-7deg)'},{transform:'rotate(7deg)'},{transform:'rotate(-4deg)'},{transform:'rotate(0)'}],{duration:900,iterations:Infinity,easing:'ease-in-out'}); }
}

/* ---------- Mở/đóng đảo ---------- */
async function showDragonIsland(){
  drBuild(); hideOverlay();
  const cb=$('coinBar'); if(cb) cb.style.display='none';
  const loaded=await drLoad(); drState=loaded||drDefault();
  drActive=true;
  try{ localStorage.setItem('lastGame','daorong'); }catch(_){}
  $('drApp').style.display='block';
  $('drName').textContent=(profile&&profile.name)?profile.name:myName;
  drRenderHud(); drRenderDragons(); drRenderEgg(); drRenderObstacles();
  if(!loaded) drSaveNow();
  drStartCoins();
  clearInterval(drTick); drTick=setInterval(drRenderEgg,1000);   // đếm ngược ổ ấp
}
function leaveDragonIsland(silent){
  drActive=false;
  try{ localStorage.removeItem('lastGame'); }catch(_){}
  clearTimeout(drCoinTimer); drCoinTimer=null; clearInterval(drTick); drTick=null;
  clearTimeout(drSaveT); drSaveNow();
  drCloseModal();
  if($('drApp')) $('drApp').style.display='none';
  const cb=$('coinBar'); if(cb&&profile) cb.style.display='inline-flex';
  if(!silent) showGameSelect();
}

/* ---------- HUD ---------- */
function drRenderHud(){
  if(!drActive&&!$('drGold')) return;
  const set=(id,v)=>{ const el=$(id); if(el) el.textContent=v; };
  set('drGold',fmtCoin(Math.round(drState.gold))); set('drGems',fmtCoin(drState.gems)); set('drFood',fmtCoin(drState.food));
  set('drOre',fmtCoin(Math.round(drState.ore||0)));
  set('drLvl','Cấp '+drState.level);
  const f=$('drXpFill'); if(f) f.style.width=Math.min(100,Math.round(drState.xp/drXpToNext(drState.level)*100))+'%';
  drUpdateQuestDot(); drUpdateMailDot();
}
function drBump(id){ const el=$(id); if(!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

/* ---------- Rồng trên đảo ---------- */
function drRenderDragons(){
  const wrap=$('drDragons'); if(!wrap) return; wrap.innerHTML='';
  drState.dragons.slice(0,DR_MAX).forEach((d,i)=>{
    const slot=DR_SLOTS[i%DR_SLOTS.length];
    const roam=document.createElement('div'); roam.className='dr-roam'; roam.dataset.idx=i;
    roam.style.left=slot[0]+'%'; roam.style.top=slot[1]+'%'; roam.style.zIndex=10+Math.round(slot[1]);
    const bob=document.createElement('div'); bob.className='dr-bob'; bob.style.animationDelay=(-Math.random()*2.6).toFixed(2)+'s';
    bob.innerHTML=drDragonArt(d.sp)+`<span class="dr-lvtag">Lv${d.lv}</span>`;
    roam.appendChild(bob); wrap.appendChild(roam);
    if(i%2===1&&!drReduce){ const dist=44+Math.random()*26, dur=9000+Math.random()*4000;
      roam.animate([{transform:'translateX(0)'},{transform:`translateX(${dist}px)`,offset:.46},{transform:`translateX(${dist}px)`,offset:.5},{transform:'translateX(0)',offset:.96},{transform:'translateX(0)'}],{duration:dur,iterations:Infinity,easing:'ease-in-out'});
      const t=setInterval(()=>{ if(!roam.isConnected){clearInterval(t);return;} roam.classList.toggle('flip'); },Math.round(dur/2)); }
  });
}
function drRenderEgg(){
  const tag=$('drEggTag'); if(!tag||!drState) return;   // interval có thể chạy khi state chưa sẵn
  const b=drState.breed;
  if(b&&b.readyAt){
    const left=Math.max(0,Math.round((b.readyAt-drNow())/1000));
    tag.innerHTML = left>0 ? `⏳ ${drFmtTime(left)}` : `🥚 Nở rồng!`;
    tag.classList.toggle('ready',left<=0);
  }else{ tag.textContent='🥚 Ổ ấp'; tag.classList.remove('ready'); }
}
function drFmtTime(s){ const m=Math.floor(s/60), ss=s%60; return m>0?`${m}p${ss<10?'0':''}${ss}`:`${ss}s`; }

/* ---------- Chướng ngại + mở rộng đảo ---------- */
function drRenderObstacles(){
  const wrap=$('drObstacles'); if(!wrap) return;
  const done=new Set(drState.cleared||[]);
  wrap.innerHTML=DR_OBSTACLES.filter(o=>!done.has(o.id)).map(o=>
    `<button class="dr-obstacle" data-id="${o.id}" style="left:${o.x}%; top:${o.y}%" type="button" aria-label="Dọn ${esc(o.name)}">
       <span class="dr-obs-ic">${drIcon('rock')}</span>
       <span class="dr-obs-cost">${drIcon('gold')}${fmtCoin(o.cost)}</span></button>`).join('');
}
function drClearObstacle(id){
  const o=DR_OBSTACLES.find(x=>x.id===id); if(!o) return;
  if((drState.cleared||[]).includes(id)) return;
  const body=`<div class="dr-clear">
      <div class="dr-clear-ic">${drIcon('rock')}</div>
      <p class="dr-note">Dọn <b>${esc(o.name)}</b> để mở rộng đảo?</p>
      <div class="dr-clear-reward">Mở <b>+1 ô nuôi rồng</b> · thưởng <b>+${o.gems}💎 +${o.food}🍖 +${o.xp} XP</b></div>
      <button class="dr-btn go" id="drDoClear">Dọn · ${fmtCoin(o.cost)} 🪙</button></div>`;
  drModal('Dọn chướng ngại', body);
  $('drDoClear').onclick=()=>{
    if((drState.cleared||[]).includes(o.id)){ drCloseModal(); return; }
    if(drState.gold<o.cost){ toast('Thiếu vàng — thu thêm đã 🪙'); return; }
    drState.gold-=o.cost;
    drState.cleared=(drState.cleared||[]).concat(o.id);
    drState.gems+=o.gems; drState.food+=o.food; drQC('clear');
    drRenderHud(); drRenderObstacles(); drAddXp(o.xp); drSave(); drCloseModal();
    if(typeof confetti==='function') confetti();
    toast(`✨ Đã dọn ${o.name}! +1 ô rồng · +${o.gems}💎 +${o.food}🍖`);
  };
}

/* ---------- Vàng ---------- */
function drStartCoins(){
  clearTimeout(drCoinTimer);
  const tick=()=>{ if(!drActive) return; drSpawnCoin(); drCoinTimer=setTimeout(tick,2000+Math.random()*1400); };
  drCoinTimer=setTimeout(tick,drReduce?200:900);
}
function drSpawnCoin(){
  const roams=[...document.querySelectorAll('#drDragons .dr-roam')].filter(r=>!r.querySelector('.dr-coin-bubble'));
  if(!roams.length) return;
  const roam=roams[Math.floor(Math.random()*roams.length)];
  const idx=+roam.dataset.idx, d=drState.dragons[idx]; if(!d) return;
  const b=document.createElement('div'); b.className='dr-coin-bubble'; b.innerHTML='<div class="dr-coin">'+drIcon('gold')+'</div>';
  b.onclick=ev=>{ ev.stopPropagation(); const amt=drGoldPerTap(d); const r=b.getBoundingClientRect(); b.remove(); drGain(r.left+r.width/2,r.top,amt); drAddXp(1); };
  (roam.querySelector('.dr-bob')||roam).appendChild(b);
  setTimeout(()=>{ if(b.isConnected) b.remove(); },6000);
}
function drGain(x,y,amt){
  drState.gold+=amt; drQC('tap'); drRenderHud(); drBump('drGold'); drSave(); drGainText(x,y,'+'+fmtCoin(amt));
  const g=$('drGold').getBoundingClientRect(), tx=g.left+g.width/2, ty=g.top+g.height/2;
  const c=document.createElement('div'); c.className='dr-fly-coin'; c.style.left=(x-13)+'px'; c.style.top=(y-13)+'px'; document.body.appendChild(c);
  const a=c.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${(tx-x)*.5}px,${(ty-y)*.5-40}px) scale(1.1)`,opacity:1,offset:.6},{transform:`translate(${tx-x}px,${ty-y}px) scale(.4)`,opacity:.25}],{duration:640,easing:'cubic-bezier(.5,0,.7,1)'});
  const rm=()=>c.remove(); a.onfinish=rm; a.oncancel=rm;
}

/* =========================================================================
   MODAL khung chung
   ========================================================================= */
function drModal(title, bodyHTML, wide){
  drCloseModal();
  const m=document.createElement('div'); m.className='dr-modal'; m.id='drModal';
  m.innerHTML=`<div class="dr-sheet ${wide?'wide':''}"><div class="dr-sheet-head"><b>${title}</b><button class="dr-sheet-x" id="drModalX" aria-label="Đóng">✕</button></div><div class="dr-sheet-body">${bodyHTML}</div></div>`;
  $('drApp').appendChild(m);
  m.addEventListener('click',e=>{ if(e.target===m) drCloseModal(); });
  $('drModalX').onclick=drCloseModal;
  return m.querySelector('.dr-sheet-body');
}
function drCloseModal(){ const m=$('drModal'); if(m) m.remove(); }
function drOpen(act){
  if(act==='shop') drShowShop();
  else if(act==='breed') drShowBreed();
  else if(act==='feed') drShowFeed();
  else if(act==='arena') drShowArena();
  else if(act==='codex') drShowCodex();
  else if(act==='quest') drShowQuests();
  else if(act==='wheel') drShowWheel();
  else if(act==='forge') drShowForge();
  else if(act==='mail') drShowMail();
}
function drDragonCard(d,i,extra){
  const s=DR_SPECIES[d.sp];
  return `<button class="dr-dcard" data-idx="${i}" ${extra||''}><span class="dr-dcard-mini">${drDragonSVG(s.el)}</span>`
    +`<b>${esc(s.name)}</b><span class="dr-lv">Lv${d.lv}</span>${drRarChip(s.rar)}<span class="dr-cardstar">${'★'.repeat(drStar(d))}</span></button>`;
}

/* ---------- Chi tiết rồng: cho ăn / bán / lai ---------- */
function drShowDragon(i){
  const d=drState.dragons[i]; if(!d) return; const s=DR_SPECIES[d.sp];
  const need=drFoodToNext(d.lv), pct=Math.min(100,Math.round(d.fed/need*100));
  const body=`
    <div class="dr-detail">
      <div class="dr-detail-art">${drDragonSVG(s.el)}</div>
      <div class="dr-detail-info">
        <div class="dr-detail-name">${esc(s.name)} ${drRarChip(s.rar)}</div>
        <div class="dr-chips">${s.els.map(drElChip).join('')}</div>
        <div class="dr-kv"><span>Cấp</span><b>Lv ${d.lv}</b></div>
        <div class="dr-kv"><span>Sao</span><b class="dr-stars">${drStarPips(d)}</b></div>
        <div class="dr-kv"><span>Sinh vàng</span><b>~${Math.round(s.gold*d.lv*3*drStarMult(d))} 🪙/lượt</b></div>
        <div class="dr-kv"><span>Sức mạnh</span><b>${drPower(d)} ⚔️</b></div>
        <div class="dr-feedbar"><i style="width:${pct}%"></i><em>${d.fed}/${need} 🍖 tới Lv${d.lv+1}</em></div>
      </div>
    </div>
    ${drStar(d)<DR_STAR_MAX
      ? `<button class="dr-btn alt block" id="drStarUp">⭐ Nâng sao ${drStar(d)}→${drStar(d)+1} · ${fmtCoin(drStarCost(drStar(d)).gold)}🪙 ${drStarCost(drStar(d)).gems}💎</button>`
      : `<div class="dr-star-max">⭐ Đã đạt sao tối đa (${DR_STAR_MAX}★)</div>`}
    <div class="dr-detail-btns">
      <button class="dr-btn" id="drFeed1" ${d.lv>=15?'disabled':''}>🍖 Cho ăn (10)</button>
      <button class="dr-btn alt" id="drToBreed">💞 Đưa đi lai</button>
      <button class="dr-btn warn" id="drSell">Bán · +${fmtCoin(drSellPrice(d))} 🪙</button>
    </div>`;
  drModal(esc(s.name), body);
  const feed=$('drFeed1'); if(feed) feed.onclick=()=>drFeed(i,10);
  const su=$('drStarUp'); if(su) su.onclick=()=>drUpgradeStar(i);
  $('drToBreed').onclick=()=>{ drCloseModal(); drShowBreed(i); };
  $('drSell').onclick=()=>drSell(i);
}
function drUpgradeStar(i){
  const d=drState.dragons[i]; if(!d) return;
  const star=drStar(d);
  if(star>=DR_STAR_MAX){ toast('Rồng đã đạt sao tối đa ⭐'); return; }
  const cost=drStarCost(star);
  if(drState.gold<cost.gold){ toast('Thiếu vàng — thu thêm đã 🪙'); return; }
  if(drState.gems<cost.gems){ toast('Thiếu 💎'); return; }
  drState.gold-=cost.gold; drState.gems-=cost.gems; d.star=star+1;
  drAddXp(20); drRenderHud(); drRenderDragons(); drSave();
  if(typeof confetti==='function') confetti();
  toast(`⭐ ${DR_SPECIES[d.sp].name} lên ${d.star} sao! Sinh vàng & sức mạnh tăng`);
  drShowDragon(i);
}
function drFeed(i,amount){
  const d=drState.dragons[i]; if(!d) return;
  if(drState.food<amount){ toast('Thiếu thức ăn — mua ở Cho ăn 🍖'); return; }
  if(d.lv>=15){ toast('Rồng đã đạt cấp tối đa'); return; }
  drState.food-=amount; d.fed+=amount; drQC('feed'); drAddXp(2);
  const need=drFoodToNext(d.lv);
  if(d.fed>=need){ d.fed-=need; d.lv++; drAddXp(15); toast('🐉 '+DR_SPECIES[d.sp].name+' lên Lv'+d.lv+'!'); }
  drRenderHud(); drRenderDragons(); drSave(); drShowDragon(i);   // refresh
}
function drSell(i){
  const d=drState.dragons[i]; if(!d) return;
  if(drState.dragons.length<=1){ toast('Phải giữ ít nhất 1 rồng'); return; }
  const price=drSellPrice(d);
  drState.gold+=price; drState.dragons.splice(i,1);
  drRenderHud(); drRenderDragons(); drSave(); drCloseModal(); toast('Đã bán · +'+fmtCoin(price)+' 🪙');
}

/* ---------- Lai rồng ---------- */
let drBreedPick=[];
function drShowBreed(preIdx){
  // đang lai dở?
  if(drState.breed&&drState.breed.readyAt){
    const left=Math.max(0,Math.round((drState.breed.readyAt-drNow())/1000));
    const rs=DR_SPECIES[drState.breed.resultEl]?drState.breed.resultEl:'fire';
    const body=`<div class="dr-breed-run">
      <div class="dr-egg-big">${drDragonSVG(rs)}</div>
      ${left>0?`<div class="dr-timer">⏳ Còn ${drFmtTime(left)}</div>
        <button class="dr-btn" id="drSkip">Tua nhanh · ${Math.max(1,Math.ceil(left/60))} 💎</button>`
      :`<div class="dr-timer ready">🥚 Trứng đã sẵn sàng!</div>
        <button class="dr-btn go" id="drHatch">Nở rồng 🎉</button>`}
      <p class="dr-note">Đưa 2 rồng vào để ra trứng theo cặp nguyên tố.</p></div>`;
    drModal('Lai Rồng', body);
    if($('drSkip')) $('drSkip').onclick=()=>{ const need=Math.max(1,Math.ceil(left/60)); if(drState.gems<need){toast('Thiếu 💎');return;} drState.gems-=need; drState.breed.readyAt=drNow(); drRenderHud(); drSave(); drShowBreed(); };
    if($('drHatch')) $('drHatch').onclick=drHatch;
    return;
  }
  drBreedPick=[]; if(Number.isInteger(preIdx)) drBreedPick=[preIdx];
  drRenderBreedPicker();
}
function drRenderBreedPicker(){
  const a=drBreedPick[0], b=drBreedPick[1];
  const slot=(idx,label)=>{
    if(Number.isInteger(idx)){ const d=drState.dragons[idx], s=DR_SPECIES[d.sp];
      return `<button class="dr-slot filled" data-slot="${label}"><span class="dr-slot-mini">${drDragonSVG(s.el)}</span><small>${esc(s.name)} Lv${d.lv}</small></button>`; }
    return `<button class="dr-slot" data-slot="${label}"><span class="dr-slot-plus">+</span><small>Chọn rồng</small></button>`;
  };
  let preview='';
  if(Number.isInteger(a)&&Number.isInteger(b)){
    const secs=drBreedSecs(a,b);
    preview=`<div class="dr-breed-preview"><span>Kết quả:</span> <b>❓ Bí ẩn</b> · ⏳ ${drFmtTime(secs)}</div>
      <label class="dr-bless"><input type="checkbox" id="drBlessChk"><span>🌟 Chúc phúc <b>${DR_BLESS_COST}💎</b> · tăng mạnh cơ hội ra rồng hiếm</span></label>
      <button class="dr-btn go" id="drDoBreed">💞 Bắt đầu lai</button>`;
  }else preview=`<p class="dr-note">Chọn đủ 2 rồng để lai.</p>`;
  const list=drState.dragons.map((d,i)=>drDragonCard(d,i,`data-pick="1"`)).join('');
  const body=`<div class="dr-breed-slots">${slot(a,'a')}<span class="dr-heart">💗</span>${slot(b,'b')}</div>
    ${preview}<div class="dr-sub2">Đàn rồng của bạn</div><div class="dr-dlist">${list}</div>`;
  drModal('Lai Rồng', body);
  $('drModal').querySelectorAll('.dr-slot').forEach(s=>s.onclick=()=>{ const k=s.dataset.slot; if(k==='a')drBreedPick[0]=undefined; else drBreedPick[1]=undefined; drBreedPick=drBreedPick.filter(x=>x!==undefined); drRenderBreedPicker(); });
  $('drModal').querySelectorAll('.dr-dcard[data-pick]').forEach(c=>c.onclick=()=>{ const i=+c.dataset.idx;
    if(drBreedPick.includes(i)) return;
    if(drBreedPick.length<2) drBreedPick.push(i); else drBreedPick[1]=i;
    drRenderBreedPicker(); });
  if($('drDoBreed')) $('drDoBreed').onclick=()=>drStartBreed(a,b, !!($('drBlessChk')&&$('drBlessChk').checked));
}
function drBreedSecs(a,b){
  const ra=DR_SPECIES[drState.dragons[a].sp].rar, rb=DR_SPECIES[drState.dragons[b].sp].rar;
  const w={common:20,rare:45,epic:80,legendary:120};
  return Math.round((w[ra]+w[rb])/2)+10;
}
function drStartBreed(a,b,blessed){
  const da=drState.dragons[a], db2=drState.dragons[b]; if(!da||!db2) return;
  if(blessed){
    if(drState.gems<DR_BLESS_COST){ toast('Thiếu 💎 để chúc phúc'); return; }
    drState.gems-=DR_BLESS_COST;
  }
  const resultEl=drBreedResult(DR_SPECIES[da.sp].el, DR_SPECIES[db2.sp].el, blessed);
  const secs=drBreedSecs(a,b);
  drState.breed={resultEl, readyAt:drNow()+secs*1000, blessed:!!blessed};
  drAddXp(10); drRenderHud(); drRenderEgg(); drSave();
  toast(blessed?'🌟 Lai có chúc phúc — trứng quý sắp nở!':'💞 Đang lai… trứng sắp nở!'); drShowBreed();
}
function drHatch(){
  if(!drState.breed) return;
  if(drState.dragons.length>=drCapacity()){ toast(drCapacity()>=DR_MAX?'Đảo đã đủ '+DR_MAX+' rồng — bán bớt đã':'Hết ô nuôi — dọn 🪨 chướng ngại để mở thêm ô'); return; }
  const sp=DR_SPECIES[drState.breed.resultEl]?drState.breed.resultEl:'fire';
  drState.dragons.push({sp,lv:1,fed:0}); drState.breed=null; drQC('breed');
  drAddXp(30); drRenderHud(); drRenderDragons(); drRenderEgg(); drSave();
  drCloseModal(); toast('🎉 Nở ra '+DR_SPECIES[sp].name+'!');
}

/* ---------- Bảng nhiệm vụ ---------- */
function drShowQuests(){
  const rows=DR_QUESTS.map(q=>{
    const val=Math.min(drQuestVal(q),q.target), done=drQuestDone(q);
    const claimed=(drState.qClaimed||[]).includes(q.id), pct=Math.round(val/q.target*100);
    const reward=[q.gold?`+${fmtCoin(q.gold)}🪙`:'', q.gems?`+${q.gems}💎`:'', q.food?`+${q.food}🍖`:''].filter(Boolean).join(' ');
    const right = claimed ? `<span class="dr-q-done">✓ Đã nhận</span>`
      : done ? `<button class="dr-btn sm go" data-claim="${q.id}">Nhận</button>`
      : `<span class="dr-q-prog">${val}/${q.target}</span>`;
    return `<div class="dr-quest ${claimed?'claimed':(done?'ready':'')}">
        <span class="dr-q-ic">${drIcon(q.ic)}</span>
        <div class="dr-q-mid"><b>${esc(q.name)}</b><small>${esc(q.desc)} · <em>${reward}</em></small>
          <div class="dr-q-bar"><i style="width:${pct}%"></i></div></div>
        ${right}</div>`;
  }).join('');
  drModal('Nhiệm vụ', `<div class="dr-note dr-note-with-icon">${drIcon('gift')}<span>Hoàn thành để nhận thưởng</span></div><div class="dr-qlist">${rows}</div>`, true);
  $('drModal').querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>drClaimQuest(b.dataset.claim));
}
function drClaimQuest(id){
  const q=DR_QUESTS.find(x=>x.id===id); if(!q||!drQuestClaimable(q)) return;
  drState.qClaimed=(drState.qClaimed||[]).concat(id);
  if(q.gold) drState.gold+=q.gold; if(q.gems) drState.gems+=q.gems; if(q.food) drState.food+=q.food;
  drRenderHud(); drSave();
  if(typeof confetti==='function') confetti();
  toast(`🎁 Nhận thưởng nhiệm vụ: ${q.name}!`);
  drShowQuests();
}

/* ---------- Shop ---------- */
function drShowShop(){
  const body=`<div class="dr-shop-grid">
    <div class="dr-shop-item"><div class="dr-shop-ic">${drIcon('egg')}</div><b>Trứng ngẫu nhiên</b><small>Nở 1 rồng nguyên tố</small><button class="dr-btn" id="drBuyEgg">250 🪙</button></div>
    <div class="dr-shop-item"><div class="dr-shop-ic">${drIcon('food')}</div><b>Thức ăn ×20</b><small>Cho rồng lên cấp</small><button class="dr-btn" id="drBuyFood">100 🪙</button></div>
    <div class="dr-shop-item"><div class="dr-shop-ic">${drIcon('gem')}</div><b>Đổi 30 🍖</b><small>Mua bằng kim cương</small><button class="dr-btn alt" id="drBuyFood2">3 💎</button></div>
  </div><p class="dr-note">Rồng hiếm hơn có được qua <b>Lai rồng</b> 💞.</p>`;
  drModal('Shop', body);
  $('drBuyEgg').onclick=()=>{ if(drState.dragons.length>=drCapacity()){toast(drCapacity()>=DR_MAX?'Đảo đã đủ rồng':'Hết ô nuôi — dọn 🪨 chướng ngại để mở thêm');return;} if(drState.gold<250){toast('Thiếu vàng');return;}
    drState.gold-=250; const sp=['fire','water','plant','earth'][Math.floor(Math.random()*4)]; drState.dragons.push({sp,lv:1,fed:0});
    drAddXp(10); drRenderHud(); drRenderDragons(); drSave(); toast('🥚 Nở ra '+DR_SPECIES[sp].name+'!'); };
  $('drBuyFood').onclick=()=>{ if(drState.gold<100){toast('Thiếu vàng');return;} drState.gold-=100; drState.food+=20; drRenderHud(); drBump('drFood'); drSave(); toast('+20 🍖'); };
  $('drBuyFood2').onclick=()=>{ if(drState.gems<3){toast('Thiếu 💎');return;} drState.gems-=3; drState.food+=30; drRenderHud(); drBump('drFood'); drSave(); toast('+30 🍖'); };
}

/* ---------- Cho ăn (chọn rồng để nuôi) ---------- */
function drShowFeed(){
  const list=drState.dragons.map((d,i)=>{ const s=DR_SPECIES[d.sp], need=drFoodToNext(d.lv), pct=Math.min(100,Math.round(d.fed/need*100));
    return `<div class="dr-feed-row"><span class="dr-dcard-mini sm">${drDragonSVG(s.el)}</span>
      <div class="dr-feed-mid"><b>${esc(s.name)} · Lv${d.lv}</b><div class="dr-feedbar sm"><i style="width:${pct}%"></i></div></div>
      <button class="dr-btn sm" data-feed="${i}" ${d.lv>=15?'disabled':''}>🍖 +10</button></div>`; }).join('');
  const body=`<div class="dr-feed-top">Bạn có <b>${fmtCoin(drState.food)} 🍖</b> · <button class="dr-linkbtn" id="drGetFood">＋ Mua thức ăn</button></div>
    <div class="dr-dlist">${list}</div>`;
  drModal('Cho ăn', body);
  $('drGetFood').onclick=drShowShop;
  $('drModal').querySelectorAll('[data-feed]').forEach(b=>b.onclick=()=>drFeedInline(+b.dataset.feed));
}
function drFeedInline(i){
  const d=drState.dragons[i]; if(!d) return;
  if(drState.food<10){ toast('Thiếu thức ăn'); return; }
  if(d.lv>=15){ toast('Đã tối đa cấp'); return; }
  drState.food-=10; d.fed+=10; drQC('feed'); drAddXp(2);
  const need=drFoodToNext(d.lv);
  if(d.fed>=need){ d.fed-=need; d.lv++; drAddXp(15); toast('🐉 '+DR_SPECIES[d.sp].name+' lên Lv'+d.lv+'!'); }
  drRenderHud(); drRenderDragons(); drSave(); drShowFeed();
}

/* ---------- Đấu trường ---------- */
function drShowArena(){
  const list=drState.dragons.map((d,i)=>`<button class="dr-dcard" data-fight="${i}">${drDragonCardInner(d)}<span class="dr-pow">${drPower(d)} ⚔️</span></button>`).join('');
  const body=`<p class="dr-note">Chọn 1 rồng ra trận. Thắng ăn 🪙 + 💎 + XP. Khắc chế nguyên tố tăng sức mạnh ×1.5.</p>
    <div class="dr-dlist">${list}</div>`;
  drModal('Đấu Trường', body);
  $('drModal').querySelectorAll('[data-fight]').forEach(b=>b.onclick=()=>drFight(+b.dataset.fight));
}
function drDragonCardInner(d){ const s=DR_SPECIES[d.sp];
  return `<span class="dr-dcard-mini">${drDragonSVG(s.el)}</span><b>${esc(s.name)}</b><span class="dr-lv">Lv${d.lv}</span>`; }
function drFight(i){
  const me=drState.dragons[i]; if(!me) return;
  const enemySp=DR_SP_ORDER[Math.floor(Math.random()*DR_SP_ORDER.length)];
  const enemy={sp:enemySp, lv:Math.max(1, me.lv+(Math.floor(Math.random()*3)-1))};
  const meEl=DR_SPECIES[me.sp].el, enEl=DR_SPECIES[enemy.sp].el;
  let meAdv=1, enAdv=1;
  if(DR_ADV[meEl]===enEl) meAdv=1.5; if(DR_ADV[enEl]===meEl) enAdv=1.5;
  const mePow=drPower(me)*meAdv*(0.85+Math.random()*0.3);
  const enPow=drPower(enemy)*enAdv*(0.85+Math.random()*0.3);
  const win=mePow>=enPow;
  const reward= win ? {gold:80+enemy.lv*30, gems:(Math.random()<0.35?1:0), xp:40} : {gold:15, gems:0, xp:10};
  if(win){ drState.gold+=reward.gold; drState.gems+=reward.gems; drQC('win'); }
  else drState.gold+=reward.gold;
  drAddXp(reward.xp); drRenderHud(); drSave();
  const es=DR_SPECIES[enemy.sp];
  const body=`<div class="dr-fight">
      <div class="dr-fight-side ${win?'win':''}"><div class="dr-fight-art">${drDragonSVG(DR_SPECIES[me.sp].el)}</div><b>${esc(DR_SPECIES[me.sp].name)}</b><small>Lv${me.lv}${meAdv>1?' · Khắc chế!':''}</small></div>
      <div class="dr-vs">${win?'THẮNG':'THUA'}</div>
      <div class="dr-fight-side ${!win?'win':''}"><div class="dr-fight-art">${drDragonSVG(es.el)}</div><b>${esc(es.name)}</b><small>Lv${enemy.lv}</small></div>
    </div>
    <div class="dr-fight-reward">${win?'🏆 Thắng!':'💪 Thua rồi'} +${fmtCoin(reward.gold)} 🪙${reward.gems?` · +${reward.gems} 💎`:''} · +${reward.xp} XP</div>
    <button class="dr-btn go" id="drFightAgain">Đấu tiếp</button>`;
  drModal('Kết quả trận', body);
  if(win) confetti();
  $('drFightAgain').onclick=drShowArena;
}

/* ---------- Sách rồng (đồ giám) ---------- */
function drShowCodex(){
  const owned=new Set(drState.dragons.map(d=>d.sp));
  const cells=DR_SP_ORDER.map(sp=>{ const s=DR_SPECIES[sp], has=owned.has(sp);
    return `<button class="dr-codex-cell ${has?'':'locked'}" data-sp="${sp}">
      <span class="dr-codex-mini">${has?drDragonSVG(s.el):'<span class="dr-lock">?</span>'}</span>
      <small>${has?esc(s.name):'? ? ?'}</small></button>`; }).join('');
  const body=`<p class="dr-note">Đã sưu tầm <b>${owned.size}/${DR_SP_ORDER.length}</b> loài rồng. Lai để mở khoá loài mới!</p>
    <div class="dr-codex-grid">${cells}</div>`;
  drModal('Sách Rồng', body, true);
  $('drModal').querySelectorAll('[data-sp]').forEach(c=>c.onclick=()=>drCodexDetail(c.dataset.sp, owned.has(c.dataset.sp)));
}
function drCodexDetail(sp,has){
  const s=DR_SPECIES[sp];
  const bar=(label,val,max)=>`<div class="dr-statrow"><span>${label}</span><div class="dr-statbar"><i style="width:${Math.min(100,Math.round(val/max*100))}%"></i></div></div>`;
  const body=`<div class="dr-codex-detail">
    <div class="dr-codex-art ${has?'':'silh'}">${drDragonSVG(s.el)}</div>
    <div class="dr-codex-meta"><div class="dr-detail-name">${has?esc(s.name):'? ? ?'} ${drRarChip(s.rar)}</div>
      <div class="dr-chips">${s.els.map(drElChip).join('')}</div>
      ${has?`<div class="dr-kv"><span>Sinh vàng</span><b>${s.gold} 🪙/phút (Lv1)</b></div>`:'<p class="dr-note">Chưa sở hữu — lai hoặc mua để mở khoá.</p>'}
    </div></div>
    <div class="dr-stats">
      ${bar('Máu',s.hp,200)}${bar('Sát thương',s.atk,120)}${bar('Tầm đánh',s.range,6)}${bar('Tốc độ',s.spd,10)}
    </div>
    ${has&&s.els.length>1?`<p class="dr-note">Lai từ: ${s.els.map(drElChip).join(' + ')}</p>`:''}`;
  drModal('Đồ giám: '+(has?esc(s.name):'Bí ẩn'), body);
}

/* ---------- Hiệu ứng ---------- */
function drGainText(x,y,txt){ const g=document.createElement('div'); g.className='dr-fx gain'; g.textContent=txt; g.style.left=x+'px'; g.style.top=y+'px'; document.body.appendChild(g); setTimeout(()=>g.remove(),1000); }
