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
  fire:    {name:'Rồng Lửa',       el:'fire',    els:['fire'],           rar:'common', gold:10, atk:42, hp:100, range:3, spd:6, sheet:{url:'assets/dragons/fire.png', frames:8, fps:7, act:1.25}},
  water:   {name:'Rồng Nước',      el:'water',   els:['water'],          rar:'common', gold:10, atk:38, hp:112, range:4, spd:5, sheet:{url:'assets/dragons/water.png', frames:8, fps:9}},
  plant:   {name:'Rồng Cây',       el:'plant',   els:['plant'],          rar:'common', gold:10, atk:36, hp:118, range:3, spd:5, sheet:{url:'assets/dragons/plant.png', frames:8, fps:6, act:1.45}},
  earth:   {name:'Rồng Đất',       el:'earth',   els:['earth'],          rar:'common', gold:11, atk:46, hp:126, range:2, spd:4, sheet:{url:'assets/dragons/earth.png', frames:8, fps:5, act:1.55}},
  electric:{name:'Rồng Điện',      el:'electric',els:['electric'],       rar:'rare',   gold:16, atk:54, hp:100, range:5, spd:8, sheet:{url:'assets/dragons/electric.png', frames:8, fps:9, act:1.05}},
  ice:     {name:'Rồng Băng',      el:'ice',     els:['ice'],            rar:'rare',   gold:16, atk:50, hp:110, range:4, spd:6, sheet:{url:'assets/dragons/ice.png', frames:8, fps:6, act:1.5}},
  lava:    {name:'Rồng Dung Nham', el:'fire',    els:['fire','earth'],   rar:'rare',   gold:22, atk:62, hp:132, range:3, spd:5, sheet:{url:'assets/dragons/lava.png', frames:8, fps:6, act:1.35}},
  steam:   {name:'Rồng Hơi Nước',  el:'water',   els:['fire','water'],   rar:'rare',   gold:22, atk:56, hp:120, range:4, spd:6, sheet:{url:'assets/dragons/steam.png', frames:8, fps:7, act:1.35}},
  swamp:   {name:'Rồng Đầm Lầy',   el:'plant',   els:['water','plant'],  rar:'rare',   gold:22, atk:52, hp:138, range:3, spd:5, sheet:{url:'assets/dragons/swamp.png', frames:8, fps:5, act:1.7}},
  storm:   {name:'Rồng Bão',       el:'electric',els:['electric','water'],rar:'epic',  gold:34, atk:74, hp:130, range:5, spd:9, sheet:{url:'assets/dragons/storm.png', frames:8, fps:8, act:1.15}},
  dark:    {name:'Hắc Long',       el:'dark',    els:['dark'],           rar:'epic',   gold:40, atk:86, hp:150, range:4, spd:7, sheet:{url:'assets/dragons/dark.png', frames:8, fps:7, act:1.45}},
  light:   {name:'Thần Long',      el:'light',   els:['light'],          rar:'legendary',gold:70,atk:110,hp:180, range:5, spd:8, sheet:{url:'assets/dragons/light.png', frames:8, fps:7, act:1.6}},
};
const DR_SP_ORDER=['fire','water','plant','earth','electric','ice','lava','steam','swamp','storm','dark','light'];
// Bốn giai đoạn vẫn dùng cùng một nhân vật/sprite; chỉ tăng vóc dáng và hiệu ứng.
const DR_EVOLUTIONS=[
  {id:'baby',   name:'Baby',   minLv:1,  maxLv:4,  scale:1.00},
  {id:'teen',   name:'Teen',   minLv:5,  maxLv:8,  scale:1.08},
  {id:'adult',  name:'Adult',  minLv:9,  maxLv:12, scale:1.16},
  {id:'legend', name:'Legend', minLv:13, maxLv:15, scale:1.24},
];
function drEvolution(lv){
  const n=Math.max(1,Math.min(15,Number(lv)||1));
  let evo=DR_EVOLUTIONS[0];
  for(const stage of DR_EVOLUTIONS) if(n>=stage.minLv) evo=stage;
  return evo;
}
function drEvolutionNext(lv){
  const evo=drEvolution(lv);
  return DR_EVOLUTIONS[DR_EVOLUTIONS.indexOf(evo)+1]||null;
}
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
  'earth+electric':['electric','earth','storm'],   // key phải theo abc (earth<electric) — trước ghi 'electric+earth' nên KHÔNG bao giờ khớp
  'ice+plant':['ice','plant','swamp'],
  'dark+fire':['dark','lava','fire'],
  'dark+dark':['dark','dark','light'],
  'electric+electric':['electric','electric','storm'],
  'ice+ice':['ice','ice','storm'],
  // --- công thức mới: lấp "vùng chết", cho lai tới MỌI hệ chỉ từ 3 rồng khởi đầu ---
  'fire+plant':['earth','plant','fire'],          // mở khoá ĐẤT
  'earth+plant':['electric','earth','plant'],     // mở khoá ĐIỆN
  'earth+water':['ice','swamp','water'],          // thêm đường Băng/Đầm lầy
  'fire+ice':['steam','lava','fire'],             // thêm
  'electric+ice':['dark','electric','ice'],       // mở khoá BÓNG TỐI
  'electric+plant':['storm','electric','plant'],  // thêm đường Bão
  'earth+ice':['ice','earth','swamp'],            // thêm
  'dark+water':['dark','steam','water'],          // nhân giống Bóng tối dễ hơn
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
function drSpriteHtml(sh){
  const fps=sh.fps||8, hasAct=sh.act?' has-actions':'';
  return `<div class="dr-sprite${hasAct}" style="--url:url('${sh.url}'); --frames:${sh.frames}; --dur:${(sh.frames/fps).toFixed(2)}s; --walk-dur:${(4/fps).toFixed(2)}s; --act-dur:${sh.act||1.25}s"></div>`;
}
function drImgHtml(url){ return `<img class="dr-img" src="${url}" alt="" draggable="false">`; }
// TIẾN HOÁ theo CẤP: khai báo species.stages=[{minLv:1,sheet:{...}}, {minLv:6,sheet:{...}}, {minLv:12,art:'...'}]
// -> rồng tự ĐỔI HÌNH khi lên cấp (baby→trưởng thành). Không khai báo stages thì dùng sheet/art gốc cho mọi cấp.
function drStageArt(s, lv){
  if(s.stages && s.stages.length){
    let pick=null;
    for(const st of s.stages){ const m=st.minLv||1; if(m<=lv && (!pick||m>=(pick.minLv||1))) pick=st; }
    if(pick){ if(pick.sheet) return drSpriteHtml(pick.sheet); if(pick.art) return drImgHtml(pick.art); }
  }
  if(s.sheet) return drSpriteHtml(s.sheet);
  if(s.art)   return drImgHtml(s.art);
  return drDragonSVG(s.el);
}
// Chọn hình rồng: theo giai đoạn tiến hoá (cấp) + loại asset (sprite-sheet > ảnh tĩnh > SVG).
// Nhận cả dragon instance {sp,lv} (để chọn stage đúng cấp) hoặc chuỗi species id (preview).
function drDragonArt(d){
  const inst=(typeof d==='string')?{sp:d,lv:1}:(d||{});
  const s=DR_SPECIES[inst.sp]||DR_SPECIES.fire;
  const lv=inst.lv||1, evo=drEvolution(lv);
  const acc=(DR_PAL[s.el]||DR_PAL.fire).body;
  return `<span class="dr-evo dr-evo-${evo.id}" data-evo="${evo.id}" style="--acc:${acc}">`
    +`<i class="dr-evo-halo"></i><i class="dr-evo-crest"></i>`
    +drStageArt(s,lv)+`</span>`;
}
function drScheduleDragonAction(bob,sp){
  const sheet=(DR_SPECIES[sp]||{}).sheet;
  if(drReduce||!sheet||!sheet.act) return;
  setTimeout(()=>{
    if(!drActive||!bob.isConnected) return;
    bob.classList.add('dr-act');
    setTimeout(()=>{
      if(!bob.isConnected) return;
      bob.classList.remove('dr-act');
      drScheduleDragonAction(bob,sp);
    },sheet.act*1000+80);
  },3600+Math.random()*5200);
}
function drElChip(el){ return `<span class="dr-chip el-${el}">${DR_ELNAME[el]||el}</span>`; }
function drRarChip(rar){ const r=DR_RAR[rar]||DR_RAR.common; return `<span class="dr-rar" style="--rc:${r.c}">${r.n}</span>`; }

/* ---------- State ---------- */
function drDefault(){
  return {gold:800, gems:20, food:60, level:1, xp:0,
    dragons:[{sp:'fire',lv:1,fed:0,hab:1},{sp:'water',lv:1,fed:0,hab:2},{sp:'plant',lv:1,fed:0}], breed:null, cleared:[],
    qc:{tap:0,feed:0,breed:0,win:0,clear:0}, qClaimed:[],
    habitats:[{id:1,el:'fire',at:0,bank:0},{id:2,el:'water',at:0,bank:0}], habNext:3,
    farm:[0,0,0], daily:{day:0,streak:0}, achClaimed:[], adv:0, boss:{week:0,dmg:0,hits:0,day:0,claimed:[]}, decos:[], pity:0,
    ore:0, forge:{gold:0,power:0}, mails:[], spinDay:0, mailSeeded:false, lastSeen:0};
}
function drNormDragons(arr){
  return (arr||[]).map(d=>{
    if(typeof d==='string'){ const sp=d==='violet'?'dark':(DR_SPECIES[d]?d:'fire'); return {sp,lv:1,fed:0}; }
    if(d&&d.sp&&DR_SPECIES[d.sp]) return {sp:d.sp, lv:d.lv||1, fed:d.fed||0, star:Math.min(5,Math.max(1,d.star||1)), hab:(typeof d.hab==='number'?d.hab:null)};
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
    habitats:(Array.isArray(v.habitats)&&v.habitats.length)?v.habitats.filter(h=>h&&DR_PAL[h.el]).map(h=>({id:h.id, el:h.el, at:h.at||0, bank:h.bank||0})):drDefault().habitats,
    habNext:Math.max(3, v.habNext||0, ...((Array.isArray(v.habitats)?v.habitats:[]).map(h=>((h&&h.id)||0)+1))),
    farm:Array.isArray(v.farm)?v.farm.slice(0,3).map(x=>+x||0):[0,0,0],
    daily:(v.daily&&typeof v.daily==='object')?{day:v.daily.day||0,streak:v.daily.streak||0}:{day:0,streak:0},
    achClaimed:Array.isArray(v.achClaimed)?v.achClaimed:[], adv:v.adv||0,
    boss:(v.boss&&typeof v.boss==='object')?{week:v.boss.week||0,dmg:v.boss.dmg||0,hits:v.boss.hits||0,day:v.boss.day||0,claimed:Array.isArray(v.boss.claimed)?v.boss.claimed:[]}:{week:0,dmg:0,hits:0,day:0,claimed:[]},
    decos:Array.isArray(v.decos)?v.decos:[], pity:v.pity||0,
    spinDay:v.spinDay||0, mailSeeded:!!v.mailSeeded, lastSeen:v.lastSeen||0};
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
    dragons:drState.dragons.map(d=>({sp:d.sp,lv:d.lv,fed:d.fed,star:drStar(d),hab:d.hab||null})),
    breed:drState.breed||null, cleared:(drState.cleared||[]).slice(),
    qc:Object.assign({tap:0,feed:0,breed:0,win:0,clear:0}, drState.qc||{}), qClaimed:(drState.qClaimed||[]).slice(),
    ore:Math.round(drState.ore||0), forge:{gold:(drState.forge&&drState.forge.gold)||0, power:(drState.forge&&drState.forge.power)||0},
    mails:(drState.mails||[]).slice(), spinDay:drState.spinDay||0, mailSeeded:!!drState.mailSeeded, lastSeen:drNow(),
    habitats:(drState.habitats||[]).map(h=>({id:h.id,el:h.el,at:h.at||0,bank:Math.round(h.bank||0)})), habNext:drState.habNext||3,
    farm:(drState.farm||[]).slice(0,3), daily:drState.daily||{day:0,streak:0}, achClaimed:(drState.achClaimed||[]).slice(),
    adv:drState.adv||0, boss:drState.boss||{week:0,dmg:0,hits:0,day:0,claimed:[]}, decos:(drState.decos||[]).slice(), pity:drState.pity||0,
    updatedAt:Date.now()};
  try{ localStorage.setItem(drLsKey(), JSON.stringify(obj)); }catch(_){}   // LUÔN lưu cục bộ trước
  if(auth&&auth.currentUser&&db){                                          // rồi mới đồng bộ cloud (best-effort)
    db.ref('users/'+auth.currentUser.uid+'/daorong').set(obj).catch(e=>console.error('daorong save(cloud)',e));
  }
}

/* ---------- Công thức ---------- */
function drFoodToNext(lv){ return Math.round(20*Math.pow(1.5,lv-1)); }
function drXpToNext(lvl){ return Math.round(100*Math.pow(1.3,lvl-1)); }
function drGoldPerTap(d){ return Math.round(DR_SPECIES[d.sp].gold * d.lv * (2+Math.random()*2) * drStarMult(d) * drForgeGoldMult() * (typeof drDecorMult==='function'?drDecorMult():1)); }
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
const DR_PITY_MAX=4;                                      // lai 4 lần liền ra rồng thường -> lần sau CHẮC CHẮN ra hiếm
function drBreedResult(elA,elB,blessed){
  const key=[elA,elB].sort().join('+');
  const pool=DR_BREED[key]|| [elA===elB?elA:(Math.random()<.5?elA:elB)];
  const rarest=pool.slice().sort((x,y)=>drRarRank(y)-drRarRank(x))[0];
  if(blessed) return rarest;                              // chúc phúc: CHẮC CHẮN ra con hiếm nhất
  if((drState.pity||0)>=DR_PITY_MAX && drRarRank(rarest)>=1) return rarest;   // đủ pity -> ép ra hiếm
  const wts=pool.map(sp=>Math.pow(2,drRarRank(sp)));      // con càng hiếm càng dễ ra (trọng số 2^bậc hiếm)
  let r=Math.random()*wts.reduce((a,b)=>a+b,0);
  for(let i=0;i<pool.length;i++){ if((r-=wts[i])<0) return pool[i]; }
  return pool[pool.length-1];
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
    ['habitat','🏝️','Khu đảo'],['farm','🌾','Nông trại'],['adventure','🗺️','Phiêu lưu'],['boss','👹','Boss'],['daily','📅','Điểm danh'],['ach','🏆','Thành tựu'],['leaderboard','👑','BXH'],['decor','🌴','Trang trí'],['shop','shop','Shop'],['quest','quest','Nhiệm vụ'],['wheel','🎡','Vòng quay'],['forge','🔨','Lò rèn'],['breed','breed','Lai rồng'],['feed','food','Cho ăn'],['arena','arena','Đấu'],['codex','codex','Sách rồng'],['mail','📬','Thư']
  ].map(d=>`<button class="dr-dock-btn" data-act="${d[0]}" type="button"><span class="di">${DR_ICONS[d[1]]?drIcon(d[1]):`<span class="dr-di-emoji">${d[1]}</span>`}</span><span class="dl">${d[2]}</span>${typeof drDockBadge==='function'?drDockBadge(d[0]):''}</button>`).join('');
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
  const drOff=drOfflineEarned();             // tính vàng offline TRƯỚC khi đóng dấu lastSeen mới
  if(drOff.gold>=10 && (drState.dragons||[]).length) drState.gold+=drOff.gold;
  drState.lastSeen=drNow();
  drActive=true;
  try{ localStorage.setItem('lastGame','daorong'); }catch(_){}
  $('drApp').style.display='block';
  $('drName').textContent=(profile&&profile.name)?profile.name:myName;
  drSeedMails();
  drRenderHud(); drRenderDragons(); drRenderEgg(); drRenderObstacles();
  drSaveNow();                               // luôn lưu để chốt lastSeen (chống cộng vàng offline trùng)
  drStartCoins();
  clearInterval(drTick); drTick=setInterval(drRenderEgg,1000);   // đếm ngược ổ ấp
  if(drOff.gold>=10 && (drState.dragons||[]).length) setTimeout(()=>drShowOffline(drOff), 450);
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
  if(typeof drUpdateHabDot==='function') drUpdateHabDot();   // tính năng Khu đảo đang làm dở -> né crash
  if(typeof drUpdateFeatureDots==='function') drUpdateFeatureDots();
}
function drBump(id){ const el=$(id); if(!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

/* ---------- Rồng trên đảo ---------- */
function drRenderDragons(){
  const wrap=$('drDragons'); if(!wrap) return; wrap.innerHTML='';
  drState.dragons.slice(0,DR_MAX).forEach((d,i)=>{
    const s=DR_SPECIES[d.sp]||DR_SPECIES.fire, st=drStar(d), evo=drEvolution(d.lv);
    const slot=DR_SLOTS[i%DR_SLOTS.length];
    const roam=document.createElement('div'); roam.className='dr-roam'; roam.dataset.idx=i;
    roam.style.left=slot[0]+'%'; roam.style.top=slot[1]+'%'; roam.style.zIndex=10+Math.round(slot[1]);
    const bob=document.createElement('div'); bob.className=`dr-bob dr-star-${st} dr-stage-${evo.id}`;
    bob.style.animationDelay=(-Math.random()*2.6).toFixed(2)+'s';
    bob.style.setProperty('--acc',(DR_PAL[s.el]||{}).body||'#8fe0ff');
    const scale=(evo.scale+Math.max(0,(d.lv||1)-evo.minLv)*0.012).toFixed(3);
    bob.innerHTML=`<span class="dr-aura"></span>`
      +`<div class="dr-artwrap dr-facing" style="--dScale:${scale}">${drDragonArt(d)}</div>`
      +(st>1?`<span class="dr-starbadge">${'★'.repeat(st)}</span>`:'')
      +`<span class="dr-lvtag">Lv${d.lv} · ${evo.name}</span>`;
    roam.appendChild(bob); wrap.appendChild(roam);
    drScheduleDragonAction(bob,d.sp);
    if(!drReduce){
      const dist=42+Math.random()*30, dx=slot[0]>58?-dist:dist, dy=Math.random()*18-9;
      const dur=Math.max(6200,12400-(s.spd||5)*560)+Math.random()*2600;
      roam.animate([
        {transform:'translate(0,0)'},
        {transform:`translate(${dx}px,${dy}px)`,offset:.46},
        {transform:`translate(${dx}px,${dy}px)`,offset:.52},
        {transform:'translate(0,0)',offset:.96},
        {transform:'translate(0,0)'}
      ],{duration:dur,iterations:Infinity,easing:'ease-in-out'});
      roam.classList.toggle('flip',dx<0);
      const t=setInterval(()=>{ if(!roam.isConnected){clearInterval(t);return;} roam.classList.toggle('flip'); },Math.round(dur/2));
    }
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
  else if(act==='habitat'){ if(typeof drShowHabitats==='function') drShowHabitats(); else toast('🏝️ Khu đảo sắp ra mắt!'); }
  else if(act==='breed') drShowBreed();
  else if(act==='feed') drShowFeed();
  else if(act==='arena') drShowArena();
  else if(act==='codex') drShowCodex();
  else if(act==='quest') drShowQuests();
  else if(act==='wheel') drShowWheel();
  else if(act==='forge') drShowForge();
  else if(act==='mail') drShowMail();
  else if(act==='farm'){ if(typeof drShowFarm==='function') drShowFarm(); }
  else if(act==='daily'){ if(typeof drShowDaily==='function') drShowDaily(); }
  else if(act==='adventure'){ if(typeof drShowAdventure==='function') drShowAdventure(); }
  else if(act==='boss'){ if(typeof drShowBoss==='function') drShowBoss(); }
  else if(act==='ach'){ if(typeof drShowAch==='function') drShowAch(); }
  else if(act==='leaderboard'){ if(typeof drShowLeaderboard==='function') drShowLeaderboard(); }
  else if(act==='decor'){ if(typeof drShowDecor==='function') drShowDecor(); }
}
function drDragonCard(d,i,extra){
  const s=DR_SPECIES[d.sp], evo=drEvolution(d.lv);
  return `<button class="dr-dcard" data-idx="${i}" ${extra||''}><span class="dr-dcard-mini">${drDragonArt(d)}</span>`
    +`<b>${esc(s.name)}</b><span class="dr-lv">Lv${d.lv} · ${evo.name}</span>${drRarChip(s.rar)}<span class="dr-cardstar">${'★'.repeat(drStar(d))}</span></button>`;
}

/* ---------- Chi tiết rồng: cho ăn / bán / lai ---------- */
function drShowDragon(i){
  const d=drState.dragons[i]; if(!d) return; const s=DR_SPECIES[d.sp];
  const need=drFoodToNext(d.lv), pct=Math.min(100,Math.round(d.fed/need*100));
  const evo=drEvolution(d.lv), nextEvo=drEvolutionNext(d.lv);
  const body=`
    <div class="dr-detail">
      <div class="dr-detail-art dr-detail-${evo.id}">${drDragonArt(d)}</div>
      <div class="dr-detail-info">
        <div class="dr-detail-name">${esc(s.name)} ${drRarChip(s.rar)}</div>
        <div class="dr-chips">${s.els.map(drElChip).join('')}</div>
        <div class="dr-kv"><span>Cấp</span><b>Lv ${d.lv}</b></div>
        <div class="dr-kv"><span>Tiến hoá</span><b class="dr-evo-name dr-evo-name-${evo.id}">${evo.name}</b></div>
        <div class="dr-kv"><span>Sao</span><b class="dr-stars">${drStarPips(d)}</b></div>
        <div class="dr-kv"><span>Sinh vàng</span><b>~${Math.round(s.gold*d.lv*3*drStarMult(d)*drForgeGoldMult())} 🪙/lượt</b></div>
        <div class="dr-kv"><span>Sức mạnh</span><b>${drPower(d)} ⚔️</b></div>
        <div class="dr-feedbar"><i style="width:${pct}%"></i><em>${d.fed}/${need} 🍖 tới Lv${d.lv+1}</em></div>
        ${nextEvo?`<div class="dr-evo-next">✨ ${nextEvo.name} mở tại Lv${nextEvo.minLv}</div>`:`<div class="dr-evo-next max">👑 Đã đạt hình thái Legend</div>`}
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
  const before=drEvolution(d.lv).id;
  drState.food-=amount; d.fed+=amount; drQC('feed'); drAddXp(2);
  const need=drFoodToNext(d.lv);
  if(d.fed>=need){ d.fed-=need; d.lv++; drAddXp(15); drEvolutionNotice(d,before); }
  drRenderHud(); drRenderDragons(); drSave(); drShowDragon(i);   // refresh
}
function drEvolutionNotice(d,before){
  const evo=drEvolution(d.lv);
  if(evo.id!==before){
    toast(`✨ ${DR_SPECIES[d.sp].name} tiến hoá thành ${evo.name}!`);
    if(typeof confetti==='function') confetti();
  }else toast('🐉 '+DR_SPECIES[d.sp].name+' lên Lv'+d.lv+'!');
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
      <div class="dr-egg-big">${drDragonArt({sp:rs,lv:1})}</div>
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
      return `<button class="dr-slot filled" data-slot="${label}"><span class="dr-slot-mini">${drDragonArt(d)}</span><small>${esc(s.name)} Lv${d.lv}</small></button>`; }
    return `<button class="dr-slot" data-slot="${label}"><span class="dr-slot-plus">+</span><small>Chọn rồng</small></button>`;
  };
  let preview='';
  if(Number.isInteger(a)&&Number.isInteger(b)){
    const secs=drBreedSecs(a,b);
    const oa=DR_SPECIES[drState.dragons[a].sp].el, ob=DR_SPECIES[drState.dragons[b].sp].el;
    const odds=drBreedOdds(oa,ob);
    const rarest=(odds&&odds.length)?odds.slice().sort((x,y)=>drRarRank(y.sp)-drRarRank(x.sp))[0]:null;
    const oddsHtml=odds
      ? `<div class="dr-odds">${odds.map(o=>{ const s=DR_SPECIES[o.sp];
          return `<div class="dr-odd"><span class="dr-odd-mini">${drDragonSVG(s.el)}</span><b>${esc(s.name)}</b>${drRarChip(s.rar)}<span class="dr-odd-pct">${o.pct}%</span></div>`; }).join('')}</div>`
      : `<p class="dr-note">Cặp hệ này chưa có công thức riêng — ra 1 trong 2 hệ bố mẹ.</p>`;
    preview=`<div class="dr-breed-preview">🔮 Có thể ra · ⏳ ${drFmtTime(secs)}</div>${oddsHtml}
      <label class="dr-bless"><input type="checkbox" id="drBlessChk"><span>🌟 Chúc phúc <b>${DR_BLESS_COST}💎</b>${rarest?` · chắc chắn ra <b>${esc(DR_SPECIES[rarest.sp].name)}</b>`:' · ưu tiên con hiếm'}</span></label>
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
  drState.pity = drRarRank(resultEl)>=1 ? 0 : (drState.pity||0)+1;   // pity: ra thường thì tăng, đủ ngưỡng ép hiếm
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

/* ---------- Vàng offline (idle) — dùng GIỜ SERVER + cap để chống tua đồng hồ ---------- */
const DR_OFFLINE_CAP_H=8;              // tích luỹ tối đa 8 giờ
const DR_OFFLINE_K=0.6;               // hệ số vàng offline / phút cho mỗi rồng
function drOfflineRatePerMin(){        // tổng vàng/phút của cả đàn (theo cấp, sao, bùa vàng)
  const base=(drState.dragons||[]).reduce((sum,d)=>sum + DR_SPECIES[d.sp].gold * d.lv * drStarMult(d), 0);
  return base * drForgeGoldMult() * DR_OFFLINE_K;
}
function drOfflineEarned(){
  const last=drState.lastSeen||0;
  const perHr=Math.round(drOfflineRatePerMin()*60);
  if(!last) return {gold:0, mins:0, capped:false, perHr};
  const elapsedMs=Math.max(0, drNow()-last);          // đồng hồ lùi -> 0
  const capMs=DR_OFFLINE_CAP_H*3600*1000;
  const usedMs=Math.min(elapsedMs, capMs);            // cap 8h -> tua đồng hồ tới cũng vô ích
  const mins=usedMs/60000;
  return {gold:Math.round(drOfflineRatePerMin()*mins), mins, capped:elapsedMs>capMs, perHr};
}
function drShowOffline(off){
  const h=Math.floor(off.mins/60), m=Math.round(off.mins%60);
  const time=h>0?`${h} giờ ${m} phút`:`${m} phút`;
  const body=`<div class="dr-offline">
      <div class="dr-offline-moon">🌙💤</div>
      <p class="dr-note">Đàn rồng chăm chỉ sinh vàng suốt <b>${time}</b>${off.capped?' <em>(đã đạt mốc tối đa 8 giờ)</em>':''} khi bạn vắng mặt!</p>
      <div class="dr-offline-gold">+${fmtCoin(off.gold)} 🪙</div>
      <p class="dr-note">Tốc độ: <b>~${fmtCoin(off.perHr)} 🪙/giờ</b> · nuôi cấp cao, nâng sao & rèn Bùa Vàng để tăng!</p>
      <button class="dr-btn go block" id="drOffOk">Tuyệt vời! 🎉</button></div>`;
  drModal('Vàng khi vắng mặt 💤', body);
  $('drOffOk').onclick=drCloseModal;
}

/* ---------- Vòng quay may mắn (gacha) ---------- */
const DR_SPIN_COST=8;
const DR_WHEEL=[
  {ic:'🪙', txt:'+800',      kind:'gold', amt:800,  w:20},
  {ic:'🍖', txt:'+30',       kind:'food', amt:30,   w:18},
  {ic:'⛏️', txt:'+8',        kind:'ore',  amt:8,    w:16},
  {ic:'🪙', txt:'+2500',     kind:'gold', amt:2500, w:9},
  {ic:'💎', txt:'+5',        kind:'gems', amt:5,    w:12},
  {ic:'⛏️', txt:'+25',       kind:'ore',  amt:25,   w:8},
  {ic:'🍖', txt:'+90',       kind:'food', amt:90,   w:9},
  {ic:'🥚', txt:'Rồng hiếm', kind:'egg',  amt:0,    w:4},
];
let drWheelRot=0, drSpinning=false;
function drSpinDayNow(){ return Math.floor(drNow()/86400000); }
function drCanFreeSpin(){ return drSpinDayNow() > (drState.spinDay||0); }
function drSpinBtnLabel(){ return drCanFreeSpin()?'🎁 Quay MIỄN PHÍ':`🎡 Quay · ${DR_SPIN_COST}💎`; }
function drShowWheel(){
  drWheelRot=0;
  const seg=DR_WHEEL.map((s,i)=>`<div class="dr-wseg" style="transform:rotate(${i*45+22.5}deg)"><div class="dr-wseg-in">${s.ic}</div></div>`).join('');
  const body=`<div class="dr-wheel-wrap">
      <div class="dr-wheel-ptr">▼</div>
      <div class="dr-wheel" id="drWheel">${seg}<div class="dr-wheel-hub">🐲</div></div>
    </div>
    <p class="dr-note" id="drSpinMsg">Quay trúng vàng · thức ăn · quặng · kim cương hoặc <b>rồng hiếm</b>!</p>
    <button class="dr-btn go block" id="drSpinBtn">${drSpinBtnLabel()}</button>`;
  drModal('Vòng Quay May Mắn', body);
  $('drSpinBtn').onclick=()=>drSpin(drCanFreeSpin());
}
function drWeightedIdx(){
  const total=DR_WHEEL.reduce((a,s)=>a+s.w,0); let r=Math.random()*total;
  for(let i=0;i<DR_WHEEL.length;i++){ r-=DR_WHEEL[i].w; if(r<0) return i; }
  return 0;
}
function drSpin(free){
  if(drSpinning) return;
  if(!free){ if(drState.gems<DR_SPIN_COST){ toast('Thiếu 💎 — kiếm thêm rồi quay'); return; } drState.gems-=DR_SPIN_COST; }
  else drState.spinDay=drSpinDayNow();
  drRenderHud(); drSave();
  drSpinning=true;
  const idx=drWeightedIdx();
  const wheel=$('drWheel'), btn=$('drSpinBtn'); if(btn) btn.disabled=true;
  if(wheel){
    const landAngle=((360-(idx*45+22.5))%360+360)%360;
    const cur=((drWheelRot%360)+360)%360;
    const delta=((landAngle-cur)%360+360)%360;
    drWheelRot+=360*6+delta;
    wheel.style.transition='transform 3.4s cubic-bezier(.15,.85,.25,1)';
    wheel.style.transform=`rotate(${drWheelRot}deg)`;
  }
  setTimeout(()=>{ drSpinning=false; drSpinReward(DR_WHEEL[idx]); }, 3500);
}
function drSpinReward(s){
  let msg='';
  if(s.kind==='gold'){ drState.gold+=s.amt; msg=`+${fmtCoin(s.amt)} 🪙`; }
  else if(s.kind==='food'){ drState.food+=s.amt; msg=`+${s.amt} 🍖`; }
  else if(s.kind==='ore'){ drState.ore=(drState.ore||0)+s.amt; msg=`+${s.amt} ⛏️ quặng`; }
  else if(s.kind==='gems'){ drState.gems+=s.amt; msg=`+${s.amt} 💎`; }
  else if(s.kind==='egg'){
    const rares=DR_SP_ORDER.filter(sp=>drRarRank(sp)>=1);
    const sp=rares[Math.floor(Math.random()*rares.length)];
    if(drState.dragons.length<drCapacity()){ drState.dragons.push({sp,lv:1,fed:0,star:1}); drQC('breed'); msg=`🥚 Rồng hiếm: ${DR_SPECIES[sp].name}!`; }
    else{ drState.gems+=15; msg='Đảo đầy ô — quy đổi +15 💎'; }
  }
  drAddXp(8); drRenderHud(); drRenderDragons(); drSave();
  if(typeof confetti==='function') confetti();
  toast('🎉 Trúng '+msg);
  const m=$('drSpinMsg'); if(m) m.innerHTML='🎉 Trúng <b>'+msg+'</b>!';
  const btn=$('drSpinBtn'); if(btn){ btn.disabled=false; btn.textContent=drSpinBtnLabel(); btn.onclick=()=>drSpin(drCanFreeSpin()); }
}

/* ---------- Lò rèn (chế tạo bùa toàn đảo) ---------- */
function drShowForge(){
  const row=(kind,ic,name,desc)=>{
    const lv=(drState.forge&&drState.forge[kind])||0, max=lv>=DR_FORGE_MAX;
    const cost=drForgeCost(lv), pct=Math.round(lv/DR_FORGE_MAX*100);
    const btn = max ? `<span class="dr-q-done">Tối đa</span>`
      : `<button class="dr-btn sm go" data-forge="${kind}">Rèn · ${cost.gems}💎 ${cost.ore}⛏️</button>`;
    return `<div class="dr-forge-row">
        <span class="dr-forge-ic">${ic}</span>
        <div class="dr-q-mid"><b>${name} · Lv${lv}/${DR_FORGE_MAX}</b><small>${desc} — hiện <em>+${lv*5}%</em></small>
          <div class="dr-q-bar"><i style="width:${pct}%"></i></div></div>
        ${btn}</div>`;
  };
  const body=`<p class="dr-note">Có <b>⛏️ ${fmtCoin(drState.ore||0)}</b> quặng · <b>💎 ${fmtCoin(drState.gems)}</b>. Rèn bùa tăng <b>vĩnh viễn cho cả đảo</b>.</p>
    ${row('gold','🪙','Bùa Vàng','Tăng vàng thu mỗi lần chạm')}
    ${row('power','⚔️','Bùa Chiến','Tăng sức mạnh rồng khi đấu')}
    <p class="dr-note">⛏️ Quặng lấy từ <b>Vòng quay</b>, <b>Hòm thư</b> và thắng <b>Đấu trường</b>.</p>`;
  drModal('Lò Rèn', body);
  $('drModal').querySelectorAll('[data-forge]').forEach(b=>b.onclick=()=>drForgeUp(b.dataset.forge));
}
function drForgeUp(kind){
  if(!drState.forge) drState.forge={gold:0,power:0};
  const lv=drState.forge[kind]||0;
  if(lv>=DR_FORGE_MAX){ toast('Bùa đã tối đa'); return; }
  const cost=drForgeCost(lv);
  if((drState.ore||0)<cost.ore){ toast('Thiếu ⛏️ quặng — quay/đấu để kiếm'); return; }
  if(drState.gems<cost.gems){ toast('Thiếu 💎'); return; }
  drState.ore-=cost.ore; drState.gems-=cost.gems; drState.forge[kind]=lv+1;
  drAddXp(15); drRenderHud(); drRenderDragons(); drSave();
  if(typeof confetti==='function') confetti();
  toast(`🔨 ${kind==='gold'?'Bùa Vàng':'Bùa Chiến'} lên Lv${lv+1} · +${(lv+1)*5}%`);
  drShowForge();
}

/* ---------- Hòm thư (tiện ích) ---------- */
function drSeedMails(){
  if(drState.mailSeeded) return;
  drState.mailSeeded=true;
  drState.mails=(drState.mails||[]).concat([
    {id:'welcome',   title:'🎉 Chào mừng tới Đảo Rồng!', body:'Quà khởi đầu cho nhà nuôi rồng mới. Chăm rồng, lai giống và mở rộng đảo nhé!', reward:{gems:10,food:40,ore:15}, claimed:false},
    {id:'tip-wheel', title:'🎡 Thử Vòng Quay',           body:'Mỗi ngày có 1 lượt quay MIỄN PHÍ — cơ hội trúng rồng hiếm!', reward:{ore:10}, claimed:false},
    {id:'tip-forge', title:'🔨 Rèn bùa mạnh hơn',        body:'Dùng ⛏️ quặng ở Lò Rèn để tăng vĩnh viễn vàng & sức mạnh cho cả đảo.', reward:{gold:1000}, claimed:false},
  ]);
}
function drMailUnread(){ return (drState.mails||[]).filter(m=>!m.claimed).length; }
function drUpdateMailDot(){ const d=$('drMailDot'); if(!d) return; const n=drMailUnread(); d.textContent=n; d.hidden=(n<=0); }
function drShowMail(){
  drSeedMails();
  const list=(drState.mails||[]).map((m,i)=>{
    const r=m.reward||{};
    const rw=[r.gold?`+${fmtCoin(r.gold)}🪙`:'', r.gems?`+${r.gems}💎`:'', r.food?`+${r.food}🍖`:'', r.ore?`+${r.ore}⛏️`:''].filter(Boolean).join(' ');
    const btn=m.claimed?`<span class="dr-q-done">✓ Đã nhận</span>`:`<button class="dr-btn sm go" data-mail="${i}">Nhận</button>`;
    return `<div class="dr-mail ${m.claimed?'claimed':''}">
        <div class="dr-mail-top"><b>${esc(m.title)}</b>${btn}</div>
        <p>${esc(m.body)}</p>${rw?`<div class="dr-mail-rw">🎁 ${rw}</div>`:''}</div>`;
  }).join('') || `<p class="dr-note">Hòm thư trống.</p>`;
  drModal('Hòm Thư', `<div class="dr-maillist">${list}</div>`, true);
  $('drModal').querySelectorAll('[data-mail]').forEach(b=>b.onclick=()=>drClaimMail(+b.dataset.mail));
}
function drClaimMail(i){
  const m=(drState.mails||[])[i]; if(!m||m.claimed) return;
  m.claimed=true; const r=m.reward||{};
  if(r.gold) drState.gold+=r.gold; if(r.gems) drState.gems+=r.gems;
  if(r.food) drState.food+=r.food; if(r.ore) drState.ore=(drState.ore||0)+r.ore;
  drRenderHud(); drSave();
  if(typeof confetti==='function') confetti();
  toast('🎁 Đã nhận quà thư!');
  drShowMail();
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
    return `<div class="dr-feed-row"><span class="dr-dcard-mini sm">${drDragonArt(d)}</span>
      <div class="dr-feed-mid"><b>${esc(s.name)} · Lv${d.lv} · ${drEvolution(d.lv).name}</b><div class="dr-feedbar sm"><i style="width:${pct}%"></i></div></div>
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
  const before=drEvolution(d.lv).id;
  drState.food-=10; d.fed+=10; drQC('feed'); drAddXp(2);
  const need=drFoodToNext(d.lv);
  if(d.fed>=need){ d.fed-=need; d.lv++; drAddXp(15); drEvolutionNotice(d,before); }
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
  return `<span class="dr-dcard-mini">${drDragonArt(d)}</span><b>${esc(s.name)}</b><span class="dr-lv">Lv${d.lv} · ${drEvolution(d.lv).name}</span>`; }
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
  if(win){ drState.gold+=reward.gold; drState.gems+=reward.gems; drState.ore=(drState.ore||0)+3; drQC('win'); }
  else drState.gold+=reward.gold;
  drAddXp(reward.xp); drRenderHud(); drSave();
  const es=DR_SPECIES[enemy.sp];
  const body=`<div class="dr-fight">
      <div class="dr-fight-side ${win?'win':''}"><div class="dr-fight-art">${drDragonArt(me)}</div><b>${esc(DR_SPECIES[me.sp].name)}</b><small>Lv${me.lv} · ${drEvolution(me.lv).name}${meAdv>1?' · Khắc chế!':''}</small></div>
      <div class="dr-vs">${win?'THẮNG':'THUA'}</div>
      <div class="dr-fight-side ${!win?'win':''}"><div class="dr-fight-art">${drDragonArt(enemy)}</div><b>${esc(es.name)}</b><small>Lv${enemy.lv} · ${drEvolution(enemy.lv).name}</small></div>
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
    const best=drState.dragons.filter(d=>d.sp===sp).sort((a,b)=>b.lv-a.lv)[0];
    return `<button class="dr-codex-cell ${has?'':'locked'}" data-sp="${sp}">
      <span class="dr-codex-mini">${has?drDragonArt(best):'<span class="dr-lock">?</span>'}</span>
      <small>${has?`${esc(s.name)} · ${drEvolution(best.lv).name}`:'? ? ?'}</small></button>`; }).join('');
  const body=`<p class="dr-note">Đã sưu tầm <b>${owned.size}/${DR_SP_ORDER.length}</b> loài rồng. Lai để mở khoá loài mới!</p>
    <div class="dr-codex-grid">${cells}</div>`;
  drModal('Sách Rồng', body, true);
  $('drModal').querySelectorAll('[data-sp]').forEach(c=>c.onclick=()=>drCodexDetail(c.dataset.sp, owned.has(c.dataset.sp)));
}
function drCodexDetail(sp,has){
  const s=DR_SPECIES[sp];
  const best=drState.dragons.filter(d=>d.sp===sp).sort((a,b)=>b.lv-a.lv)[0]||{sp,lv:1};
  const bar=(label,val,max)=>`<div class="dr-statrow"><span>${label}</span><div class="dr-statbar"><i style="width:${Math.min(100,Math.round(val/max*100))}%"></i></div></div>`;
  const body=`<div class="dr-codex-detail">
    <div class="dr-codex-art ${has?'':'silh'}">${drDragonArt(best)}</div>
    <div class="dr-codex-meta"><div class="dr-detail-name">${has?esc(s.name):'? ? ?'} ${drRarChip(s.rar)}</div>
      <div class="dr-chips">${s.els.map(drElChip).join('')}</div>
      ${has?`<div class="dr-kv"><span>Hình thái cao nhất</span><b>${drEvolution(best.lv).name} · Lv${best.lv}</b></div><div class="dr-kv"><span>Sinh vàng</span><b>${s.gold} 🪙/phút (Lv1)</b></div>`:'<p class="dr-note">Chưa sở hữu — lai hoặc mua để mở khoá.</p>'}
    </div></div>
    <div class="dr-stats">
      ${bar('Máu',s.hp,200)}${bar('Sát thương',s.atk,120)}${bar('Tầm đánh',s.range,6)}${bar('Tốc độ',s.spd,10)}
    </div>
    ${has&&s.els.length>1?`<p class="dr-note">Lai từ: ${s.els.map(drElChip).join(' + ')}</p>`:''}`;
  drModal('Đồ giám: '+(has?esc(s.name):'Bí ẩn'), body);
}

/* ---------- Hiệu ứng ---------- */
function drGainText(x,y,txt){ const g=document.createElement('div'); g.className='dr-fx gain'; g.textContent=txt; g.style.left=x+'px'; g.style.top=y+'px'; document.body.appendChild(g); setTimeout(()=>g.remove(),1000); }

/* ================= KHU ĐẢO THEO HỆ (Habitat) =================
   Xếp rồng vào khu ĐÚNG HỆ -> sinh vàng ×1.5. Vàng tự tích theo thời gian
   (dùng drNow() = giờ máy chủ đã hiệu chỉnh + có TRẦN -> đổi đồng hồ máy không ăn gian được).
   Rồng gắn d.hab = id khu; không gắn thì đi rong ngoài đảo như cũ. Mở khu mới bằng vàng. */
const DR_HAB_SLOTS=3;            // mỗi khu chứa tối đa 3 rồng
const DR_HAB_MAX=6;             // tối đa 6 khu
const DR_HAB_STORE_HRS=8;       // trần tích vàng = 8 giờ sản lượng (phải quay lại thu)
const DR_HAB_RATE_HR=50;        // hệ số vàng/giờ mỗi "điểm sản lượng"; rồng đúng hệ ×1.5
let drHabTimer=null;
function drHabs(){ return (drState&&Array.isArray(drState.habitats))?drState.habitats:[]; }
function drHabById(id){ return drHabs().find(h=>h.id===id)||null; }
function drHabDragons(id){ return drState.dragons.map((d,i)=>({d,i})).filter(o=>o.d.hab===id); }
function drHabAt(h){ if(!h.at) h.at=drNow(); return h.at; }        // 'at'=0 -> bắt đầu tính từ bây giờ (không dump từ epoch)
function drDragonHabHr(d, habEl){
  const s=DR_SPECIES[d.sp]; if(!s) return 0;
  const match=(s.el===habEl)?1.5:1;
  return s.gold * (d.lv||1) * drStarMult(d) * drForgeGoldMult() * match * DR_HAB_RATE_HR;
}
function drHabRateHr(h){ return drHabDragons(h.id).reduce((sum,o)=>sum+drDragonHabHr(o.d,h.el),0); }
function drHabCap(h){ return Math.round(drHabRateHr(h)*DR_HAB_STORE_HRS); }
function drHabStored(h){                                            // vàng đã tích (server-time + trần chống tua giờ)
  const rate=drHabRateHr(h), bank=h.bank||0;
  const hrs=Math.max(0,(drNow()-drHabAt(h))/3600000);
  const ceil=Math.max(drHabCap(h), bank);                          // không cắt phần đã "bank" khi rút bớt rồng
  return Math.min(ceil, Math.floor(bank + rate*hrs));
}
function drSettleHab(h){ h.bank=drHabStored(h); h.at=drNow(); }     // chốt sổ khi rate thay đổi (đổi rồng)
function drHabCost(){ const n=drHabs().length; return Math.round(1500*Math.pow(2,Math.max(0,n-2))); } // #3:1500 #4:3000 #5:6000 #6:12000
function drHabFullCount(){ return drHabs().filter(h=>drHabRateHr(h)>0 && drHabStored(h)>=drHabCap(h)).length; }
function drUpdateHabDot(){ const el=$('drHabDot'); if(!el) return; const n=drHabFullCount(); el.textContent=n; el.hidden=(n<=0); }

function drCollectHab(id){
  const h=drHabById(id); if(!h) return;
  const amt=drHabStored(h);
  if(amt<=0){ toast('Chưa tích đủ vàng'); return; }
  drState.gold+=amt; h.bank=0; h.at=drNow();
  drRenderHud(); drBump('drGold'); drSave(); drShowHabitats();
  toast('🏝️ Thu '+fmtCoin(amt)+' 🪙 · khu '+(DR_ELNAME[h.el]||h.el));
}
function drBuildHab(el){
  if(!DR_PAL[el]) return;
  if(drHabs().length>=DR_HAB_MAX){ toast('Đã đạt tối đa '+DR_HAB_MAX+' khu'); return; }
  const cost=drHabCost();
  if(drState.gold<cost){ toast('Thiếu vàng — cần '+fmtCoin(cost)+' 🪙'); return; }
  drState.gold-=cost;
  const id=drState.habNext||(Math.max(1,...drHabs().map(h=>h.id))+1);
  drState.habitats.push({id, el, at:drNow(), bank:0});
  drState.habNext=id+1;
  drRenderHud(); drSave(); drShowHabitats();
  toast('🏝️ Đã xây khu '+(DR_ELNAME[el]||el)+'!'); if(typeof confetti==='function') confetti();
}
function drAssignAuto(idx){                                         // 1 chạm: xếp vào khu đúng hệ còn chỗ, không thì khu trống bất kỳ
  const d=drState.dragons[idx]; if(!d) return;
  const el=DR_SPECIES[d.sp]?DR_SPECIES[d.sp].el:null;
  const free=drHabs().filter(h=>drHabDragons(h.id).length<DR_HAB_SLOTS);
  if(!free.length){ toast('Các khu đã đầy — xây khu mới 🏝️'); return; }
  const target=free.find(h=>h.el===el)||free[0];
  drSettleHab(target); d.hab=target.id;
  drSave(); drShowHabitats();
  toast(DR_SPECIES[d.sp].name+' → khu '+(DR_ELNAME[target.el]||target.el)+(target.el===el?' (đúng hệ ×1.5)':''));
}
function drUnassign(idx){
  const d=drState.dragons[idx]; if(!d||!d.hab) return;
  const h=drHabById(d.hab); if(h) drSettleHab(h);
  d.hab=null; drSave(); drShowHabitats();
}
function drHabTickUI(){                                             // cập nhật số vàng tích mỗi giây cho "sống"
  drHabs().forEach(h=>{
    const cap=Math.max(1,drHabCap(h)), st=drHabStored(h);
    const bar=$('drHabBar'+h.id), val=$('drHabVal'+h.id), btn=$('drHabCol'+h.id);
    if(bar) bar.style.width=Math.min(100,Math.round(st/cap*100))+'%';
    if(val) val.textContent=fmtCoin(st)+' / '+fmtCoin(cap);
    if(btn){ btn.disabled=(st<=0); btn.textContent='Thu '+fmtCoin(st)+' 🪙'; }
  });
  drUpdateHabDot();
}
function drShowHabitats(){
  clearInterval(drHabTimer);
  const els=Object.keys(DR_ELNAME);
  const cards=drHabs().map(h=>{
    const color=(DR_PAL[h.el]||{}).body||'#8fe0ff';
    const drgs=drHabDragons(h.id);
    const rate=Math.round(drHabRateHr(h)), cap=Math.max(1,drHabCap(h)), st=drHabStored(h);
    const chips=drgs.map(o=>{ const match=DR_SPECIES[o.d.sp].el===h.el;
      return `<button class="dr-hab-drg" data-un="${o.i}" title="Gỡ khỏi khu">${drDragonArt(o.d)}<span class="dr-hab-lv">Lv${o.d.lv}${match?' ⚡':''}</span></button>`; }).join('');
    const empties=Array.from({length:Math.max(0,DR_HAB_SLOTS-drgs.length)},()=>'<span class="dr-hab-empty">＋</span>').join('');
    return `<div class="dr-hab" style="--hc:${color}">
      <div class="dr-hab-top"><b>🏝️ Khu ${DR_ELNAME[h.el]||h.el}</b><span class="dr-hab-rate">${fmtCoin(rate)} 🪙/giờ</span></div>
      <div class="dr-hab-slots">${chips}${empties}</div>
      <div class="dr-feedbar"><i id="drHabBar${h.id}" style="width:${Math.min(100,Math.round(st/cap*100))}%"></i><em id="drHabVal${h.id}">${fmtCoin(st)} / ${fmtCoin(cap)}</em></div>
      <button class="dr-btn alt block" id="drHabCol${h.id}" data-col="${h.id}" ${st<=0?'disabled':''}>Thu ${fmtCoin(st)} 🪙</button>
    </div>`;
  }).join('');
  const pool=drState.dragons.map((d,i)=>({d,i})).filter(o=>!o.d.hab);
  const poolHtml=pool.length
    ? pool.map(o=>`<button class="dr-hab-drg" data-as="${o.i}" title="Xếp vào khu">${drDragonArt(o.d)}<span class="dr-hab-lv">Lv${o.d.lv}</span></button>`).join('')
    : '<span class="dr-muted">Tất cả rồng đã được xếp vào khu 👍</span>';
  const canBuild=drHabs().length<DR_HAB_MAX, cost=drHabCost();
  const buildHtml=canBuild
    ? `<div class="dr-hab-build"><div class="dr-hab-buildhead">🏝️ Xây khu mới — <b>${fmtCoin(cost)} 🪙</b> · chọn hệ:</div>
        <div class="dr-hab-els">${els.map(el=>`<button class="dr-hab-elbtn" data-el="${el}" style="--hc:${(DR_PAL[el]||{}).body}">${DR_ELNAME[el]}</button>`).join('')}</div></div>`
    : `<div class="dr-muted" style="text-align:center; padding:6px">Đã đạt tối đa ${DR_HAB_MAX} khu 🏝️</div>`;
  const body=`<p class="dr-hab-intro">Xếp rồng vào khu <b>đúng hệ</b> để sinh vàng <b>×1.5</b>. Vàng tự tích theo thời gian (trần ${DR_HAB_STORE_HRS} giờ) — quay lại bấm <b>Thu</b>.</p>
    <div id="drHabList">${cards}</div>
    <div class="dr-hab-pool"><div class="dr-hab-poolhead">Rồng chưa xếp — chạm để xếp (ưu tiên đúng hệ):</div><div class="dr-hab-poolist">${poolHtml}</div></div>
    ${buildHtml}`;
  const bd=drModal('🏝️ Khu đảo theo hệ', body, true);
  bd.addEventListener('click',e=>{
    const un=e.target.closest('[data-un]'); if(un){ drUnassign(+un.dataset.un); return; }
    const as=e.target.closest('[data-as]'); if(as){ drAssignAuto(+as.dataset.as); return; }
    const col=e.target.closest('[data-col]'); if(col){ drCollectHab(+col.dataset.col); return; }
    const eb=e.target.closest('[data-el]'); if(eb){ drBuildHab(eb.dataset.el); return; }
  });
  drHabTimer=setInterval(()=>{ if(!$('drHabList')){ clearInterval(drHabTimer); return; } drHabTickUI(); },1000);
}

/* ================= CỤM TÍNH NĂNG MỞ RỘNG =================
   Nông trại · Điểm danh · Thành tựu · Phiêu lưu (PvE) · BXH · Boss tuần.
   Tất cả tái dùng drPower/drStar/drHabs/drAddXp/drModal; mốc thời gian dùng drNow() (giờ máy chủ). */
let drFeatTimer=null;
function drReward(r){ if(!r) return; if(r.gold){drState.gold+=r.gold;} if(r.gems){drState.gems+=r.gems;} if(r.food){drState.food+=r.food;} if(r.xp){drAddXp(r.xp);} }
function drRewardText(r){ const p=[]; if(r&&r.gold)p.push(fmtCoin(r.gold)+' 🪙'); if(r&&r.gems)p.push(r.gems+' 💎'); if(r&&r.food)p.push(r.food+' 🍖'); return p.join(' · ')||'—'; }
function drTeamPower(){ return drState.dragons.map(drPower).sort((a,b)=>b-a).slice(0,3).reduce((a,b)=>a+b,0); }
function drFmtSec(s){ const m=Math.floor(s/60), ss=s%60; return m>0?(m+'p'+(ss<10?'0':'')+ss+'s'):(ss+'s'); }
function drDayNum(){ return Math.floor(drNow()/86400000); }
function drDockBadge(act){ const m={quest:'drQuestDot',mail:'drMailDot',habitat:'drHabDot',daily:'drDailyDot',boss:'drBossDot',ach:'drAchDot',farm:'drFarmDot'}; return m[act]?`<span class="dr-dock-badge" id="${m[act]}" hidden></span>`:''; }
function drSetDot(id,n){ const el=$(id); if(el){ el.textContent=n; el.hidden=(n<=0); } }
function drUpdateFeatureDots(){
  if(!drState) return;
  drSetDot('drDailyDot', drCanDaily()?1:0);
  drSetDot('drFarmDot', (drState.farm||[]).filter(t=>drFarmReady(t)).length);
  drSetDot('drAchDot', DR_ACH.filter(a=>a.chk()&&!(drState.achClaimed||[]).includes(a.id)).length);
  drSetDot('drBossDot', drBossClaimable());
  if(typeof drRenderDecor==='function') drRenderDecor();
}

/* ---- Nông trại: gieo bằng vàng -> chờ chín -> thu thức ăn ---- */
const DR_FARM_PLOTS=3, DR_FARM_COST=200, DR_FARM_YIELD=45, DR_FARM_MS=300000;   // 200🪙 -> 45🍖 sau 5 phút
function drFarmReady(t){ return t>0 && (drNow()-t)>=DR_FARM_MS; }
function drPlant(i){ if(drState.farm[i]) return; if(drState.gold<DR_FARM_COST){ toast('Thiếu vàng (cần '+DR_FARM_COST+' 🪙)'); return; }
  drState.gold-=DR_FARM_COST; drState.farm[i]=drNow(); drRenderHud(); drSave(); drShowFarm(); toast('🌱 Đã gieo hạt'); }
function drHarvest(i){ if(!drFarmReady(drState.farm[i])) return; drState.food+=DR_FARM_YIELD; drState.farm[i]=0;
  drBump('drFood'); drRenderHud(); drSave(); drShowFarm(); toast('🌾 Thu +'+DR_FARM_YIELD+' 🍖'); }
function drFarmTickUI(){ (drState.farm||[]).forEach((t,i)=>{ if(!t) return; const lab=$('drPlotLab'+i); if(!lab) return;
  const left=Math.max(0,Math.ceil((DR_FARM_MS-(drNow()-t))/1000)); lab.textContent='⏳ '+drFmtSec(left); }); drUpdateFeatureDots(); }
function drShowFarm(){
  clearInterval(drFeatTimer);
  const plots=(drState.farm||[]).map((t,i)=>{
    const st=!t?'empty':(drFarmReady(t)?'ready':'grow');
    const left=t?Math.max(0,Math.ceil((DR_FARM_MS-(drNow()-t))/1000)):0;
    const inner = st==='empty'
      ? `<div class="dr-plot-ic">🟫</div><button class="dr-btn sm" data-plant="${i}">🌱 Gieo · ${DR_FARM_COST}🪙</button>`
      : st==='ready'
        ? `<div class="dr-plot-ic ripe">🌾</div><button class="dr-btn alt sm" data-harv="${i}">✅ Thu +${DR_FARM_YIELD}🍖</button>`
        : `<div class="dr-plot-ic">🌱</div><div class="dr-plot-lab" id="drPlotLab${i}">⏳ ${drFmtSec(left)}</div>`;
    return `<div class="dr-plot ${st}" id="drPlot${i}">${inner}</div>`;
  }).join('');
  const body=`<p class="dr-hab-intro">Gieo hạt bằng <b>vàng</b>, chờ chín rồi thu <b>🍖 thức ăn</b> để nuôi rồng. Mỗi ô ${DR_FARM_MS/60000} phút.</p>
    <div class="dr-farm-grid">${plots}</div>`;
  const bd=drModal('🌾 Nông trại', body, true);
  bd.addEventListener('click',e=>{ const p=e.target.closest('[data-plant]'); if(p){ drPlant(+p.dataset.plant); return; }
    const h=e.target.closest('[data-harv]'); if(h){ drHarvest(+h.dataset.harv); return; } });
  drFeatTimer=setInterval(()=>{ if(!document.querySelector('.dr-farm-grid')){ clearInterval(drFeatTimer); return; }
    if((drState.farm||[]).some((t,i)=>t&&drFarmReady(t)&&$('drPlotLab'+i))){ drShowFarm(); } else { drFarmTickUI(); } },1000);
}

/* ---- Điểm danh: chuỗi 7 ngày, thưởng tăng dần ---- */
const DR_DAILY=[{gold:200},{gold:300},{food:35},{gems:2},{gold:700},{food:60},{gems:6}];
function drCanDaily(){ return (drState.daily?drState.daily.day:0) < drDayNum(); }
function drClaimDaily(){
  if(!drCanDaily()){ toast('Hôm nay đã điểm danh rồi 📅'); return; }
  const today=drDayNum(), cont=(drState.daily.day===today-1);
  drState.daily.streak = cont ? (drState.daily.streak+1) : 1;
  drState.daily.day = today;
  const r=DR_DAILY[(drState.daily.streak-1)%7];
  drReward(r); if(typeof confetti==='function') confetti();
  drRenderHud(); drSave(); drShowDaily();
  toast('📅 Điểm danh ngày '+drState.daily.streak+': +'+drRewardText(r));
}
function drShowDaily(){
  const streak=drState.daily?drState.daily.streak:0;
  const nextPos=drCanDaily()?((drState.daily&&drState.daily.day===drDayNum()-1?streak:0)%7):-1;
  const days=DR_DAILY.map((r,i)=>{
    const got = !drCanDaily() && ((streak-1)%7)===i;
    const isNext = i===nextPos;
    return `<div class="dr-day ${got?'got':''} ${isNext?'next':''}">
      <span class="dr-day-n">Ngày ${i+1}</span><span class="dr-day-r">${drRewardText(r)}</span>${got?'<span class="dr-day-tick">✓</span>':''}</div>`;
  }).join('');
  const body=`<p class="dr-hab-intro">Điểm danh mỗi ngày, thưởng tăng dần. Chuỗi hiện tại: <b>${streak} ngày</b>. Bỏ lỡ 1 ngày sẽ về mốc 1.</p>
    <div class="dr-daily-grid">${days}</div>
    <button class="dr-btn alt block" id="drDailyBtn" ${drCanDaily()?'':'disabled'}>${drCanDaily()?'📅 Nhận thưởng hôm nay':'✅ Mai quay lại nhé'}</button>`;
  drModal('📅 Điểm danh', body, true);
  const b=$('drDailyBtn'); if(b) b.onclick=drClaimDaily;
}

/* ---- Thành tựu: mốc dài hạn, nhận 1 lần ---- */
const DR_ACH=[
  {id:'lv5',   ic:'⭐', name:'Đảo phồn vinh',    desc:'Đạt cấp đảo 5',        chk:()=>(drState.level||1)>=5,                                    r:{gold:1000,gems:5}},
  {id:'sp6',   ic:'📖', name:'Nhà sưu tầm',      desc:'Sở hữu 6 loài rồng',    chk:()=>new Set(drState.dragons.map(d=>d.sp)).size>=6,             r:{gems:10}},
  {id:'lv10',  ic:'🐲', name:'Rồng trưởng thành',desc:'Nuôi 1 rồng đạt Lv10',  chk:()=>drState.dragons.some(d=>(d.lv||1)>=10),                    r:{gold:2000,gems:6}},
  {id:'star5', ic:'🌟', name:'Ngũ tinh',         desc:'1 rồng đạt 5★',         chk:()=>drState.dragons.some(d=>drStar(d)>=5),                     r:{gems:12}},
  {id:'hab6',  ic:'🏝️', name:'Bá chủ quần đảo',  desc:'Xây đủ 6 khu đảo',      chk:()=>drHabs().length>=6,                                       r:{gems:15}},
  {id:'gold50',ic:'💰', name:'Phú hộ',           desc:'Sở hữu 50.000 vàng',    chk:()=>drState.gold>=50000,                                      r:{gems:8}},
  {id:'adv5',  ic:'🗺️', name:'Thám hiểm gia',    desc:'Vượt 5 màn Phiêu lưu',  chk:()=>(drState.adv||0)>=5,                                      r:{gold:2500,gems:5}},
  {id:'bossk', ic:'👹', name:'Diệt Boss',        desc:'Đạt mốc 100% Boss tuần',chk:()=>!!(drState.boss&&(drState.boss.claimed||[]).includes(100)),r:{gems:20}},
];
function drAchClaimable(a){ return a.chk() && !(drState.achClaimed||[]).includes(a.id); }
function drClaimAch(id){ const a=DR_ACH.find(x=>x.id===id); if(!a||!drAchClaimable(a)) return;
  drState.achClaimed.push(id); drReward(a.r); if(typeof confetti==='function') confetti();
  drRenderHud(); drSave(); drShowAch(); toast('🏆 '+a.name+': +'+drRewardText(a.r)); }
function drShowAch(){
  const rows=DR_ACH.map(a=>{ const done=a.chk(), claimed=(drState.achClaimed||[]).includes(a.id);
    return `<div class="dr-ach ${claimed?'claimed':(done?'done':'')}">
      <span class="dr-ach-ic">${a.ic}</span>
      <div class="dr-ach-mid"><b>${a.name}</b><small>${a.desc}</small><span class="dr-ach-rw">${drRewardText(a.r)}</span></div>
      ${claimed?'<span class="dr-ach-ok">✓</span>':(done?`<button class="dr-btn sm" data-ach="${a.id}">Nhận</button>`:'<span class="dr-ach-lock">🔒</span>')}</div>`;
  }).join('');
  const bd=drModal('🏆 Thành tựu', `<div class="dr-ach-list">${rows}</div>`, true);
  bd.addEventListener('click',e=>{ const b=e.target.closest('[data-ach]'); if(b) drClaimAch(b.dataset.ach); });
}

/* ---- Phiêu lưu: bản đồ PvE tuyến tính, so lực đội ---- */
const DR_ADV_STAGES=[
  {name:'Bãi Biển Vắng', power:120,  r:{gold:500,food:20}},
  {name:'Rừng Rậm',      power:320,  r:{gold:900,gems:2}},
  {name:'Hang Băng Giá', power:650,  r:{gold:1500,food:40}},
  {name:'Núi Lửa',       power:1100, r:{gold:2500,gems:4}},
  {name:'Đầm Lầy Độc',   power:1700, r:{gold:3500,gems:5}},
  {name:'Vực Bóng Tối',  power:2600, r:{gold:5000,gems:8}},
  {name:'Đỉnh Thần Long',power:4200, r:{gold:9000,gems:15}},
];
function drFightStage(i){
  if(i!==(drState.adv||0)) return;
  const s=DR_ADV_STAGES[i], tp=drTeamPower();
  if(tp>=s.power){ drState.adv=i+1; drReward(s.r); if(typeof confetti==='function') confetti();
    drRenderHud(); drSave(); drShowAdventure(); toast('🏆 Vượt "'+s.name+'"! +'+drRewardText(s.r));
  } else { toast('💪 Chưa đủ mạnh — lực đội '+fmtCoin(tp)+'/'+fmtCoin(s.power)+'. Nuôi & nâng sao rồng thêm!'); }
}
function drShowAdventure(){
  const cleared=drState.adv||0, tp=drTeamPower();
  const rows=DR_ADV_STAGES.map((s,i)=>{
    const state = i<cleared?'done':(i===cleared?'now':'lock');
    const btn = state==='done'?'<span class="dr-adv-ok">✓ Đã qua</span>'
      : state==='now'?`<button class="dr-btn alt sm" data-adv="${i}">⚔️ Đánh</button>`
      : '<span class="dr-ach-lock">🔒</span>';
    return `<div class="dr-adv ${state}"><span class="dr-adv-n">${i+1}</span>
      <div class="dr-ach-mid"><b>${s.name}</b><small>Địch: ${fmtCoin(s.power)} lực · Thưởng ${drRewardText(s.r)}</small></div>${btn}</div>`;
  }).join('');
  const body=`<p class="dr-hab-intro">Dắt đội rồng đi chinh phục. Lực đội = 3 rồng mạnh nhất: <b>${fmtCoin(tp)}</b> 💪. Thắng khi lực đội ≥ lực địch.</p>
    <div class="dr-adv-list">${rows}</div>`;
  const bd=drModal('🗺️ Phiêu lưu', body, true);
  bd.addEventListener('click',e=>{ const b=e.target.closest('[data-adv]'); if(b) drFightStage(+b.dataset.adv); });
}

/* ---- BXH: đăng lực đội lên Firebase, đọc top 30 ---- */
function drPlayerName(){ try{ const u=auth&&auth.currentUser; if(u) return u.displayName||(u.email?u.email.split('@')[0]:'Người chơi'); }catch(_){} return 'Người chơi'; }
function drPublishLb(){ try{ if(!(auth&&auth.currentUser&&db)) return;
  db.ref('leaderboard/'+auth.currentUser.uid).set({name:drPlayerName().slice(0,24), power:drTeamPower(), lvl:drState.level||1, at:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});
}catch(_){}}
function drShowLeaderboard(){
  drPublishLb();
  drModal('👑 Bảng xếp hạng', '<div class="dr-lb-list" id="drLbList"><p class="dr-muted">Đang tải…</p></div>', true);
  if(!(auth&&auth.currentUser&&db)){ const l=$('drLbList'); if(l) l.innerHTML='<p class="dr-muted">Cần đăng nhập online để xem BXH.</p>'; return; }
  const myUid=auth.currentUser.uid;
  db.ref('leaderboard').orderByChild('power').limitToLast(30).get().then(snap=>{
    const arr=[]; snap.forEach(c=>{ const v=c.val()||{}; arr.push({uid:c.key, name:v.name||'Người chơi', power:v.power||0, lvl:v.lvl||1}); });
    arr.sort((a,b)=>b.power-a.power);
    const list=$('drLbList'); if(!list) return;
    if(!arr.length){ list.innerHTML='<p class="dr-muted">Chưa có ai trên BXH. Bạn là người đầu tiên!</p>'; return; }
    const myRank=arr.findIndex(x=>x.uid===myUid)+1;
    list.innerHTML=arr.map((x,i)=>`<div class="dr-lb-row ${x.uid===myUid?'me':''}">
      <span class="dr-lb-rank ${i<3?'top':''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':('#'+(i+1))}</span>
      <b class="dr-lb-name">${esc(x.name)}</b><span class="dr-lb-lv">Cấp ${x.lvl}</span><span class="dr-lb-pw">${fmtCoin(x.power)} 💪</span></div>`).join('')
      + (myRank>0?`<p class="dr-muted" style="text-align:center;margin-top:8px">Hạng của bạn: <b>#${myRank}</b></p>`:'');
  }).catch(()=>{ const list=$('drLbList'); if(list) list.innerHTML='<p class="dr-muted">Chưa bật luật BXH trên Firebase (thêm node "leaderboard" cho phép đọc/ghi). BXH sẽ chạy khi có luật.</p>'; });
}

/* ---- Boss tuần: cả đội tấn công, mốc % nhận thưởng, reset mỗi tuần ---- */
const DR_BOSS_HP=80000, DR_BOSS_HITS=6;   // 6 đòn/ngày
const DR_BOSS_MILE=[{p:25,r:{gold:1500}},{p:50,r:{gems:5}},{p:75,r:{food:60}},{p:100,r:{gems:20,gold:5000}}];
const DR_BOSS_NAME=['Hải Xà Khổng Lồ','Rồng Dung Nham','Titan Băng Giá','Ác Long Bóng Tối'];
function drBossWeek(){ return Math.floor(drNow()/604800000); }
function drBossSync(){ const b=drState.boss; const w=drBossWeek(), today=drDayNum();
  if(b.week!==w){ b.week=w; b.dmg=0; b.claimed=[]; b.hits=0; b.day=today; }
  if(b.day!==today){ b.day=today; b.hits=0; } return b; }
function drBossPct(){ const b=drState.boss; return b?Math.min(100,Math.floor(b.dmg/DR_BOSS_HP*100)):0; }
function drBossClaimable(){ if(!drState.boss) return 0; const pct=drBossPct(); const c=drState.boss.claimed||[];
  return DR_BOSS_MILE.filter(m=>pct>=m.p && !c.includes(m.p)).length; }
function drHitBoss(){ const b=drBossSync(); if(b.hits>=DR_BOSS_HITS){ toast('Hết lượt đánh hôm nay — mai quay lại 👹'); return; }
  const dmg=drTeamPower(); b.dmg+=dmg; b.hits++; drAddXp(3); drSave(); drShowBoss(); toast('⚔️ Gây '+fmtCoin(dmg)+' sát thương!'); }
function drClaimBossMile(p){ const b=drBossSync(); const m=DR_BOSS_MILE.find(x=>x.p===p); if(!m) return;
  if(drBossPct()<p||(b.claimed||[]).includes(p)) return;
  b.claimed.push(p); drReward(m.r); if(typeof confetti==='function') confetti();
  drRenderHud(); drSave(); drShowBoss(); toast('👹 Mốc '+p+'%: +'+drRewardText(m.r)); }
function drShowBoss(){
  const b=drBossSync(); const name=DR_BOSS_NAME[b.week%DR_BOSS_NAME.length]; const pct=drBossPct();
  const miles=DR_BOSS_MILE.map(m=>{ const reached=pct>=m.p, got=(b.claimed||[]).includes(m.p);
    return `<div class="dr-boss-mile"><span class="dr-boss-p">${m.p}%</span><span class="dr-ach-rw">${drRewardText(m.r)}</span>
      ${got?'<span class="dr-ach-ok">✓</span>':(reached?`<button class="dr-btn sm" data-mile="${m.p}">Nhận</button>`:'<span class="dr-ach-lock">🔒</span>')}</div>`;
  }).join('');
  const body=`<p class="dr-hab-intro">Boss tuần: <b>${name}</b> 👹. Cả đội tấn công, đạt các mốc % để nhận thưởng. Boss mới mỗi tuần.</p>
    <div class="dr-feedbar big"><i style="width:${pct}%"></i><em>${fmtCoin(b.dmg)} / ${fmtCoin(DR_BOSS_HP)} (${pct}%)</em></div>
    <button class="dr-btn alt block" id="drBossHit" ${b.hits>=DR_BOSS_HITS?'disabled':''}>⚔️ Tấn công · còn ${Math.max(0,DR_BOSS_HITS-b.hits)} lượt (lực ${fmtCoin(drTeamPower())})</button>
    <div class="dr-boss-miles">${miles}</div>`;
  const bd=drModal('👹 Boss Tuần', body, true);
  const h=$('drBossHit'); if(h) h.onclick=drHitBoss;
  bd.addEventListener('click',e=>{ const m=e.target.closest('[data-mile]'); if(m) drClaimBossMile(+m.dataset.mile); });
}

/* ================= TRANG TRÍ ĐẢO =================
   Mua vật trang trí bằng vàng/💎 -> hiện lên đảo (vị trí cố định ở rìa, không đè rồng).
   Một số vật cho buff % vàng khi chạm (cộng dồn). Render qua lớp #drDecor tạo động (không đụng drBuild). */
const DR_DECOR=[
  {id:'flowers', ic:'🌷', name:'Vườn hoa',       gold:600,   x:92, y:30},
  {id:'torch',   ic:'🔥', name:'Đuốc đá',        gold:1200,  x:8,  y:30},
  {id:'tree',    ic:'🌳', name:'Cây cổ thụ',     gold:1800,  x:92, y:80},
  {id:'fountain',ic:'⛲', name:'Đài phun nước',   gold:3000,  x:8,  y:82, buff:{gold:0.05}},
  {id:'statue',  ic:'🗿', name:'Tượng cổ',        gold:6000,  x:50, y:86, buff:{gold:0.08}},
  {id:'lantern', ic:'🏮', name:'Đèn lồng',        gems:8,     x:92, y:14},
  {id:'crystal', ic:'💠', name:'Pha lê thần',     gems:16,    x:8,  y:14, buff:{gold:0.1}},
  {id:'rainbow', ic:'🌈', name:'Cầu vồng',        gems:26,    x:50, y:9},
];
function drDecorMult(){
  if(!drState||!Array.isArray(drState.decos)) return 1;
  return 1 + drState.decos.reduce((m,id)=>{ const d=DR_DECOR.find(x=>x.id===id); return m + ((d&&d.buff&&d.buff.gold)||0); },0);
}
function drRenderDecor(){
  if(!drState) return;
  const island=$('drIsland'); if(!island) return;
  let layer=$('drDecor');
  if(!layer){ layer=document.createElement('div'); layer.id='drDecor'; layer.className='dr-decor'; island.appendChild(layer); }
  const owned=Array.isArray(drState.decos)?drState.decos:[]; const sig=owned.join(',');
  if(layer.dataset.sig===sig) return;                    // không đổi -> khỏi vẽ lại
  layer.dataset.sig=sig;
  layer.innerHTML=owned.map(id=>{ const d=DR_DECOR.find(x=>x.id===id); if(!d) return '';
    return `<span class="dr-decor-item" style="left:${d.x}%; top:${d.y}%" title="${d.name}">${d.ic}</span>`; }).join('');
}
function drBuyDecor(id){
  const d=DR_DECOR.find(x=>x.id===id); if(!d) return;
  if((drState.decos||[]).includes(id)) return;
  if(d.gold&&drState.gold<d.gold){ toast('Thiếu vàng (cần '+fmtCoin(d.gold)+' 🪙)'); return; }
  if(d.gems&&drState.gems<d.gems){ toast('Thiếu 💎 (cần '+d.gems+')'); return; }
  if(d.gold) drState.gold-=d.gold; if(d.gems) drState.gems-=d.gems;
  drState.decos.push(id); drAddXp(10);
  if(typeof confetti==='function') confetti();
  drRenderHud(); drRenderDecor(); drSave(); drShowDecor();
  toast('🌴 Đã đặt '+d.name+' lên đảo!');
}
function drShowDecor(){
  const owned=drState.decos||[];
  const rows=DR_DECOR.map(d=>{ const has=owned.includes(d.id);
    const cost = d.gold?(fmtCoin(d.gold)+' 🪙'):(d.gems?(d.gems+' 💎'):'—');
    const note = d.buff&&d.buff.gold ? ('⚡ +'+Math.round(d.buff.gold*100)+'% vàng chạm') : 'Trang trí đảo';
    return `<div class="dr-decor-card ${has?'owned':''}">
      <span class="dr-decor-ic">${d.ic}</span>
      <div class="dr-ach-mid"><b>${d.name}</b><small>${note}</small></div>
      ${has?'<span class="dr-ach-ok">✓ Đã có</span>':`<button class="dr-btn sm" data-decor="${d.id}">${cost}</button>`}</div>`;
  }).join('');
  const buffPct=Math.round((drDecorMult()-1)*100);
  const body=`<p class="dr-hab-intro">Mua vật trang trí làm đẹp đảo. Một số cho <b>thưởng vàng khi chạm</b>.${buffPct>0?` Hiện đang +<b>${buffPct}%</b> vàng.`:''}</p>
    <div class="dr-decor-list">${rows}</div>`;
  const bd=drModal('🌴 Trang trí đảo', body, true);
  bd.addEventListener('click',e=>{ const b=e.target.closest('[data-decor]'); if(b) drBuyDecor(b.dataset.decor); });
}

/* Xác suất lai (dùng trọng số 2^bậc-hiếm) để hiện trong UI + tính kết quả */
function drBreedOdds(elA,elB){
  const key=[elA,elB].sort().join('+'); const pool=DR_BREED[key];
  if(!pool) return null;
  const wts=pool.map(sp=>Math.pow(2,drRarRank(sp))); const tot=wts.reduce((a,b)=>a+b,0);
  const map={}; pool.forEach((sp,i)=>{ map[sp]=(map[sp]||0)+wts[i]; });
  return Object.keys(map).map(sp=>({sp, pct:Math.round(map[sp]/tot*100)})).sort((a,b)=>b.pct-a.pct);
}
