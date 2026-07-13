/* =========================================================================
   ĐẢO RỒNG — game nuôi/lai rồng, gắn tài khoản (users/<uid>/daorong).
   Đầy đủ màn: Đảo · Chi tiết rồng (cho ăn/bán) · Lai rồng · Sách rồng ·
   Đấu trường · Shop/Thức ăn · cấp người chơi + XP. Vẽ bằng CSS/SVG.
   File CHỈ khai báo; mọi wiring nằm trong hàm (không chạy code top-level).
   ========================================================================= */
let drState=null, drActive=false, drBuilt=false, drReduce=false, drLite=false;
let drSaveT=null, drCoinTimer=null, drTick=null, drServerOffset=0, drBreedTimer=null;
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
// Ảnh icon động (roles/status/ranks/events/runes...) — cỡ theo font (1.15em); lỗi thì thay bằng emoji dự phòng.
function drAsset(path, emoji, cls){
  const e=(emoji||'').replace(/'/g,"\\'");
  return `<img class="dr-aset ${cls||''}" src="${path}" alt="" draggable="false" onerror="this.replaceWith(document.createTextNode('${e}'))">`;
}
// Hiệu ứng "juice" 1 lần: phủ ảnh động (effects/ui/animated/*.webp) lên 1 phần tử (hoặc giữa màn).
// name: level-up · victory · egg-hatch · reward-burst · coin-collect · gem-collect · critical-hit · heal · shield · unlock
function drFx(name, target, size){
  try{
    if(drReduce){ return; }                                            // tôn trọng "giảm chuyển động"
    let cx, cy, sz=size;
    if(target && target.getBoundingClientRect){ const r=target.getBoundingClientRect();
      if(!r.width && !r.height) return; cx=r.left+r.width/2; cy=r.top+r.height/2; sz=sz||Math.max(80,Math.min(190, r.width*1.7)); }
    else { cx=innerWidth/2; cy=innerHeight*0.42; sz=sz||Math.min(220, innerWidth*0.5); }
    const img=new Image(); img.src='assets/dragon-island/effects/ui/animated/'+name+'.webp'; img.alt=''; img.draggable=false;
    img.style.cssText=`position:fixed; left:${cx}px; top:${cy}px; width:${sz}px; height:${sz}px; transform:translate(-50%,-50%);`
      +`z-index:80; pointer-events:none; animation:drUifxPop .32s ease-out;`;
    img.onerror=()=>img.remove();
    document.body.appendChild(img);
    setTimeout(()=>{ img.style.transition='opacity .28s'; img.style.opacity='0'; setTimeout(()=>img.remove(),300); }, 820);
  }catch(_){}
}
// Nền ĐẢO riêng theo hình bạn cấp (island-01..20) + vòng HÀO QUANG động theo bậc (tier-01..05, 4 đảo/bậc).
function drRenderIsleScene(isle){
  const app=$('drApp');
  if(app){ const n=String(Math.min(DR_ISLAND_MAX, (isle|0)+1)).padStart(2,'0');
    app.classList.add('dr-real-isles');
    app.style.backgroundImage=`url('assets/dragon-island/islands/island-${n}.webp')`; }
  // (Vòng hào quang tier bỏ đi — hình đảo đã đủ lộng lẫy, thêm vòng xoay giữa màn gây rối tâm điểm.)
}
// Loài rồng lần đầu sở hữu -> báo "mở khoá" (icon unlocked). Cập nhật drState.seen để không lặp.
function drNewSp(sp){
  if(!DR_SPECIES[sp]) return false;
  drState.seen=drState.seen||[];
  if(drState.seen.indexOf(sp)>=0) return false;
  drState.seen.push(sp);
  drNotify('unlocked','Mở khoá loài mới: '+DR_SPECIES[sp].name+'!');
  return true;
}
// Băng thông báo trượt từ trên xuống, icon huy hiệu 256² (ui-kit/notifications). type: achievement·reward·mail·unlocked·success·warning·info·error·level-up
function drNotify(type, msg){
  try{
    const el=document.createElement('div'); el.className='dr-notif';
    el.innerHTML=`<img src="assets/dragon-island/ui-kit/notifications/${type}.webp" alt="" draggable="false" onerror="this.remove()"><span>${esc(msg)}</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(()=>el.classList.add('in'));
    setTimeout(()=>{ el.classList.remove('in'); setTimeout(()=>el.remove(),380); }, 2500);
  }catch(_){}
}
// Thẻ "khoe" toàn màn: khung rồng (ui-kit/popups) + nội dung ở giữa. kind: legendary·crystal·common·warning
function drRevealCard(kind, innerHTML){
  try{
    const ov=document.createElement('div'); ov.className='dr-reveal';
    ov.innerHTML=`<div class="dr-reveal-card dr-reveal-${kind}" style="background-image:url('assets/dragon-island/ui-kit/popups/${kind}.webp')"><div class="dr-reveal-in">${innerHTML}</div></div>`;
    const close=()=>{ if(!ov.isConnected) return; ov.classList.remove('in'); setTimeout(()=>ov.remove(),260); };
    ov.onclick=close; document.body.appendChild(ov); requestAnimationFrame(()=>ov.classList.add('in'));
    setTimeout(close, 4600);
  }catch(_){}
}
const DR_FEATURE_ICON_ROOT='assets/dragon-island/ui/';
const DR_FEATURE_UI={
  habitat:    {icon:'habitat.webp',    color:'#45c9b1', soft:'rgba(69,201,177,.22)', sub:'Xây lãnh địa nguyên tố'},
  farm:       {icon:'farm.webp',       color:'#8ed153', soft:'rgba(142,209,83,.22)', sub:'Gieo thức ăn cho đàn rồng'},
  adventure:  {icon:'adventure.webp',  color:'#55bce9', soft:'rgba(85,188,233,.22)', sub:'Chinh phục bản đồ và kho báu'},
  boss:       {icon:'boss.webp',       color:'#f26455', soft:'rgba(242,100,85,.23)', sub:'Đánh bại quái thú tuần'},
  daily:      {icon:'daily.webp',      color:'#ffb64c', soft:'rgba(255,182,76,.22)', sub:'Chuỗi quà đăng nhập 7 ngày'},
  achievement:{icon:'achievement.webp',color:'#f4c64f', soft:'rgba(244,198,79,.22)', sub:'Vinh danh người nuôi rồng'},
  leaderboard:{icon:'leaderboard.webp',color:'#ffd65c', soft:'rgba(255,214,92,.22)', sub:'So tài lực chiến toàn máy chủ'},
  friends:    {icon:'friends.webp',    color:'#67d6cf', soft:'rgba(103,214,207,.22)', sub:'Kết bạn và trao quà mỗi ngày'},
  tower:      {icon:'tower.webp',      color:'#e5aa4f', soft:'rgba(229,170,79,.22)', sub:'Leo tầng tháp thử thách đội rồng'},
  event:      {icon:'event.webp',      color:'#f48b63', soft:'rgba(244,139,99,.22)', sub:'Sự kiện giới hạn và quà đặc biệt'},
  runes:      {icon:'runes.webp',      color:'#9b7af2', soft:'rgba(155,122,242,.22)', sub:'Khảm đá tăng sức mạnh cho rồng'},
  ranked:     {icon:'ranked.webp',     color:'#e85e52', soft:'rgba(232,94,82,.22)', sub:'Leo hạng bằng đội hình mạnh nhất'},
  rebirth:    {icon:'rebirth.webp',    color:'#f3a04c', soft:'rgba(243,160,76,.22)', sub:'Tái sinh để nhận sức mạnh vĩnh viễn'},
  decor:      {icon:'decor.webp',      color:'#63cf79', soft:'rgba(99,207,121,.22)', sub:'Tạo lãnh địa mang dấu ấn riêng'},
  shop:       {icon:'shop.webp',       color:'#51c7e8', soft:'rgba(81,199,232,.22)', sub:'Vật phẩm và tài nguyên quý'},
  quest:      {icon:'quest.webp',      color:'#ef9f4b', soft:'rgba(239,159,75,.22)', sub:'Hoàn thành mục tiêu nhận thưởng'},
  wheel:      {icon:'wheel.webp',      color:'#d17bea', soft:'rgba(209,123,234,.22)', sub:'Thử vận may mỗi ngày'},
  forge:      {icon:'forge.webp',      color:'#ff8550', soft:'rgba(255,133,80,.22)', sub:'Rèn bùa tăng sức mạnh toàn đảo'},
  breed:      {icon:'breed.webp',      color:'#ff7ea6', soft:'rgba(255,126,166,.22)', sub:'Kết hợp huyết thống tạo rồng mới'},
  feed:       {icon:'feed.webp',       color:'#f0a65b', soft:'rgba(240,166,91,.22)', sub:'Nuôi dưỡng và thúc đẩy tiến hoá'},
  arena:      {icon:'arena.webp',      color:'#6da7ee', soft:'rgba(109,167,238,.22)', sub:'Đưa đội rồng bước vào trận chiến'},
  codex:      {icon:'codex.webp',      color:'#a987ed', soft:'rgba(169,135,237,.22)', sub:'Khám phá bộ sưu tập loài rồng'},
  mail:       {icon:'mail.webp',       color:'#ef6d62', soft:'rgba(239,109,98,.22)', sub:'Quà tặng và thông báo mới'},
  tower:      {icon:'tower.webp',      color:'#c89bf0', soft:'rgba(200,155,240,.22)', sub:'Leo tháp vô tận mỗi ngày'},
  rebirth:    {icon:'rebirth.webp',    color:'#ffb84d', soft:'rgba(255,184,77,.22)', sub:'Chuyển Sinh nhận Linh Khí vĩnh viễn'},
  event:      {icon:'event.webp',      color:'#ff9ec4', soft:'rgba(255,158,196,.22)', sub:'Đua điểm sự kiện mỗi tuần'},
  runes:      {icon:'runes.webp',      color:'#7ad0c4', soft:'rgba(122,208,196,.22)', sub:'Khảm đá cường hoá cho rồng'},
  ranked:     {icon:'ranked.webp',     color:'#ffd65c', soft:'rgba(255,214,92,.22)', sub:'Đấu xếp hạng theo mùa'},
  incubator:  {icon:'incubator.webp',  color:'#b58ae7', soft:'rgba(181,138,231,.22)', sub:'Chăm sóc hòn đảo của bạn'},
  back:       {icon:'back.webp',       color:'#55bce9', soft:'rgba(85,188,233,.22)', sub:''},
  close:      {icon:'close.webp',      color:'#ef6d62', soft:'rgba(239,109,98,.22)', sub:''},
};
function drFeatureIcon(id,cls){
  const meta=DR_FEATURE_UI[id]||DR_FEATURE_UI.incubator;
  return `<img class="dr-feature-icon ${cls||''}" src="${DR_FEATURE_ICON_ROOT}${meta.icon}" alt="" draggable="false">`;
}
function drModalFeature(title){
  const t=String(title||'').toLowerCase();
  const rules=[
    ['farm',['nông trại']],['adventure',['phiêu lưu','bãi biển vắng','rừng rậm','hang băng','núi lửa','đầm lầy độc','vực bóng tối','đỉnh thần long']],
    ['boss',['boss','hải xà','titan']],['daily',['điểm danh']],['achievement',['thành tựu']],
    ['leaderboard',['bảng xếp hạng','bxh']],['friends',['bạn bè','quà tặng','thăm đảo']],['tower',['tháp']],
    ['event',['sự kiện']],['runes',['cường hóa','đá rồng','rune']],['ranked',['đấu hạng','xếp hạng mùa','lực chiến']],['rebirth',['chuyển sinh']],
    ['decor',['trang trí','chướng ngại']],
    ['shop',['shop','vàng khi vắng mặt']],['quest',['nhiệm vụ']],['wheel',['vòng quay']],['forge',['lò rèn']],
    ['breed',['lai rồng','trứng']],['feed',['cho ăn']],['arena',['đấu trường','kết quả trận','trận chiến']],
    ['codex',['sách rồng']],['mail',['thư']],['habitat',['khu đảo','môi trường sống']]
  ];
  for(const rule of rules) if(rule[1].some(x=>t.includes(x))) return rule[0];
  return 'incubator';
}
/* ---------- Loài rồng (đồ giám) ---------- */
/* ==================== GHI CHÚ: RỒNG DỄ THƯƠNG — CẦN TẠO ẢNH (dùng AI) ====================
   Các rồng này đang dùng SVG màu tạm qua field 'pal'. Khi có ảnh, thêm 'sheet' như Rồng Nước:
       sheet:{url:'assets/dragons/<id>.webp', frames:8, fps:8}
   CHUẨN ẢNH (giống fire.png / water.png): 1 dải NGANG 8 khung đi bộ 4 chân, NỀN TRONG SUỐT,
   nhìn nghiêng 3/4, cùng nhân vật + cỡ ở mọi khung, style chibi mắt to má hồng.

   ĐÃ TẠO ẢNH + GẮN ATLAS TIẾN HOÁ 4×8:
     • peach → "Rồng Đào Hồng"  → assets/dragons/peach.webp + evolution/peach.webp
     • candy → "Rồng Kẹo Ngọt"  → assets/dragons/candy.webp + evolution/candy.webp

   ĐÃ TẠO ẢNH + ATLAS TIẾN HOÁ (thêm 2025-07): mint, lemon, berry, coral, cloud, rainbow
     • mint   "Rồng Bạc Hà"    — XANH MINT pastel #9be7c4 (hệ Cây)
     • lemon  "Rồng Chanh"     — VÀNG chanh #ffe37a (hệ Điện)
     • berry  "Rồng Việt Quất" — XANH-TÍM berry #8aa0ff (hệ Nước)
     • coral  "Rồng San Hô"    — CAM-HỒNG san hô #ff9e7a (hệ Nước)
     • cloud  "Rồng Mây"       — XÁM-XANH mây pastel #cfe3ff (hệ Băng)
     • rainbow "Rồng Cầu Vồng" — nhiều màu pastel chuyển sắc (hệ Ánh sáng)

   PROMPT MẪU CHO AI (thay [MÀU] / [TÊN]):
     "A super cute chibi baby dragon, [MÀU] pastel body, big sparkly round eyes, rosy cheeks,
      tiny wings, short horns, 3/4 side view. ONE horizontal sprite sheet of 8 frames forming a
      smooth 4-legged walk cycle — identical character, size and colors in every frame, walking in
      place. Transparent background, soft cel-shaded game art, centered, even spacing between frames."
   =========================================================================================== */
const DR_SPECIES={
  peach:   {name:'Rồng Đào Hồng',   el:'plant',   els:['plant'],          rar:'rare',   gold:18, atk:48, hp:125, range:4, spd:6, evo:'assets/dragons/evolution/peach.webp', sheet:{url:'assets/dragons/peach.webp',frames:8,fps:7,act:1.35}, pal:{body:'#ff9ec4',bd:'#ffe0ee',wg:'#ffc2dc',st:'#e85b93',horn:'#d43f7a'}},
  candy:   {name:'Rồng Kẹo Ngọt',   el:'water',   els:['water'],          rar:'rare',   gold:20, atk:52, hp:120, range:4, spd:7, evo:'assets/dragons/evolution/candy.webp', sheet:{url:'assets/dragons/candy.webp',frames:8,fps:8,act:1.25}, pal:{body:'#c89bf0',bd:'#f4e6ff',wg:'#dcc2f5',st:'#8f5ecf',horn:'#7346b3'}},
  // ===== Rồng CUTE/COLORFUL có sprite thật (8 khung) — thêm 2025-07 =====
  rose:        {name:'Rồng Hoa Hồng',  el:'plant', els:['plant'], rar:'rare',      gold:20, atk:50, hp:126, range:4, spd:6, evo:'assets/dragons/evolution/rose.webp', sheet:{url:'assets/dragons/rose.webp',frames:8,fps:7,act:1.3}},
  lotus:       {name:'Rồng Hoa Sen',   el:'water', els:['water'], rar:'rare',      gold:20, atk:48, hp:130, range:4, spd:6, evo:'assets/dragons/evolution/lotus.webp', sheet:{url:'assets/dragons/lotus.webp',frames:8,fps:7,act:1.35}},
  peony:       {name:'Rồng Mẫu Đơn',   el:'plant', els:['plant'], rar:'rare',      gold:21, atk:52, hp:124, range:4, spd:6, evo:'assets/dragons/evolution/peony.webp', sheet:{url:'assets/dragons/peony.webp',frames:8,fps:7,act:1.3}},
  bubblegum:   {name:'Rồng Kẹo Bông',  el:'water', els:['water'], rar:'rare',      gold:20, atk:46, hp:132, range:4, spd:7, evo:'assets/dragons/evolution/bubblegum.webp', sheet:{url:'assets/dragons/bubblegum.webp',frames:8,fps:8,act:1.25}},
  starlight:   {name:'Rồng Ánh Sao',   el:'light', els:['light'], rar:'epic',      gold:40, atk:78, hp:142, range:5, spd:8, evo:'assets/dragons/evolution/starlight.webp', sheet:{url:'assets/dragons/starlight.webp',frames:8,fps:7,act:1.4}},
  aurora:      {name:'Rồng Cực Quang', el:'ice',   els:['ice'],   rar:'epic',      gold:38, atk:74, hp:146, range:5, spd:7, evo:'assets/dragons/evolution/aurora.webp', sheet:{url:'assets/dragons/aurora.webp',frames:8,fps:7,act:1.35}},
  carnival:    {name:'Rồng Lễ Hội',    el:'fire',  els:['fire'],  rar:'epic',      gold:38, atk:78, hp:138, range:4, spd:7, evo:'assets/dragons/evolution/carnival.webp', sheet:{url:'assets/dragons/carnival.webp',frames:8,fps:7,act:1.3}},
  prism:       {name:'Rồng Lăng Kính', el:'light', els:['light'], rar:'epic',      gold:42, atk:82, hp:148, range:5, spd:8, evo:'assets/dragons/evolution/prism.webp', sheet:{url:'assets/dragons/prism.webp',frames:8,fps:7,act:1.3}},
  kaleidoscope:{name:'Rồng Vạn Hoa',   el:'light', els:['light'], rar:'legendary', gold:66, atk:106,hp:176, range:5, spd:8, evo:'assets/dragons/evolution/kaleidoscope.webp', sheet:{url:'assets/dragons/kaleidoscope.webp',frames:8,fps:7,act:1.45}},
  rainbow:     {name:'Rồng Cầu Vồng',  el:'light', els:['light'], rar:'epic',      gold:40, atk:80, hp:150, range:5, spd:8, evo:'assets/dragons/evolution/rainbow.webp', sheet:{url:'assets/dragons/rainbow.webp',frames:8,fps:7,act:1.4}},
  // ===== Rồng pastel dễ thương có sprite thật + ATLAS TIẾN HOÁ 4×8 — thêm 2025-07 =====
  mint:  {name:'Rồng Bạc Hà',   el:'plant',   els:['plant'],   rar:'rare', gold:19, atk:48, hp:128, range:4, spd:6, evo:'assets/dragons/evolution/mint.webp',  sheet:{url:'assets/dragons/mint.webp', frames:8,fps:7,act:1.35}, pal:{body:'#9be7c4',bd:'#e8fff4',wg:'#bff2da',st:'#3fae86',horn:'#2f8f6a'}},
  lemon: {name:'Rồng Chanh',    el:'electric',els:['electric'],rar:'rare', gold:19, atk:52, hp:118, range:5, spd:7, evo:'assets/dragons/evolution/lemon.webp', sheet:{url:'assets/dragons/lemon.webp',frames:8,fps:8,act:1.2},  pal:{body:'#ffe37a',bd:'#fff7cf',wg:'#ffee9e',st:'#e0a52a',horn:'#c98916'}},
  berry: {name:'Rồng Việt Quất',el:'water',   els:['water'],   rar:'rare', gold:20, atk:50, hp:126, range:4, spd:6, evo:'assets/dragons/evolution/berry.webp', sheet:{url:'assets/dragons/berry.webp',frames:8,fps:7,act:1.3},  pal:{body:'#8aa0ff',bd:'#e6ebff',wg:'#b3c0ff',st:'#4f63cf',horn:'#3a49b3'}},
  coral: {name:'Rồng San Hô',   el:'water',   els:['water'],   rar:'rare', gold:20, atk:49, hp:124, range:4, spd:7, evo:'assets/dragons/evolution/coral.webp', sheet:{url:'assets/dragons/coral.webp',frames:8,fps:7,act:1.3},  pal:{body:'#ff9e7a',bd:'#ffe6dc',wg:'#ffc2ab',st:'#e8663f',horn:'#c94f2a'}},
  cloud: {name:'Rồng Mây',      el:'ice',     els:['ice'],     rar:'rare', gold:19, atk:47, hp:130, range:4, spd:6, evo:'assets/dragons/evolution/cloud.webp', sheet:{url:'assets/dragons/cloud.webp',frames:8,fps:7,act:1.4},  pal:{body:'#cfe3ff',bd:'#f2f8ff',wg:'#dfecff',st:'#7f9fd6',horn:'#5f7fb6'}},
  sakura:  {name:'Rồng Anh Đào',    el:'plant',   els:['plant'],          rar:'rare',   gold:19, atk:50, hp:124, range:4, spd:6, fx:'petal', evo:'assets/dragons/evolution/sakura.webp', sheet:{url:'assets/dragons/sakura.webp',frames:8,fps:7,act:1.3}, pal:{body:'#ff8fc7',bd:'#ffe3f1',wg:'#ffb3d9',st:'#e84f95',horn:'#c93a7a'}},
  // ---- 10 rồng dễ thương MỚI (đã có sprite + tiến hoá) — đa số 'rare' cho dễ ra ----
  'cotton-candy':     {name:'Rồng Kẹo Bông Gòn', el:'water', els:['water'], rar:'rare', gold:20, atk:47, hp:130, range:4, spd:7, evo:'assets/dragons/evolution/cotton-candy.webp',     sheet:{url:'assets/dragons/cotton-candy.webp',    frames:8,fps:7,act:1.3},  pal:{body:'#ffb3e6',bd:'#fff0fb',wg:'#cfe4ff',st:'#e86bb0',horn:'#c94f95'}},
  'strawberry-cream': {name:'Rồng Kem Dâu',       el:'plant', els:['plant'], rar:'rare', gold:20, atk:49, hp:128, range:4, spd:6, evo:'assets/dragons/evolution/strawberry-cream.webp', sheet:{url:'assets/dragons/strawberry-cream.webp',frames:8,fps:7,act:1.3},  pal:{body:'#ff9db0',bd:'#fff0f2',wg:'#ffd9de',st:'#e8506a',horn:'#c93a52'}},
  'blossom-bubble':   {name:'Rồng Bong Bóng Hoa', el:'water', els:['water'], rar:'rare', gold:19, atk:46, hp:132, range:4, spd:7, evo:'assets/dragons/evolution/blossom-bubble.webp',   sheet:{url:'assets/dragons/blossom-bubble.webp',  frames:8,fps:8,act:1.25}, pal:{body:'#c9b3ff',bd:'#f4eeff',wg:'#ffcfe8',st:'#8a6fe0',horn:'#6f52c9'}},
  'cherry-soda':      {name:'Rồng Soda Anh Đào',  el:'water', els:['water'], rar:'rare', gold:20, atk:51, hp:122, range:4, spd:7, evo:'assets/dragons/evolution/cherry-soda.webp',      sheet:{url:'assets/dragons/cherry-soda.webp',     frames:8,fps:8,act:1.2},  pal:{body:'#ff8fa3',bd:'#ffe6ec',wg:'#bfe8ff',st:'#e8506a',horn:'#c93a52'}},
  'pearl-lotus':      {name:'Rồng Sen Ngọc',      el:'water', els:['water'], rar:'rare', gold:21, atk:48, hp:134, range:4, spd:6, evo:'assets/dragons/evolution/pearl-lotus.webp',      sheet:{url:'assets/dragons/pearl-lotus.webp',     frames:8,fps:7,act:1.35}, pal:{body:'#ffd9ec',bd:'#fffafd',wg:'#e6f0ff',st:'#e88bb8',horn:'#c96f9c'}},
  'rose-quartz':      {name:'Rồng Thạch Anh Hồng',el:'earth', els:['earth'], rar:'rare', gold:21, atk:52, hp:132, range:3, spd:5, evo:'assets/dragons/evolution/rose-quartz.webp',      sheet:{url:'assets/dragons/rose-quartz.webp',     frames:8,fps:6,act:1.45}, pal:{body:'#ffb0cf',bd:'#fff0f6',wg:'#f0d9ff',st:'#e86ba0',horn:'#c94f85'}},
  'moon-ribbon':      {name:'Rồng Nơ Trăng',      el:'light', els:['light'], rar:'rare', gold:20, atk:50, hp:126, range:5, spd:7, evo:'assets/dragons/evolution/moon-ribbon.webp',      sheet:{url:'assets/dragons/moon-ribbon.webp',     frames:8,fps:7,act:1.35}, pal:{body:'#d8c9ff',bd:'#f6f2ff',wg:'#fff0d9',st:'#9a7fe0',horn:'#7a5fc9'}},
  'rainbow-mochi':    {name:'Rồng Mochi Cầu Vồng',el:'light', els:['light'], rar:'rare', gold:21, atk:52, hp:130, range:5, spd:7, evo:'assets/dragons/evolution/rainbow-mochi.webp',    sheet:{url:'assets/dragons/rainbow-mochi.webp',   frames:8,fps:7,act:1.3},  pal:{body:'#ffd1e8',bd:'#fff5fb',wg:'#d9f5e6',st:'#e88bc0',horn:'#c96f9c'}},
  'starlight-bow':    {name:'Rồng Nơ Sao',        el:'light', els:['light'], rar:'epic', gold:40, atk:78, hp:144, range:5, spd:8, evo:'assets/dragons/evolution/starlight-bow.webp',    sheet:{url:'assets/dragons/starlight-bow.webp',   frames:8,fps:7,act:1.4},  pal:{body:'#ffcfe6',bd:'#fff2f9',wg:'#ffe9a8',st:'#e86bb0',horn:'#c94f95'}},
  'cupid-heart':      {name:'Rồng Thần Tình Yêu', el:'light', els:['light'], rar:'epic', gold:40, atk:80, hp:148, range:5, spd:8, evo:'assets/dragons/evolution/cupid-heart.webp',      sheet:{url:'assets/dragons/cupid-heart.webp',     frames:8,fps:7,act:1.4},  pal:{body:'#ff9db8',bd:'#ffeef2',wg:'#ffd9e2',st:'#e8506e',horn:'#c93a56'}},
  fire:    {name:'Rồng Lửa',       el:'fire',    els:['fire'],           rar:'common', gold:10, atk:42, hp:100, range:3, spd:6, evo:'assets/dragons/evolution/fire.webp',       sheet:{url:'assets/dragons/fire.webp', frames:8, fps:7, act:1.25}},
  water:   {name:'Rồng Nước',      el:'water',   els:['water'],          rar:'common', gold:10, atk:38, hp:112, range:4, spd:5, evo:'assets/dragons/evolution/water.webp',      sheet:{url:'assets/dragons/water.webp', frames:8, fps:9, act:1.3}},
  plant:   {name:'Rồng Cây',       el:'plant',   els:['plant'],          rar:'common', gold:10, atk:36, hp:118, range:3, spd:5, evo:'assets/dragons/evolution/plant.webp',      sheet:{url:'assets/dragons/plant.webp', frames:8, fps:6, act:1.45}},
  earth:   {name:'Rồng Đất',       el:'earth',   els:['earth'],          rar:'common', gold:11, atk:46, hp:126, range:2, spd:4, evo:'assets/dragons/evolution/earth.webp',      sheet:{url:'assets/dragons/earth.webp', frames:8, fps:5, act:1.55}},
  electric:{name:'Rồng Điện',      el:'electric',els:['electric'],       rar:'rare',   gold:16, atk:54, hp:100, range:5, spd:8, evo:'assets/dragons/evolution/electric.webp',   sheet:{url:'assets/dragons/electric.webp', frames:8, fps:9, act:1.05}},
  ice:     {name:'Rồng Băng',      el:'ice',     els:['ice'],            rar:'rare',   gold:16, atk:50, hp:110, range:4, spd:6, evo:'assets/dragons/evolution/ice.webp',        sheet:{url:'assets/dragons/ice.webp', frames:8, fps:6, act:1.5}},
  lava:    {name:'Rồng Dung Nham', el:'fire',    els:['fire','earth'],   rar:'rare',   gold:22, atk:62, hp:132, range:3, spd:5, evo:'assets/dragons/evolution/lava.webp',       sheet:{url:'assets/dragons/lava.webp', frames:8, fps:6, act:1.35}},
  steam:   {name:'Rồng Hơi Nước',  el:'water',   els:['fire','water'],   rar:'rare',   gold:22, atk:56, hp:120, range:4, spd:6, evo:'assets/dragons/evolution/steam.webp',      sheet:{url:'assets/dragons/steam.webp', frames:8, fps:7, act:1.35}},
  swamp:   {name:'Rồng Đầm Lầy',   el:'plant',   els:['water','plant'],  rar:'rare',   gold:22, atk:52, hp:138, range:3, spd:5, evo:'assets/dragons/evolution/swamp.webp',      sheet:{url:'assets/dragons/swamp.webp', frames:8, fps:5, act:1.7}},
  storm:   {name:'Rồng Bão',       el:'electric',els:['electric','water'],rar:'epic',  gold:34, atk:74, hp:130, range:5, spd:9, evo:'assets/dragons/evolution/storm.webp',      sheet:{url:'assets/dragons/storm.webp', frames:8, fps:8, act:1.15}},
  dark:    {name:'Hắc Long',       el:'dark',    els:['dark'],           rar:'epic',   gold:40, atk:86, hp:150, range:4, spd:7, evo:'assets/dragons/evolution/dark.webp',       sheet:{url:'assets/dragons/dark.webp', frames:8, fps:7, act:1.45}},
  light:   {name:'Thần Long',      el:'light',   els:['light'],          rar:'legendary',gold:70,atk:110,hp:180, range:5, spd:8, evo:'assets/dragons/evolution/light.webp',      sheet:{url:'assets/dragons/light.webp', frames:8, fps:7, act:1.6}},
};
const DR_SP_PRIORITY=['peach','sakura','candy','rose','lotus','peony','bubblegum','mint','lemon','berry','coral','cloud',
  'cotton-candy','strawberry-cream','blossom-bubble','cherry-soda','pearl-lotus','rose-quartz','moon-ribbon','rainbow-mochi','cupid-heart','starlight-bow',
  'starlight','aurora','carnival','prism','kaleidoscope','rainbow','fire','water','plant','earth','electric','ice','lava','steam','swamp','storm','dark','light'];
// DR_SP_ORDER LUÔN gồm mọi loài trong DR_SPECIES: chỉ cần thêm rồng mới vào DR_SPECIES
// là nó TỰ có trong Sách rồng + Vòng quay + đối thủ Đấu, không cần đụng danh sách này.
const DR_SP_ORDER=(function(){ const o=DR_SP_PRIORITY.filter(sp=>DR_SPECIES[sp]);
  for(const sp in DR_SPECIES) if(o.indexOf(sp)<0) o.push(sp);
  return o; })();
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
  'fire+fire':['fire','fire','lava','carnival'],
  'water+water':['water','water','steam','candy','lotus','bubblegum','berry','coral'],
  'plant+plant':['plant','plant','swamp','peach','rose','peony','sakura','mint'],
  'earth+earth':['earth','earth','lava'],
  'earth+fire':['lava','fire','earth'],
  'fire+water':['steam','fire','water'],
  'plant+water':['swamp','ice','water','plant'],
  'electric+water':['storm','water','electric'],
  'earth+electric':['electric','earth','storm'],   // key phải theo abc (earth<electric) — trước ghi 'electric+earth' nên KHÔNG bao giờ khớp
  'ice+plant':['ice','plant','swamp'],
  'dark+fire':['dark','lava','fire'],
  'dark+dark':['dark','dark','light','rainbow','prism','starlight'],
  'electric+electric':['electric','electric','storm','lemon'],
  'ice+ice':['ice','ice','storm','aurora','cloud'],
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

// 12 ô rải ĐỀU khắp đảo theo 4 hàng so le (tránh dồn giữa gây chồng rồng).
// x 15–83%, y 22–74% — hàng dưới render đè hàng trên (z theo y) tạo chiều sâu.
// Ô nhà của rồng — CHỪA TRỐNG vùng giữa-dưới quanh ổ trứng (≈ x40–62, y60–84) để
// rồng không tụ tập che ổ ấp. Rải quanh rìa cỏ + nửa trên cho đều & dễ bấm.
const DR_SLOTS=[
  [30,18],[45,15],[58,15],[72,18],    // hàng trên — lên sát bãi cỏ gần thác nước — 4 con
  [17,38],[37,34],[63,34],[83,38],    // hàng giữa — rộng nhất — 4 con
  [22,56],[78,56],                    // hai bên dưới (tránh giữa) — 2 con
  [33,75],[67,75]                     // hàng trước, lệch khỏi ổ trứng (x50) — 2 con
];
const DR_DECO=[['🌴',12,20,1.5],['🌸',82,42,1],['🍄',20,72,1],['🌷',75,73,1],['✨',52,17,.9],['🌿',88,60,1.1]];
const DR_BASE_CAP=8;                      // số ô nuôi rồng ban đầu của ĐẢO 1 (giữ nguyên như bản cũ, không nerf save cũ)
const DR_MAX=12;                          // số ô mỗi đảo (đảo 1: 8 ô, dọn 4 chướng ngại -> 12; đảo 2..N: 12 ô mở sẵn)
const DR_ISLAND_MAX=20;                   // trần số đảo sở hữu được (12 rồng/đảo => tối đa 240 rồng)
// Chướng ngại quanh đảo 1: dọn tốn vàng -> thưởng 💎/🍖/XP + mở thêm 1 ô nuôi rồng. Giá tăng dần.
const DR_OBSTACLES=[
  {id:'rock',    ic:'🪨', name:'Tảng đá',        x:16, y:40, cost:500,  gems:3,  food:20, xp:30},
  {id:'cactus',  ic:'🌵', name:'Bụi xương rồng', x:84, y:40, cost:1500, gems:5,  food:30, xp:60},
  {id:'log',     ic:'🪵', name:'Khúc gỗ mục',    x:22, y:73, cost:3500, gems:8,  food:45, xp:110},
  {id:'boulder', ic:'⛰️', name:'Gò đá lớn',      x:78, y:73, cost:7000, gems:14, food:70, xp:180},
];
// ===== NHIỀU ĐẢO: drState.dragons vẫn là MỘT mảng phẳng chứa TẤT CẢ rồng; mỗi đảo là 1 "trang" 12 ô đè lên mảng đó =====
function drIslandsOwned(){ return Math.max(1, Math.min(DR_ISLAND_MAX, (drState&&drState.islands)||1)); }
function drFirstCap(){                        // sức chứa ĐẢO 1 = ô gốc + số chướng ngại đã dọn
  const cleared=(drState&&drState.cleared)?drState.cleared.length:0;
  return Math.min(DR_MAX, DR_BASE_CAP+cleared);
}
function drIslandStart(k){ return k<=0?0:drFirstCap()+(k-1)*DR_MAX; }   // global index đầu của đảo k
function drIslandSize(k){ return k<=0?drFirstCap():DR_MAX; }            // số ô của đảo k
function drIslandOf(gi){                       // đảo chứa rồng có global index gi
  const owned=drIslandsOwned();
  for(let k=owned-1;k>=1;k--){ if(gi>=drIslandStart(k)) return k; }
  return 0;
}
function drCurIsland(){ return Math.max(0, Math.min(drIslandsOwned()-1, (drState&&drState.island)||0)); }
// Sức chứa TỔNG (mọi đảo). Không tụt dưới số rồng đang có (an toàn cho save cũ).
function drCapacity(){
  const total=drIslandStart(drIslandsOwned()-1)+drIslandSize(drIslandsOwned()-1);
  return Math.max(drState?drState.dragons.length:0, total);
}
// Giá mở đảo THỨ n (n = 2..20), tăng dần theo cấp số nhân.
function drIslandPrice(n){ return Math.round(20000*Math.pow(3.7,n-2)/1000)*1000; }
// Đưa tầm nhìn về đảo chứa con rồng MỚI NHẤT (vừa lai/nở/mua) để người chơi thấy ngay.
function drFocusLast(){ if(drState&&drState.dragons&&drState.dragons.length) drState.island=drIslandOf(drState.dragons.length-1); }
// Thông báo khi HẾT CHỖ mọi đảo: gợi ý mở đảo mới (nếu chưa đủ 20), không thì bảo bán bớt.
function drFullMsg(){ return drIslandsOwned()<DR_ISLAND_MAX ? 'Các đảo đã đầy — bấm “＋ Mở đảo” để nuôi thêm 🏝️' : 'Đã đủ '+DR_ISLAND_MAX+' đảo — bán bớt rồng đã'; }

// Chọn hình rồng: sprite-sheet (nhiều khung, vẫy cánh/nhấp mắt) > ảnh tĩnh (CSS animate) > sprite Rồng Lửa (fallback).
// Hoạ sĩ chỉ cần khai báo species.sheet hoặc species.art là tự thay — không đụng code khác.
function drSpriteHtml(sh,row){
  const fps=sh.fps||8, hasAct=sh.act?' has-actions':'', rows=sh.rows||1;
  const rowY=rows>1?((row||0)/(rows-1)*100).toFixed(3):0;
  return `<div class="dr-sprite${hasAct}${sh.rows?' evolution':''}" style="--url:url('${sh.url}'); --frames:${sh.frames}; --bg-cols:${sh.frames*100}%; --bg-rows:${rows*100}%; --row-y:${rowY}%; --dur:${(sh.frames/fps).toFixed(2)}s; --walk-dur:${(4/fps).toFixed(2)}s; --act-dur:${sh.act||1.25}s"></div>`;
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
  if(s.evo){
    const row=DR_EVOLUTIONS.indexOf(drEvolution(lv));
    return drSpriteHtml(Object.assign({},s.sheet,{url:s.evo,rows:4}),row);
  }
  if(s.sheet) return drSpriteHtml(s.sheet);
  if(s.art)   return drImgHtml(s.art);
  return drSpriteHtml(DR_SPECIES.fire.sheet);
}
// Chọn hình rồng: theo giai đoạn tiến hoá (cấp) + loại asset (sprite-sheet > ảnh tĩnh > SVG).
// Nhận cả dragon instance {sp,lv} (để chọn stage đúng cấp) hoặc chuỗi species id (preview).
function drDragonArt(d){
  const inst=(typeof d==='string')?{sp:d,lv:1}:(d||{});
  const s=DR_SPECIES[inst.sp]||DR_SPECIES.fire;
  const lv=inst.lv||1, evo=drEvolution(lv);
  const acc=(DR_PAL[s.el]||DR_PAL.fire).body;
  return `<span class="dr-evo dr-evo-${evo.id}${s.evo?' has-atlas':''}" data-evo="${evo.id}" style="--acc:${acc}">`
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
  return {gold:800, gems:20, food:60, level:1, xp:0, islands:1, island:0,
    dragons:[{sp:'fire',lv:1,fed:0,hab:1},{sp:'water',lv:1,fed:0,hab:2},{sp:'plant',lv:1,fed:0}], breed:null, cleared:[],
    qc:{tap:0,feed:0,breed:0,win:0,clear:0}, qClaimed:[],
    habitats:[{id:1,el:'fire',at:0,bank:0},{id:2,el:'water',at:0,bank:0}], habNext:3,
    farm:[0,0,0], daily:{day:0,streak:0}, achClaimed:[], adv:0, boss:{week:0,dmg:0,hits:0,day:0,claimed:[]}, decos:[], pity:0, friends:[], giftLog:{}, event:{week:-1,pts:0,claimed:[]}, runes:[], arena:{pts:0,week:-1,wins:0,claimed:false},
    ore:0, forge:{gold:0,power:0}, mails:[], spinDay:0, mailSeeded:false, lastSeen:0, tower:{floor:0,sweepDay:0},
    rebirth:{count:0,ki:0,up:{gold:0,power:0,xp:0}}, seen:['fire','water','plant'],
    periodic:{dk:-1,wk:-1,d:{},w:{}}, dq:{day:-1,claimed:[]}, wq:{week:-1,claimed:[]}};
}
function drNormDragons(arr){
  return (arr||[]).map(d=>{
    if(typeof d==='string'){ const sp=d==='violet'?'dark':(DR_SPECIES[d]?d:'fire'); return {sp,lv:1,fed:0}; }
    if(d&&d.sp&&DR_SPECIES[d.sp]) return {sp:d.sp, lv:d.lv||1, fed:d.fed||0, star:Math.min(DR_STAR_MAX,Math.max(1,d.star||1)), hab:(typeof d.hab==='number'?d.hab:null), pouch:Math.max(0,d.pouch||0), runes:Array.isArray(d.runes)?d.runes.filter(r=>r&&DR_RUNE[r.t]):[]};
    if(d&&d.el&&DR_SPECIES[d.el]) return {sp:d.el, lv:d.lv||1, fed:d.fed||0};
    return {sp:'fire',lv:1,fed:0};
  }).slice(0,DR_ISLAND_MAX*DR_MAX);   // trần cả bộ sưu tập = 20 đảo × 12
}
function drUid(){ return (auth&&auth.currentUser)?auth.currentUser.uid:'guest'; }
function drLsKey(){ return 'daorong-'+drUid(); }
function drNorm(v){
  const validIds=new Set(DR_OBSTACLES.map(o=>o.id));
  return {gold:v.gold||0, gems:v.gems||0, food:v.food||0, level:v.level||1, xp:v.xp||0,
    islands:Math.max(1,Math.min(DR_ISLAND_MAX,v.islands||1)), island:Math.max(0,Math.min((Math.max(1,Math.min(DR_ISLAND_MAX,v.islands||1)))-1, v.island||0)),
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
    friends:Array.isArray(v.friends)?v.friends:[], giftLog:(v.giftLog&&typeof v.giftLog==='object')?v.giftLog:{},
    event:(v.event&&typeof v.event==='object')?{week:(typeof v.event.week==='number'?v.event.week:-1),pts:v.event.pts||0,claimed:Array.isArray(v.event.claimed)?v.event.claimed:[]}:{week:-1,pts:0,claimed:[]},
    runes:Array.isArray(v.runes)?v.runes.filter(r=>r&&DR_RUNE[r.t]):[],
    arena:(v.arena&&typeof v.arena==='object')?{pts:v.arena.pts||0,week:(typeof v.arena.week==='number'?v.arena.week:-1),wins:v.arena.wins||0,claimed:!!v.arena.claimed}:{pts:0,week:-1,wins:0,claimed:false},
    spinDay:v.spinDay||0, mailSeeded:!!v.mailSeeded, lastSeen:v.lastSeen||0,
    tower:(v.tower&&typeof v.tower==='object')?{floor:Math.max(0,v.tower.floor||0),sweepDay:v.tower.sweepDay||0}:{floor:0,sweepDay:0},
    rebirth:(v.rebirth&&typeof v.rebirth==='object')?{count:Math.max(0,v.rebirth.count||0),ki:Math.max(0,v.rebirth.ki||0),up:{gold:Math.max(0,(v.rebirth.up&&v.rebirth.up.gold)||0),power:Math.max(0,(v.rebirth.up&&v.rebirth.up.power)||0),xp:Math.max(0,(v.rebirth.up&&v.rebirth.up.xp)||0)}}:{count:0,ki:0,up:{gold:0,power:0,xp:0}},
    seen:Array.isArray(v.seen)?Array.from(new Set(v.seen.filter(sp=>DR_SPECIES[sp]))):[],
    periodic:(v.periodic&&typeof v.periodic==='object')?{dk:(typeof v.periodic.dk==='number'?v.periodic.dk:-1),wk:(typeof v.periodic.wk==='number'?v.periodic.wk:-1),d:(v.periodic.d&&typeof v.periodic.d==='object')?v.periodic.d:{},w:(v.periodic.w&&typeof v.periodic.w==='object')?v.periodic.w:{}}:{dk:-1,wk:-1,d:{},w:{}},
    dq:(v.dq&&typeof v.dq==='object')?{day:(typeof v.dq.day==='number'?v.dq.day:-1),claimed:Array.isArray(v.dq.claimed)?v.dq.claimed:[]}:{day:-1,claimed:[]},
    wq:(v.wq&&typeof v.wq==='object')?{week:(typeof v.wq.week==='number'?v.wq.week:-1),claimed:Array.isArray(v.wq.claimed)?v.wq.claimed:[]}:{week:-1,claimed:[]}};
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
    islands:drIslandsOwned(), island:drCurIsland(),
    dragons:drState.dragons.map(d=>({sp:d.sp,lv:d.lv,fed:d.fed,star:drStar(d),hab:d.hab||null,pouch:Math.round(d.pouch||0),runes:(d.runes||[]).slice()})),
    breed:drState.breed||null, cleared:(drState.cleared||[]).slice(),
    qc:Object.assign({tap:0,feed:0,breed:0,win:0,clear:0}, drState.qc||{}), qClaimed:(drState.qClaimed||[]).slice(),
    ore:Math.round(drState.ore||0), forge:{gold:(drState.forge&&drState.forge.gold)||0, power:(drState.forge&&drState.forge.power)||0},
    mails:(drState.mails||[]).slice(), spinDay:drState.spinDay||0, mailSeeded:!!drState.mailSeeded, lastSeen:drNow(),
    habitats:(drState.habitats||[]).map(h=>({id:h.id,el:h.el,at:h.at||0,bank:Math.round(h.bank||0)})), habNext:drState.habNext||3,
    farm:(drState.farm||[]).slice(0,3), daily:drState.daily||{day:0,streak:0}, achClaimed:(drState.achClaimed||[]).slice(),
    adv:drState.adv||0, boss:drState.boss||{week:0,dmg:0,hits:0,day:0,claimed:[]}, decos:(drState.decos||[]).slice(), pity:drState.pity||0, friends:(drState.friends||[]).slice(), giftLog:drState.giftLog||{}, event:drState.event||{week:-1,pts:0,claimed:[]}, runes:(drState.runes||[]).slice(), arena:drState.arena||{pts:0,week:-1,wins:0,claimed:false}, tower:drState.tower||{floor:0,sweepDay:0},
    rebirth:drState.rebirth||{count:0,ki:0,up:{gold:0,power:0,xp:0}},
    seen:Array.from(new Set([...(drState.seen||[]), ...(drState.dragons||[]).map(d=>d.sp)])),
    periodic:drState.periodic||{dk:-1,wk:-1,d:{},w:{}}, dq:drState.dq||{day:-1,claimed:[]}, wq:drState.wq||{week:-1,claimed:[]},
    updatedAt:Date.now()};
  try{ localStorage.setItem(drLsKey(), JSON.stringify(obj)); }catch(_){}   // LUÔN lưu cục bộ trước
  if(auth&&auth.currentUser&&db){                                          // rồi mới đồng bộ cloud (best-effort)
    db.ref('users/'+auth.currentUser.uid+'/daorong').set(obj).catch(e=>console.error('daorong save(cloud)',e));
  }
}

/* ---------- Công thức ---------- */
// Thức ăn tới cấp kế: giữ NGUYÊN đường cong cũ tới Lv15; từ Lv15 trở đi tăng TUYẾN TÍNH
// (đường mũ 1.5^lv sẽ nổ tung ở cấp cao) để cấp cao vẫn khổ luyện được chứ không vô cực.
function drFoodToNext(lv){
  if(lv<15) return Math.round(20*Math.pow(1.5,lv-1));
  const base=Math.round(20*Math.pow(1.5,14));            // ~5838 tại mốc Lv15
  return Math.round(base*(1 + (lv-15)*0.6));             // mỗi cấp sau +60% mốc
}
function drXpToNext(lvl){ return Math.round(100*Math.pow(1.3,lvl-1)); }
function drGoldPerTap(d){ return Math.round(DR_SPECIES[d.sp].gold * drLvGoldMul(d.lv) * (1+Math.random()*0.8) * drStarGoldMult(d) * drForgeGoldMult() * drRebirthGoldMult() * (typeof drDecorMult==='function'?drDecorMult():1)); }
function drSellPrice(d){ return Math.round(DR_SPECIES[d.sp].gold * 25 * d.lv * DR_RAR[DR_SPECIES[d.sp].rar].mult); }
function drPower(d){ const s=DR_SPECIES[d.sp]; const rb=(typeof drRuneBonus==='function')?drRuneBonus(d):{atk:0,hp:0}; return Math.round((s.atk*1.6 + s.hp*0.4)*(1+0.18*(d.lv-1)) * drStarMult(d) * drForgePowerMult() * drRebirthPowerMult() * (1+rb.atk+rb.hp)); }
// Tổng lực chiến của người chơi = cộng sức mạnh mọi rồng đang nuôi (hiện trên HUD)
function drTotalPower(){ return (drState&&drState.dragons?drState.dragons:[]).reduce((t,d)=>t+drPower(d),0); }
// Bảng chi tiết lực chiến: xếp hạng rồng theo sức mạnh + tổng (mở khi chạm ⚔️ trên HUD)
function drShowPower(){
  const list=(drState.dragons||[]).map(d=>({d,p:drPower(d)})).sort((a,b)=>b.p-a.p);
  const total=list.reduce((t,x)=>t+x.p,0), max=list.length?list[0].p:1;
  const rows=list.map((x,idx)=>{
    const d=x.d, sp=DR_SPECIES[d.sp]||DR_SPECIES.fire, st=drStar(d), evo=drEvolution(d.lv);
    const pct=Math.max(6,Math.round(x.p/max*100)), medal=['🥇','🥈','🥉'][idx]||(idx+1);
    return `<div class="dr-pw-row">
      <span class="dr-pw-rank">${medal}</span>
      <span class="dr-pw-info"><b>${esc(sp.name)}</b><small>Lv${d.lv} · ${esc(evo.name)} · ★${st}</small>
        <i class="dr-pw-bar"><em style="width:${pct}%"></em></i></span>
      <span class="dr-pw-val">${fmtCoin(x.p)} ⚔️</span></div>`;
  }).join('') || '<p class="dr-note">Chưa có rồng nào — ấp trứng để bắt đầu gây dựng lực chiến!</p>';
  drModal('Lực chiến', `
    <div class="dr-pw-total"><span>Tổng lực chiến</span><b>${fmtCoin(total)} ⚔️</b><i>${list.length} rồng</i></div>
    <p class="dr-note">Sức mạnh mỗi rồng tăng theo cấp, sao, lò rèn, khảm đá & chuyển sinh. Nâng cấp để leo lực chiến!</p>
    <div class="dr-pw-list">${rows}</div>`);
}
/* ---------- Lò rèn: bùa toàn đảo (mỗi cấp +5%) ---------- */
const DR_FORGE_MAX=10;
function drForgeGoldMult(){ return 1 + 0.05*(((drState&&drState.forge)?drState.forge.gold:0)||0); }
function drForgePowerMult(){ return 1 + 0.05*(((drState&&drState.forge)?drState.forge.power:0)||0); }
function drForgeCost(level){ return {gems:3+level*2, ore:5+level*4}; }   // Lv0→1:3💎/5⛏️ … Lv9→10:21💎/41⛏️
/* ---------- Hệ sao rồng: nâng sao -> tăng sinh vàng & sức mạnh ---------- */
const DR_STAR_MAX=25;
function drStar(d){ return Math.min(DR_STAR_MAX, Math.max(1, (d&&d.star)||1)); }
// TRẦN CẤP theo SAO: mỗi sao mở thêm +2 cấp so với mốc cũ (1★=Lv15 giữ nguyên game cũ),
// tối đa toàn cục 60. Muốn lên cấp cao hơn -> phải NÂNG SAO trước. (giới hạn cấp bởi cấp sao)
const DR_LV_MAX=60, DR_LV_PER_STAR=2;
function drMaxLv(d){ return Math.min(DR_LV_MAX, 15 + (drStar(d)-1)*DR_LV_PER_STAR); }
function drLvCapped(d){ return (d.lv||1) >= drMaxLv(d); }               // đã kịch trần theo sao hiện tại?
function drCapToast(d){ toast(drStar(d)<DR_STAR_MAX ? '⭐ Kịch trần cấp theo sao — nâng sao để lên tiếp!' : '👑 Rồng đã đạt cấp tối đa'); }
// Piecewise: giữ nguyên 1★=1.0 → 5★=2.0 (tương thích save cũ), rồi +0.10/sao tới 25★=4.0x
function drStarMult(d){ const s=drStar(d); return (1 + 0.25*(Math.min(s,5)-1)) + (s>5?0.10*(s-5):0); }
// Hệ số VÀNG riêng (chống lạm phát): giảm dốc so với hệ số LỰC CHIẾN — sao sau ★5 chỉ +0.05/sao (★25: 3.0× thay vì 4.0×). Không đụng combat.
function drStarGoldMult(d){ const s=drStar(d); return (1 + 0.25*(Math.min(s,5)-1)) + (s>5?0.05*(s-5):0); }
// Vàng theo CẤP thoải hơn: Lv1=1×, mỗi cấp +0.5× (Lv60 ≈ 30.5× thay vì 60×) — tránh lạm phát khi trần cấp = 60.
function drLvGoldMul(lv){ return 1 + (((lv||1)-1)*0.5); }
function drStarCost(star){ return {gold:400*star*(star+1), gems:1+Math.floor(star/2)}; }  // vàng bậc 2; 💎 tăng nhẹ
// Bậc sao (mỗi 5 sao đổi màu + tên độ hiếm) — hiển thị gọn "★N" thay vì 25 dấu sao
function drStarTier(s){ return Math.min(4, Math.floor((((s||1)-1))/5)); }
const DR_STAR_COL=['#e8a06a','#dfe6ee','#ffd24a','#c89bf0','#8ef0ff'];
const DR_STAR_TIERNAME=['Thường','Hiếm','Quý','Sử thi','Cực hiếm'];
function drStarCol(s){ return DR_STAR_COL[drStarTier(s)]; }
function drStarBadge(d){ const s=drStar(d); return `<span class="dr-starnum" style="--sc:${drStarCol(s)}">★${s}</span>`; }
function drStarPips(d){ const s=drStar(d); return `${drStarBadge(d)} <small class="dr-star-tier">${DR_STAR_TIERNAME[drStarTier(s)]}</small>`; }
const DR_BLESS_COST=5;                                   // 💎 để "chúc phúc" khi lai
function drRarRank(sp){ return ['common','rare','epic','legendary'].indexOf((DR_SPECIES[sp]||DR_SPECIES.fire).rar); }
const DR_PITY_MAX=2;                                      // lai 2 lần liền ra rồng thường -> lần sau CHẮC CHẮN ra hiếm (dễ ra hơn)
// Gom loài có thể ra từ 1 cặp hệ. Cùng hệ -> TỰ thêm mọi loài hiếm cùng hệ (kể cả
// rồng mới thêm sau), nên rồng mới chỉ cần gắn 'el' là auto lai được từ cặp cùng hệ.
function drBreedPool(elA,elB){
  let pool=(DR_BREED[[elA,elB].sort().join('+')]||[]).slice();
  if(!pool.length) pool=[elA===elB?elA:(Math.random()<.5?elA:elB)];
  if(elA===elB){ for(const sp in DR_SPECIES){ const s=DR_SPECIES[sp];
    if(s.el===elA && drRarRank(sp)>=1 && pool.indexOf(sp)<0) pool.push(sp); } }
  return pool;
}
function drBreedResult(elA,elB,blessed){
  const pool=drBreedPool(elA,elB);
  const rarest=pool.slice().sort((x,y)=>drRarRank(y)-drRarRank(x))[0];
  if(blessed) return rarest;                              // chúc phúc: CHẮC CHẮN ra con hiếm nhất
  if((drState.pity||0)>=DR_PITY_MAX && drRarRank(rarest)>=1) return rarest;   // đủ pity -> ép ra hiếm
  const wts=pool.map(sp=>Math.pow(2,drRarRank(sp)));      // con càng hiếm càng dễ ra (trọng số 2^bậc hiếm)
  let r=Math.random()*wts.reduce((a,b)=>a+b,0);
  for(let i=0;i<pool.length;i++){ if((r-=wts[i])<0) return pool[i]; }
  return pool[pool.length-1];
}
function drAddXp(n){
  n=Math.round(n*drRebirthXpMult());
  drState.xp+=n; let up=false;
  while(drState.xp>=drXpToNext(drState.level)){ drState.xp-=drXpToNext(drState.level); drState.level++; drState.gems+=5; up=true; }
  if(up) drNotify('level-up','Lên cấp '+drState.level+'! +5 💎');
  if(typeof drEventGain==='function') drEventGain(n);
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
  {id:'advst3', ic:'arena', name:'Nhà thám hiểm', desc:'Vượt 3 màn Phiêu lưu',   type:'advst',  target:3,  gold:1500, gems:8},
  {id:'towerf5',ic:'rock',  name:'Kẻ leo tháp',   desc:'Chinh phục Tầng 5 Tháp',  type:'towerf', target:5,  gems:12},
  {id:'own8',   ic:'egg',   name:'Đảo đông vui',  desc:'Sở hữu 8 rồng',           type:'own',    target:8,  gold:2000, gems:10},
  {id:'islvl8', ic:'star',  name:'Đảo thịnh vượng',desc:'Đạt cấp đảo 8',          type:'islvl',  target:8,  gems:15},
  {id:'stars5', ic:'gem',   name:'Ngôi sao sáng', desc:'Nâng 1 rồng đạt 5★',      type:'stars',  target:5,  gems:18},
];
function drQC(type){ if(!drState.qc) drState.qc={}; drState.qc[type]=(drState.qc[type]||0)+1; drPeriodicBump(type); }
/* ---- Bộ đếm theo kỳ (ngày/tuần) cho nhiệm vụ luân phiên; tự reset khi sang kỳ mới ---- */
function drPeriodic(){
  if(!drState.periodic) drState.periodic={dk:-1,wk:-1,d:{},w:{}};
  const p=drState.periodic, dk=drDayNum(), wk=Math.floor(drNow()/604800000);
  if(p.dk!==dk){ p.dk=dk; p.d={}; }
  if(p.wk!==wk){ p.wk=wk; p.w={}; }
  return p;
}
function drPeriodicBump(type){ const p=drPeriodic(); p.d[type]=(p.d[type]||0)+1; p.w[type]=(p.w[type]||0)+1; }
function drQuestVal(q){
  if(q.type==='level')   return drState.dragons.reduce((m,d)=>Math.max(m,d.lv),0);
  if(q.type==='species') return new Set(drState.dragons.map(d=>d.sp)).size;
  if(q.type==='islvl')   return drState.level||1;                       // cấp đảo
  if(q.type==='advst')   return drState.adv||0;                          // số màn Phiêu lưu đã qua
  if(q.type==='towerf')  return (drState.tower&&drState.tower.floor)||0; // tầng Tháp cao nhất
  if(q.type==='own')     return (drState.dragons||[]).length;            // số rồng đang có
  if(q.type==='stars')   return drState.dragons.reduce((m,d)=>Math.max(m,(typeof drStar==='function'?drStar(d):(d.star||1))),0);
  if(q.type==='evostage') return drState.dragons.reduce((m,d)=>Math.max(m,DR_EVOLUTIONS.indexOf(drEvolution(d.lv))),0); // bậc tiến hoá cao nhất (0 baby → 3 legend)
  if(q.type==='legends')  return drState.dragons.filter(d=>DR_EVOLUTIONS.indexOf(drEvolution(d.lv))>=3).length;           // số rồng đạt Huyền thoại
  return (drState.qc&&drState.qc[q.type])||0;
}
function drQuestDone(q){ return drQuestVal(q)>=q.target; }
function drQuestClaimable(q){ return drQuestDone(q) && !(drState.qClaimed||[]).includes(q.id); }
function drQuestCount(){ return DR_QUESTS.filter(drQuestClaimable).length + drRotClaimCount()
  + (typeof drJourneyCount==='function'?drJourneyCount():0)
  + (typeof drDailyBonusReady==='function'&&drDailyBonusReady()?1:0)
  + (typeof drWeeklyBonusReady==='function'&&drWeeklyBonusReady()?1:0); }
/* ============ NHIỆM VỤ NGÀY / TUẦN LUÂN PHIÊN ============
   Chọn xoay vòng theo drDayNum()/tuần nên mỗi kỳ ra bộ nhiệm vụ khác nhau.
   Tiến độ đọc từ bộ đếm theo kỳ (drPeriodic) -> tự reset đầu ngày/tuần. */
const DR_DQ_POOL=[
  {id:'d_tap',  ic:'gold',  name:'Đãi vàng',    type:'tap',   target:15, r:{gold:400,gems:1}},
  {id:'d_feed', ic:'food',  name:'Bữa ăn ngon', type:'feed',  target:6,  r:{food:40,gems:1}},
  {id:'d_win',  ic:'arena', name:'Thử sức',     type:'win',   target:2,  r:{gold:500,gems:2}},
  {id:'d_breed',ic:'breed', name:'Ươm mầm',     type:'breed', target:1,  r:{gems:3}},
  {id:'d_tap2', ic:'gold',  name:'Thợ mỏ vàng', type:'tap',   target:30, r:{gold:800,gems:2}},
  {id:'d_win2', ic:'arena', name:'Đấu sĩ',      type:'win',   target:4,  r:{gold:900,gems:3}},
  {id:'d_adv',  ic:'arena', name:'Lữ khách',    type:'adv',   target:1,  r:{gems:3}},           // qua 1 màn Phiêu lưu
  {id:'d_tower',ic:'rock',  name:'Leo tháp',    type:'tower', target:1,  r:{gems:3}},           // leo 1 tầng Tháp
  {id:'d_boss', ic:'arena', name:'Đấu Boss',    type:'boss',  target:2,  r:{gems:2,gold:600}},  // đánh Boss 2 lượt
  {id:'d_spin', ic:'gift',  name:'Thử vận may', type:'spin',  target:1,  r:{gems:2}},           // quay 1 lượt
];
const DR_WQ_POOL=[
  {id:'w_tap',  ic:'gold',  name:'Núi vàng',      type:'tap',   target:120, r:{gold:4000,gems:5}},
  {id:'w_win',  ic:'arena', name:'Bất bại',       type:'win',   target:20,  r:{gold:6000,gems:10}},
  {id:'w_feed', ic:'food',  name:'Nhà chăn rồng', type:'feed',  target:40,  r:{food:150,gems:6}},
  {id:'w_breed',ic:'breed', name:'Bậc thầy lai',  type:'breed', target:6,   r:{gems:15}},
  {id:'w_clear',ic:'rock',  name:'Mở mang bờ cõi',type:'clear', target:2,   r:{gold:5000,gems:8}},
  {id:'w_adv',  ic:'arena', name:'Kẻ chinh phục', type:'adv',   target:5,   r:{gems:14}},         // qua 5 màn Phiêu lưu
  {id:'w_tower',ic:'rock',  name:'Chủ nhân Tháp',  type:'tower', target:8,   r:{gems:16}},         // leo 8 tầng Tháp
  {id:'w_rune', ic:'gem',   name:'Thợ khắc đá',    type:'rune',  target:3,   r:{gems:10,gold:2000}},// ghép 3 đá
];
function drRotPick(pool, count, seed){
  const n=pool.length, start=((seed%n)+n)%n, out=[];
  for(let k=0;k<Math.min(count,n);k++) out.push(pool[(start+k)%n]);
  return out;
}
function drDailyQuests(){ return drRotPick(DR_DQ_POOL, 3, drDayNum()); }
function drWeeklyQuests(){ return drRotPick(DR_WQ_POOL, 3, Math.floor(drNow()/604800000)+3); }
function drRotProg(q, scope){ const p=drPeriodic(); return Math.min(q.target, ((scope==='w'?p.w:p.d)[q.type])||0); }
function drRotClaimed(scope){                    // danh sách id đã nhận trong kỳ hiện tại (tự reset khi sang kỳ)
  if(scope==='w'){ const wk=Math.floor(drNow()/604800000); if(!drState.wq||drState.wq.week!==wk) drState.wq={week:wk,claimed:[]}; return drState.wq.claimed; }
  const dk=drDayNum(); if(!drState.dq||drState.dq.day!==dk) drState.dq={day:dk,claimed:[]}; return drState.dq.claimed;
}
function drRotClaimable(q, scope){ return drRotProg(q,scope)>=q.target && !drRotClaimed(scope).includes(q.id); }
function drRotClaimCount(){
  return drDailyQuests().filter(q=>drRotClaimable(q,'d')).length + drWeeklyQuests().filter(q=>drRotClaimable(q,'w')).length;
}
function drClaimRot(id, scope){
  const q=(scope==='w'?drWeeklyQuests():drDailyQuests()).find(x=>x.id===id);
  if(!q||!drRotClaimable(q,scope)) return;
  drRotClaimed(scope).push(id); drReward(q.r);
  drRenderHud(); drSave(); if(typeof drUpdateQuestDot==='function') drUpdateQuestDot();
  if(typeof confetti==='function') confetti();
  toast('🎁 '+(scope==='w'?'Nhiệm vụ tuần':'Nhiệm vụ ngày')+': '+q.name+'! +'+drRewardText(q.r));
  drShowQuests();
}
function drUpdateQuestDot(){ const d=$('drQuestDot'); if(!d) return; const n=drQuestCount(); d.textContent=n; d.hidden=(n<=0);
}

/* ---------- Dựng khung cảnh ---------- */
function drBuild(){
  if(drBuilt) return;
  drReduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Máy yếu (ít nhân / ít RAM) -> chế độ NHẸ: cắt bớt hiệu ứng nặng cho mượt (không tắt hẳn).
  drLite = drReduce || (navigator.hardwareConcurrency||8)<=4 || (navigator.deviceMemory||8)<=3;
  const app=document.createElement('div'); app.id='drApp'; app.className='dr-screen'+(drLite?' dr-lite':''); app.style.display='none';
  let deco=DR_DECO.map(d=>`<span class="dr-deco" style="left:${d[1]}%; top:${d[2]}%; font-size:${26*d[3]}px">${d[0]}</span>`).join('');
  let sparks=''; for(let i=0;i<10;i++) sparks+=`<span class="dr-sparkle" style="left:${Math.floor(Math.random()*100)}%; top:${58+Math.floor(Math.random()*38)}%; animation-delay:${(-Math.random()*3.5).toFixed(1)}s"></span>`;
  const dockList=[
    ['coach','Gợi ý'],['habitat','Khu đảo'],['farm','Nông trại'],['bag','Túi đồ'],['adventure','Phiêu lưu'],['tower','Tháp'],['boss','Boss'],['daily','Điểm danh'],['ach','Thành tựu'],['leaderboard','BXH'],['friends','Bạn bè'],['event','Sự kiện'],['runes','Cường hóa'],['ranked','Đấu hạng'],['decor','Trang trí'],['shop','Shop'],['quest','Nhiệm vụ'],['wheel','Vòng quay'],['forge','Lò rèn'],['rebirth','Chuyển Sinh'],['breed','Lai rồng'],['feed','Cho ăn'],['arena','Đấu'],['codex','Sách rồng'],['mail','Thư']
  ];
  // Gán mỗi icon vào 1 cụm góc; icon mới (nếu có) mặc định vào cụm 'br'
  const DR_DOCK_POS={ coach:'lm', habitat:'bl',farm:'bl',feed:'bl',breed:'bl',decor:'bl',bag:'bl',
    adventure:'lm',tower:'lm',boss:'lm',arena:'lm',ranked:'lm',
    shop:'br',quest:'br',wheel:'br',forge:'br',runes:'br',rebirth:'br',daily:'br',
    friends:'rm',leaderboard:'rm',event:'rm',codex:'rm',ach:'rm',mail:'rm' };
  const DR_POD_T={ bl:'Nuôi dưỡng', lm:'Chiến đấu', br:'Cửa hàng', rm:'Cộng đồng' };
  const podBuckets={bl:[],lm:[],br:[],rm:[]};
  dockList.forEach(d=>{ const pos=DR_DOCK_POS[d[0]]||'br', icon=d[0]==='ach'?'achievement':d[0];
    const ic=(d[0]==='bag')?'<img class="dr-feature-icon" src="assets/dragon-island/ui/bag.webp" alt="" draggable="false" onerror="this.replaceWith(document.createTextNode(\'🎒\'))">':(d[0]==='coach')?'<span class="dr-dock-emoji">💡</span>':drFeatureIcon(icon);   // Túi đồ dùng ảnh mới, Gợi ý dùng emoji
    podBuckets[pos].push(`<button class="dr-dock-btn dr-dock-${icon}" data-act="${d[0]}" type="button" title="${d[1]}"><span class="di">${ic}</span><span class="dl">${d[1]}</span>${typeof drDockBadge==='function'?drDockBadge(d[0]):''}</button>`); });
  const dock=['bl','lm','br','rm'].map(pos=>`<div class="dr-pod dr-pod-${pos}"><span class="dr-pod-t">${DR_POD_T[pos]}</span><div class="dr-pod-grid">${podBuckets[pos].join('')}</div></div>`).join('');
  app.innerHTML=`
    <div class="dr-sun" aria-hidden="true"></div>
    <div class="dr-cloud a" aria-hidden="true"></div><div class="dr-cloud b" aria-hidden="true"></div><div class="dr-cloud c" aria-hidden="true"></div>
    <div class="dr-shimmer" aria-hidden="true"></div>${sparks}
    <div class="dr-island" id="drIsland">
      <div class="dr-foam" aria-hidden="true"></div><div class="dr-beach" aria-hidden="true"></div><div class="dr-grass" aria-hidden="true"></div>
      <div class="dr-isle-nav" id="drIsleNav"></div>
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
            <span class="dr-xp"><i id="drXpFill"></i><em id="drLvl">Cấp 1</em></span>
            <span class="dr-cp" id="drCP" title="Tổng lực chiến của cả đàn rồng">⚔️ <b id="drCPv">0</b></span></span></div>
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

  $('drBack').onclick=()=>leaveDragonIsland();   // gọi không tham số -> silent=undefined -> mở lại menu chọn game
  $('drCP').onclick=drShowPower;                 // chạm Lực chiến -> bảng chi tiết
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
  drBuild();
  const cb=$('coinBar'); if(cb) cb.style.display='none';
  $('drApp').style.display='block';          // hiện đảo NGAY để che bàn bài (#app) trong lúc tải
  document.body.classList.add('dr-active');  // ẩn nút Cài app (install-fab) khi trong Đảo Rồng
  const loaded=await drLoad(); drState=loaded||drDefault();
  const drOff=drOfflineEarned();             // tính vàng offline TRƯỚC khi đóng dấu lastSeen mới
  if(drOff.gold>=10 && (drState.dragons||[]).length) drState.gold+=drOff.gold;
  drState.lastSeen=drNow();
  drActive=true;
  try{ localStorage.setItem('lastGame','daorong'); }catch(_){}
  $('drName').textContent=(profile&&profile.name)?profile.name:myName;
  drSeedMails();
  drRenderHud(); drRenderDragons(); drRenderEgg(); drRenderObstacles();
  hideOverlay();                             // ẩn overlay SAU khi đảo đã sẵn sàng -> reload không lộ màn game bài
  drSaveNow();                               // luôn lưu để chốt lastSeen (chống cộng vàng offline trùng)
  drStartCoins();
  clearInterval(drTick); drTick=setInterval(drRenderEgg,1000);   // đếm ngược ổ ấp
  if(drOff.gold>=10 && (drState.dragons||[]).length) setTimeout(()=>drShowOffline(drOff), 450);
  if(typeof announceGameUpdate==='function') announceGameUpdate('daorong');   // bảng "Có gì mới" của Đảo Rồng
}
function leaveDragonIsland(silent){
  drActive=false;
  try{ localStorage.removeItem('lastGame'); }catch(_){}
  clearTimeout(drCoinTimer); drCoinTimer=null; clearInterval(drTick); drTick=null;
  clearTimeout(drSaveT); drSaveNow();
  drCloseModal();
  if($('drApp')) $('drApp').style.display='none';
  document.body.classList.remove('dr-active');   // hiện lại nút Cài app khi rời Đảo Rồng
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
  set('drCPv',fmtCoin(drTotalPower()));                         // tổng lực chiến cả đàn
  const f=$('drXpFill'); if(f) f.style.width=Math.min(100,Math.round(drState.xp/drXpToNext(drState.level)*100))+'%';
  drUpdateQuestDot(); drUpdateMailDot();
  if(typeof drUpdateHabDot==='function') drUpdateHabDot();   // tính năng Khu đảo đang làm dở -> né crash
  if(typeof drUpdateFeatureDots==='function') drUpdateFeatureDots();
}
function drBump(id){ const el=$(id); if(!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

/* ---------- Rồng trên đảo ---------- */
function drRenderDragons(){
  const wrap=$('drDragons'); if(!wrap) return; wrap.innerHTML='';
  const IW=wrap.clientWidth||600, IH=wrap.clientHeight||360;   // kích cỡ đảo (px) để quy đổi % -> px cho đường đi
  // CHỈ vẽ 12 rồng của ĐẢO đang xem; dataset.idx là global index (mọi handler vẫn tra drState.dragons[gi]).
  const isle=drCurIsland(), base=drIslandStart(isle), size=drIslandSize(isle);
  if((drState.island||0)!==isle) drState.island=isle;
  const egg=$('drEgg'); if(egg) egg.style.display=(isle===0)?'':'none';   // ổ ấp chỉ ở ĐẢO 1
  drRenderIsleScene(isle);                                                  // nền đảo riêng + hào quang theo bậc
  drRenderIsleNav();
  drState.dragons.slice(base, base+size).forEach((d,i)=>{
    const gi=base+i;
    const s=DR_SPECIES[d.sp]||DR_SPECIES.fire, st=drStar(d), evo=drEvolution(d.lv);
    const slot=DR_SLOTS[i%DR_SLOTS.length];
    const roam=document.createElement('div'); roam.className='dr-roam'; roam.dataset.idx=gi;
    roam.style.left=slot[0]+'%'; roam.style.top=slot[1]+'%'; roam.style.zIndex=10+Math.round(slot[1]);
    const bob=document.createElement('div'); bob.className=`dr-bob dr-tier-${drStarTier(st)} dr-stage-${evo.id}`;
    bob.style.animationDelay=(-Math.random()*2.6).toFixed(2)+'s';
    bob.style.setProperty('--acc',(DR_PAL[s.el]||{}).body||'#8fe0ff');
    bob.style.setProperty('--tcol',drStarCol(st));
    bob.style.setProperty('--au',(0.22+st*0.026).toFixed(3));      // độ sáng quầng: tăng liên tục theo sao (★1≈.25 → ★25≈.87)
    bob.style.setProperty('--asz',(114+st*2.4).toFixed(0)+'%');    // kích thước quầng theo sao
    bob.style.setProperty('--odur',(Math.max(2.6, 7-st*0.17)).toFixed(2)+'s'); // xoay nhanh dần theo sao
    // ==== FX theo BẬC SAO — mỗi bậc một KIỂU hiệu ứng khác hẳn ====
    const stt=drStarTier(st);
    let fx='<span class="dr-aura"></span>';
    if(stt===1){                                                   // Hiếm: đốm nhấp nháy quanh rồng
      const pos=[[16,24],[76,30],[50,8],[28,70],[84,60]];
      fx+='<span class="dr-tw">'+pos.map((p,k)=>`<i style="left:${p[0]}%;top:${p[1]}%;animation-delay:${(k*0.3).toFixed(2)}s"></i>`).join('')+'</span>';
    }else if(stt>=2){                                              // Quý+: hạt bay vòng (số lượng theo sao)
      const pc=Math.min(drLite?5:8, Math.floor(st/2)+1);            // PERF: bớt hạt trên máy yếu
      let orbit=''; for(let k=0;k<pc;k++) orbit+=`<i style="transform:rotate(${Math.round(k/pc*360)}deg) translateY(-44px)"></i>`;
      fx+=`<span class="dr-orbit">${orbit}</span>`;
    }
    if(stt>=3) fx+='<span class="dr-ring"></span>';                // Sử thi+: vòng phép xoay dưới chân
    if(stt>=4){                                                    // Cực hiếm: hào quang cầu vồng + hạt bay lên
      fx+='<span class="dr-halo"></span>';
      if(!drLite) fx+='<span class="dr-rise">'+[12,38,62,86].map((x,k)=>`<i style="left:${x}%;animation-delay:${(k*0.55).toFixed(2)}s"></i>`).join('')+'</span>';   // PERF: máy yếu bỏ hạt bay lên
    }
    const scale=(evo.scale+Math.min(0.14, Math.max(0,(d.lv||1)-evo.minLv)*0.012)).toFixed(3);  // chặn phình to ở cấp cao
    let drPetals='';                                                  // mưa cánh hoa cho rồng có fx:'petal' (nhiều dần theo cấp)
    if(!drLite && (DR_SPECIES[d.sp]||{}).fx==='petal'){
      const pn=3+DR_EVOLUTIONS.indexOf(evo)*2;                        // Baby 3 → Teen 5 → Adult 7 → Legend 9
      for(let k=0;k<pn;k++) drPetals+=`<i style="--x:${Math.round(6+Math.random()*88)}%;--sz:${(7+Math.random()*5).toFixed(1)}px;--dur:${(3.6+Math.random()*2.8).toFixed(2)}s;--del:${(-Math.random()*5).toFixed(2)}s;--drift:${Math.round(Math.random()*30-15)}px"></i>`;
      drPetals=`<span class="dr-petals">${drPetals}</span>`;
    }
    // AURA DƯỚI CHÂN (ảnh động 8 frame): vòng theo BẬC TIẾN HOÁ + theo BẬC SAO.
    // Đặt TRONG .dr-artwrap để vòng NEO theo chân rồng và TO/NHỎ đồng bộ với con rồng (rồng đứng TRỌN trong vòng).
    const evoIdx=DR_EVOLUTIONS.indexOf(evo), starTier=drStarTier(st);
    const groundAura=`<span class="dr-ground-aura dr-aura-evo"><img src="assets/dragon-island/effects/evolution/evolution-aura.webp" alt="" draggable="false" style="top:${(-evoIdx*100).toFixed(0)}%" onerror="this.parentNode.remove()"></span>`
      +`<span class="dr-ground-aura dr-aura-star"><img src="assets/dragon-island/effects/stars/star-aura.webp" alt="" draggable="false" style="top:${(-starTier*100).toFixed(0)}%" onerror="this.parentNode.remove()"></span>`;
    bob.innerHTML=fx
      +`<div class="dr-artwrap dr-facing" style="--dScale:${scale}">${drDragonArt(d)}${groundAura}</div>`
      +drPetals
      +`<span class="dr-starbadge">★${st}</span>`
      +`<span class="dr-lvtag">Lv${d.lv} · ${evo.name}</span>`;
    roam.appendChild(bob); wrap.appendChild(roam);
    if(d.pouch>0) drRenderPouch(gi);                 // hiện lại túi vàng đã tích (không mất khi vẽ lại)
    drScheduleDragonAction(bob,d.sp);
    if(!drReduce){
      // Rồng đi DẠO quanh Ô NHÀ của nó (mỗi con một vùng riêng nên TRẢI ĐỀU khắp đảo,
      // không dồn cục vào giữa/ổ trứng, vẫn bấm được). Bước ĐỀU (linear) nên mượt không đơ.
      // Đích luôn được kéo vào trong bãi cỏ và ĐẨY RA khỏi ổ trứng.
      const clampGrass=(x,y)=>{ const dx=(x-50)/38, dy=(y-46)/33, r=Math.hypot(dx,dy);   // giữ trong cỏ
        if(r>1){ x=50+dx/r*38*.98; y=46+dy/r*33*.98; } return [x,y]; };
      const dodgeEgg=(x,y)=>{ let dx=(x-50)/16, dy=(y-73)/14, r=Math.hypot(dx,dy);         // né hẳn ổ trứng (50,73)
        if(r<1){ if(r<1e-3){dx=0;dy=1;r=1;} x=50+dx/r*16; y=73+dy/r*14; } return [x,y]; };
      const RX=18, RY=14;                                          // biên độ đi dạo quanh nhà (theo % của đảo)
      const pick=()=>{ const a=Math.random()*Math.PI*2, r=Math.sqrt(Math.random());
        let p=[slot[0]+RX*r*Math.cos(a), slot[1]+RY*r*Math.sin(a)];
        p=clampGrass(p[0],p[1]); p=dodgeEgg(p[0],p[1]); return p; };
      const N=5, pts=[]; for(let k=0;k<N;k++) pts.push(pick()); pts.push(pts[0]);   // đường vòng kín -> lặp mượt liên tục
      const off=pts.map(p=>[ (p[0]-slot[0])/100*IW, (p[1]-slot[1])/100*IH ]);       // % -> px lệch so với ô nhà
      const frames=off.map((o,k)=>({transform:`translate(${o[0].toFixed(1)}px,${o[1].toFixed(1)}px)`, offset:k/(off.length-1)}));
      let dist=0; for(let k=1;k<off.length;k++) dist+=Math.hypot(off[k][0]-off[k-1][0], off[k][1]-off[k-1][1]);
      const spd=24+(s.spd||5)*2;                                   // px/giây: rồng nhanh (spd cao) bước rảo hơn
      const dur=Math.min(40000, Math.max(11000, dist/spd*1000));   // thời lượng theo quãng đường -> tốc độ nhìn đều nhau
      roam.animate(frames,{duration:dur,iterations:Infinity,easing:'linear'});
      // Quay mặt + độ sâu theo từng chặng (khớp thời gian đều của các chặng)
      const segN=pts.length-1, segMs=Math.max(1,Math.round(dur/segN));
      const apply=k=>{ const a=pts[k], b=pts[(k+1)%pts.length];
        roam.classList.toggle('flip', b[0]<a[0]-0.3); roam.style.zIndex=10+Math.round(b[1]); };
      apply(0); let si=0;
      const t=setInterval(()=>{ if(!roam.isConnected){clearInterval(t);return;}
        si=(si+1)%segN; apply(si); }, segMs);
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
  if(drCurIsland()!==0){ wrap.innerHTML=''; return; }   // chướng ngại chỉ có ở ĐẢO 1
  const done=new Set(drState.cleared||[]);
  wrap.innerHTML=DR_OBSTACLES.filter(o=>!done.has(o.id)).map(o=>
    `<button class="dr-obstacle" data-id="${o.id}" style="left:${o.x}%; top:${o.y}%" type="button" aria-label="Dọn ${esc(o.name)}">
       <span class="dr-obs-ic"><img src="assets/dragon-island/obstacles/${o.id}.webp" alt="" draggable="false" onerror="this.replaceWith(document.createTextNode('${o.ic}'))"></span>
       <span class="dr-obs-cost">${drIcon('gold')}${fmtCoin(o.cost)}</span></button>`).join('');
}
function drClearObstacle(id){
  const o=DR_OBSTACLES.find(x=>x.id===id); if(!o) return;
  if((drState.cleared||[]).includes(id)) return;
  const body=`<div class="dr-clear">
      <div class="dr-clear-ic"><img src="assets/dragon-island/obstacles/${o.id}.webp" alt="" draggable="false" style="width:64px;height:64px;object-fit:contain" onerror="this.replaceWith(document.createTextNode('${o.ic}'))"></div>
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
    if(typeof confetti==='function') confetti(); drFx('unlock');
    toast(`✨ Đã dọn ${o.name}! +1 ô rồng · +${o.gems}💎 +${o.food}🍖`);
  };
}

/* ---------- NHIỀU ĐẢO: thanh chuyển đảo + mua đảo mới ---------- */
function drRenderIsleNav(){
  const nav=$('drIsleNav'); if(!nav) return;
  const owned=drIslandsOwned(), cur=drCurIsland();
  const onDragons=drState.dragons.slice(drIslandStart(cur), drIslandStart(cur)+drIslandSize(cur)).length;
  const canBuy=cur===owned-1 && owned<DR_ISLAND_MAX;   // đứng ở đảo cuối & chưa đủ 20 -> nút mở đảo
  const price=canBuy?drIslandPrice(owned+1):0;
  nav.innerHTML=
     `<button class="dr-isle-arrow" id="drIslePrev" type="button" aria-label="Đảo trước" ${cur<=0?'disabled':''}>◀</button>`
    +`<span class="dr-isle-label">🏝️ Đảo <b>${cur+1}</b>/${owned} · <span class="dr-isle-count">${onDragons}/${drIslandSize(cur)}🐲</span></span>`
    +(canBuy
        ? `<button class="dr-isle-buy" id="drIsleBuy" type="button">＋ Mở đảo ${drIcon('gold')}${fmtCoin(price)}</button>`
        : `<button class="dr-isle-arrow" id="drIsleNext" type="button" aria-label="Đảo sau" ${cur>=owned-1?'disabled':''}>▶</button>`);
  const prev=$('drIslePrev'); if(prev) prev.onclick=()=>drGoIsland(-1);
  const next=$('drIsleNext'); if(next) next.onclick=()=>drGoIsland(1);
  const buy=$('drIsleBuy'); if(buy) buy.onclick=drBuyIsland;
}
function drGoIsland(delta){
  const owned=drIslandsOwned();
  const to=Math.max(0, Math.min(owned-1, drCurIsland()+delta));
  if(to===drCurIsland()) return;
  drState.island=to; drRenderDragons(); drRenderObstacles(); drSave();
}
function drBuyIsland(){
  const owned=drIslandsOwned();
  if(owned>=DR_ISLAND_MAX){ toast('Đã sở hữu tối đa '+DR_ISLAND_MAX+' đảo 🏝️'); return; }
  const n=owned+1, price=drIslandPrice(n);
  const body=`<div class="dr-buyisle">
      <div class="dr-buyisle-ic">🏝️</div>
      <p class="dr-note">Mở <b>Đảo ${n}</b> — thêm <b>${DR_MAX} ô</b> nuôi rồng (tổng ${n*DR_MAX} chỗ).</p>
      <div class="dr-clear-reward">Đảo mới là bãi cỏ trống, rồng lai/nở/mua sẽ dọn về đây khi các đảo trước đầy.</div>
      <button class="dr-btn go" id="drDoBuyIsle">Mở đảo · ${fmtCoin(price)} 🪙</button></div>`;
  drModal('Mở đảo mới', body);
  $('drDoBuyIsle').onclick=()=>{
    if(drIslandsOwned()>=DR_ISLAND_MAX){ drCloseModal(); return; }
    if((drState.gold||0)<price){ toast('Thiếu vàng — thu thêm đã 🪙'); return; }
    drState.gold-=price; drState.islands=owned+1; drState.island=owned;   // sang thẳng đảo vừa mở
    drRenderHud(); drRenderDragons(); drRenderObstacles(); drSave(); drCloseModal();
    if(typeof confetti==='function') confetti();
    toast(`🏝️ Đã mở Đảo ${n}! +${DR_MAX} ô nuôi rồng`);
  };
}

/* ---------- Vàng ---------- */
function drStartCoins(){
  clearTimeout(drCoinTimer);
  const tick=()=>{ if(!drActive) return; drSpawnCoin(); drCoinTimer=setTimeout(tick,2000+Math.random()*1400); };
  drCoinTimer=setTimeout(tick,drReduce?200:900);
}
// TÚI VÀNG mỗi con rồng: vàng TÍCH DẦN theo thời gian (không còn biến mất sau vài giây).
// Chạm để thu; đầy trần thì dừng tích (chờ thu) chứ không mất. Túi được LƯU nên không mất khi thoát.
function drCoinPouchCap(d){ return Math.max(300, Math.round(drGoldPerTap(d)*24)); }
function drSpawnCoin(){
  const roams=[...document.querySelectorAll('#drDragons .dr-roam')];
  if(!roams.length) return;
  const roam=roams[Math.floor(Math.random()*roams.length)];
  const idx=+roam.dataset.idx, d=drState.dragons[idx]; if(!d) return;
  const cap=drCoinPouchCap(d);
  if((d.pouch||0)>=cap) return;                              // túi đầy -> chờ thu, KHÔNG mất
  d.pouch=Math.min(cap,(d.pouch||0)+drGoldPerTap(d));        // tích dần vào túi vàng của con đó
  drRenderPouch(idx);
}
function drRenderPouch(idx){
  const roam=document.querySelector(`#drDragons .dr-roam[data-idx="${idx}"]`); if(!roam) return;
  const d=drState.dragons[idx]; if(!d) return;
  const host=roam.querySelector('.dr-bob')||roam;
  let b=host.querySelector('.dr-coin-bubble');
  if(!(d.pouch>0)){ if(b) b.remove(); return; }
  if(!b){ b=document.createElement('div'); b.className='dr-coin-bubble';
    b.onclick=ev=>{ ev.stopPropagation(); drCollectPouch(idx); };
    host.appendChild(b); }
  b.classList.toggle('full', d.pouch>=drCoinPouchCap(d));
  b.innerHTML='<div class="dr-coin">'+drIcon('gold')+'</div><span class="dr-coin-amt">'+fmtCoin(Math.round(d.pouch))+'</span>';
}
function drCollectPouch(idx){
  const d=drState.dragons[idx]; if(!d||!(d.pouch>0)) return;
  const amt=Math.round(d.pouch); d.pouch=0;
  const roam=document.querySelector(`#drDragons .dr-roam[data-idx="${idx}"]`);
  const b=roam&&roam.querySelector('.dr-coin-bubble');
  let x=innerWidth/2, y=innerHeight/2;
  if(b){ const r=b.getBoundingClientRect(); x=r.left+r.width/2; y=r.top; drFx('coin-collect', b, 64); b.remove(); }
  drGain(x,y,amt); drAddXp(1);
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
let drScrollMem={};   // nhớ vị trí cuộn từng màn popup (theo tiêu đề) để back/re-render không nhảy về đầu
function drModal(title, bodyHTML, wide){
  const feature=drModalFeature(title), meta=DR_FEATURE_UI[feature]||DR_FEATURE_UI.incubator;
  const cur=$('drModal');
  if(cur){
    // Popup ĐANG MỞ -> cập nhật NỘI DUNG tại chỗ, KHÔNG xoá + dựng lại (hết nháy/chớp khi bấm nút bên trong).
    cur.className=`dr-modal dr-modal-${feature}`;
    const sheet=cur.querySelector('.dr-sheet');
    sheet.className=`dr-sheet ${wide?'wide':''}`;
    sheet.setAttribute('data-feature',feature);
    sheet.style.setProperty('--dr-theme',meta.color); sheet.style.setProperty('--dr-theme-soft',meta.soft);
    const emblem=sheet.querySelector('.dr-sheet-emblem'); if(emblem) emblem.innerHTML=drFeatureIcon(feature);
    const tt=sheet.querySelector('.dr-sheet-copy b');
    const oldTitle = tt?tt.textContent:'';
    const old=sheet.querySelector('.dr-sheet-body');
    if(old) drScrollMem[oldTitle]=old.scrollTop;   // NHỚ vị trí cuộn của màn cũ (theo tiêu đề)
    if(tt) tt.textContent=title;
    const sub=sheet.querySelector('.dr-sheet-copy em'); if(sub) sub.textContent=meta.sub;
    const nb=document.createElement('div'); nb.className='dr-sheet-body'; nb.innerHTML=bodyHTML;
    old.replaceWith(nb);                 // thay body -> gỡ sạch listener cũ, tránh chồng sự kiện
    // KHÔI PHỤC đúng chỗ: cùng màn (nâng cấp/chọn) giữ nguyên; vào chi tiết rồi back cũng về đúng chỗ cũ.
    const want=drScrollMem[title]||0;
    nb.scrollTop=want; requestAnimationFrame(()=>{ if(nb.isConnected) nb.scrollTop=want; });
    return nb;
  }
  const m=document.createElement('div'); m.className=`dr-modal dr-modal-${feature}`; m.id='drModal';
  m.innerHTML=`<div class="dr-sheet ${wide?'wide':''}" data-feature="${feature}" style="--dr-theme:${meta.color};--dr-theme-soft:${meta.soft}">
    <div class="dr-sheet-head"><div class="dr-sheet-title"><span class="dr-sheet-emblem">${drFeatureIcon(feature)}</span>
      <span class="dr-sheet-copy"><small>ĐẢO RỒNG</small><b>${title}</b><em>${meta.sub}</em></span></div>
      <button class="dr-sheet-x" id="drModalX" aria-label="Đóng">${drFeatureIcon('close')}</button></div>
    <div class="dr-sheet-body">${bodyHTML}</div></div>`;
  $('drApp').appendChild(m);
  m.addEventListener('click',e=>{ if(e.target===m) drCloseModal(); });
  $('drModalX').onclick=drCloseModal;
  return m.querySelector('.dr-sheet-body');
}
function drCloseModal(){ const m=$('drModal'); if(m) m.remove(); drScrollMem={}; }   // đóng hẳn -> quên vị trí cuộn cũ
function drOpen(act){
  if(act==='coach'){ if(typeof drShowCoach==='function') drShowCoach(); }
  else if(act==='shop') drShowShop();
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
  else if(act==='friends'){ if(typeof drShowFriends==='function') drShowFriends(); }
  else if(act==='event'){ if(typeof drShowEvent==='function') drShowEvent(); }
  else if(act==='runes'){ if(typeof drShowRunes==='function') drShowRunes(0); }
  else if(act==='ranked'){ if(typeof drShowRanked==='function') drShowRanked(); }
  else if(act==='tower'){ if(typeof drShowTower==='function') drShowTower(); }
  else if(act==='rebirth'){ if(typeof drShowRebirth==='function') drShowRebirth(); }
  else if(act==='bag'){ if(typeof drShowBag==='function') drShowBag(); }
}
/* ---------- Túi đồ: bộ sưu tập rồng + tài nguyên + đá cường hoá ---------- */
function drShowBag(tab){
  tab=(tab==='items')?'items':'dragons';
  const nD=drState.dragons.length, runes=drState.runes||[];
  const tabs=`<div class="dr-bag-tabs">
    <button class="dr-bag-tab ${tab==='dragons'?'on':''}" data-bt="dragons">🐲 Rồng · ${nD}</button>
    <button class="dr-bag-tab ${tab==='items'?'on':''}" data-bt="items">🎒 Vật phẩm</button></div>`;
  let content;
  if(tab==='dragons'){
    const cards=drState.dragons.map((d,i)=>drDragonCard(d,i)).join('');
    content=`<p class="dr-hab-intro">Bộ sưu tập rồng — <b>${nD}</b> con trên <b>${drIslandsOwned()}</b> đảo (mỗi đảo ${DR_MAX} ô). Chạm để xem / nuôi / bán / gắn đá.</p>
      <div class="dr-bag-dgrid">${cards||'<p class="dr-muted">Chưa có rồng — lai hoặc mua trứng ở Shop!</p>'}</div>`;
  }else{
    const res=[['gold','Vàng',drState.gold],['gem','Kim cương',drState.gems],['food','Thức ăn',drState.food],['rock','Quặng',drState.ore||0]];
    const resHtml=res.map(r=>`<div class="dr-bag-res">${drIcon(r[0])}<b>${fmtCoin(r[2]||0)}</b><small>${r[1]}</small></div>`).join('');
    const runeHtml=runes.length?runes.map(r=>`<span class="dr-bag-rune">${drRuneStr(r)}</span>`).join(''):'<span class="dr-muted">Chưa có đá — ghép ở Cường hoá.</span>';
    content=`<div class="dr-sub2">Tài nguyên</div>
      <div class="dr-bag-resrow">${resHtml}</div>
      <div class="dr-sub2">💎 Đá cường hoá · ${runes.length}</div>
      <div class="dr-bag-runes">${runeHtml}</div>
      <button class="dr-btn alt block" id="drBagRunes">⚒️ Gắn đá cho rồng (Cường hoá)</button>`;
  }
  const bd=drModal('🎒 Túi đồ', tabs+content, true);
  bd.querySelectorAll('[data-bt]').forEach(b=>b.onclick=()=>drShowBag(b.dataset.bt));
  bd.querySelectorAll('.dr-dcard[data-idx]').forEach(b=>b.onclick=()=>drShowDragon(+b.dataset.idx));
  const rb=$('drBagRunes'); if(rb) rb.onclick=()=>{ if(typeof drShowRunes==='function') drShowRunes(0); };
}
function drDragonCard(d,i,extra){
  const s=DR_SPECIES[d.sp], evo=drEvolution(d.lv);
  return `<button class="dr-dcard" data-idx="${i}" ${extra||''}><span class="dr-dcard-mini">${drDragonArt(d)}</span>`
    +`<b>${esc(s.name)}</b><span class="dr-lv">Lv${d.lv} · ${evo.name}</span>${drRarChip(s.rar)}<span class="dr-cardstar">${drStarBadge(d)}</span></button>`;
}

/* ---------- Chi tiết rồng: cho ăn / bán / lai ---------- */
function drShowDragon(i){
  const d=drState.dragons[i]; if(!d) return; const s=DR_SPECIES[d.sp];
  const need=drFoodToNext(d.lv), pct=Math.min(100,Math.round(d.fed/need*100));
  const evo=drEvolution(d.lv), nextEvo=drEvolutionNext(d.lv);
  const mx=drMaxLv(d), atCap=d.lv>=mx, absMax=d.lv>=DR_LV_MAX;   // trần cấp theo sao
  const body=`
    <div class="dr-detail">
      <div class="dr-detail-art dr-detail-${evo.id}">${drDragonArt(d)}</div>
      <div class="dr-detail-info">
        <div class="dr-detail-name">${esc(s.name)} ${drRarChip(s.rar)}</div>
        <div class="dr-chips">${s.els.map(drElChip).join('')}</div>
        <div class="dr-kv"><span>Cấp</span><b>Lv ${d.lv}</b></div>
        <div class="dr-kv"><span>Tiến hoá</span><b class="dr-evo-name dr-evo-name-${evo.id}">${evo.name}</b></div>
        <div class="dr-kv"><span>Sao</span><b class="dr-stars">${drStarPips(d)}</b></div>
        <div class="dr-kv"><span>Sinh vàng</span><b>~${Math.round(s.gold*drLvGoldMul(d.lv)*1.4*drStarGoldMult(d)*drForgeGoldMult())} 🪙/lượt</b></div>
        <div class="dr-kv"><span>Sức mạnh</span><b>${drPower(d)} ⚔️</b></div>
        <div class="dr-feedbar"><i style="width:${atCap?100:pct}%"></i><em>${atCap?`Lv tối đa ${mx} (theo sao)`:`${d.fed}/${need} 🍖 tới Lv${d.lv+1}`}</em></div>
        <div class="dr-kv"><span>Trần cấp</span><b>Lv ${mx}${absMax?' (tối đa)':` · ${drStar(d)}★`}</b></div>
        ${nextEvo?`<div class="dr-evo-next">✨ ${nextEvo.name} mở tại Lv${nextEvo.minLv}</div>`:`<div class="dr-evo-next max">👑 Đã đạt hình thái Legend</div>`}
      </div>
    </div>
    ${atCap&&!absMax&&drStar(d)<DR_STAR_MAX?`<div class="dr-lvgate">🔒 Kịch trần <b>Lv${mx}</b> với ${drStar(d)}★ — <b>nâng sao</b> để lên cấp cao hơn (mỗi sao +${DR_LV_PER_STAR} cấp)</div>`:''}
    ${drStar(d)<DR_STAR_MAX
      ? `<button class="dr-btn alt block" id="drStarUp">⭐ Nâng sao ${drStar(d)}→${drStar(d)+1} · ${fmtCoin(drStarCost(drStar(d)).gold)}🪙 ${drStarCost(drStar(d)).gems}💎</button>`
      : `<div class="dr-star-max">⭐ Đã đạt sao tối đa (${DR_STAR_MAX}★)</div>`}
    ${!atCap?`<div class="dr-feed-actions">
      <button class="dr-btn sm" id="drFeed1">🍖 +10</button>
      <button class="dr-btn sm go" id="drFeedLv">⚡ Lên cấp (${fmtCoin(Math.max(0,need-d.fed))}🍖)</button>
      <button class="dr-btn sm alt" id="drFeedMax">⏫ Tối đa</button>
    </div>`:''}
    <div class="dr-detail-btns">
      <button class="dr-btn alt" id="drToBreed">💞 Đưa đi lai</button>
      <button class="dr-btn warn" id="drSell">Bán · +${fmtCoin(drSellPrice(d))} 🪙</button>
    </div>`;
  drModal(esc(s.name), body);
  const feed=$('drFeed1'); if(feed) feed.onclick=()=>drFeed(i,10);
  const flv=$('drFeedLv'); if(flv) flv.onclick=()=>drFeedToLevel(i);
  const fmx=$('drFeedMax'); if(fmx) fmx.onclick=()=>drFeedMax(i);
  const su=$('drStarUp'); if(su) su.onclick=()=>drUpgradeStar(i);
  $('drToBreed').onclick=()=>{ drCloseModal(); drShowBreed(i); };
  $('drSell').onclick=()=>drSell(i);
}
// ⚡ Cho ăn ĐỦ để lên 1 cấp trong 1 chạm; thiếu 🍖 thì hỏi mua thêm bằng vàng.
const DR_FOOD_GOLD=5;   // giá 1 🍖 = 5 vàng (khớp gói shop 20🍖/100🪙)
function drFeedToLevel(i){
  const d=drState.dragons[i]; if(!d) return;
  if(drLvCapped(d)){ drCapToast(d); return; }
  const need=drFoodToNext(d.lv), remain=Math.max(1, need-(d.fed||0));
  if((drState.food||0)>=remain){ drFeed(i, remain); return; }     // đủ -> lên cấp luôn
  drAskBuyFood(i, remain-(drState.food||0), remain);              // thiếu -> hỏi mua
}
// ⏫ Dồn HẾT thức ăn đang có để lên càng nhiều cấp càng tốt (chế độ "auto" nhanh).
function drFeedMax(i){
  const d=drState.dragons[i]; if(!d) return;
  if(drLvCapped(d)){ drCapToast(d); return; }
  const before=drEvolution(d.lv).id; let ups=0;
  while(d.lv<drMaxLv(d)){ const need=drFoodToNext(d.lv), remain=need-(d.fed||0);
    if((drState.food||0)<remain) break;
    drState.food-=remain; d.fed=0; d.lv++; ups++; }
  if(!ups){ const need=drFoodToNext(d.lv), remain=need-(d.fed||0); drAskBuyFood(i, remain-(drState.food||0), remain); return; }
  drQC('feed'); for(let k=0;k<ups;k++) drAddXp(15);
  drEvolutionNotice(d,before);
  drRenderHud(); drRenderDragons(); drSave(); drShowDragon(i);
  toast('⏫ Lên '+ups+' cấp · giờ Lv'+d.lv+'!');
}
// Hỏi mua thêm 🍖 bằng vàng để lên cấp ngay (đúng ý "nâng cấp xong hỏi mua thêm bằng tiền").
function drAskBuyFood(i, shortfall, remainForLevel){
  shortfall=Math.max(1,Math.ceil(shortfall)); const price=shortfall*DR_FOOD_GOLD;
  const d=drState.dragons[i], s=DR_SPECIES[d.sp], afford=(drState.gold||0)>=price;
  const body=`<p class="dr-note">Thiếu <b>${fmtCoin(shortfall)} 🍖</b> để <b>${esc(s.name)}</b> lên Lv${d.lv+1}. Mua thêm bằng vàng để lên ngay?</p>
    <div class="dr-kv"><span>Mua thêm</span><b>${fmtCoin(shortfall)} 🍖</b></div>
    <div class="dr-kv"><span>Giá</span><b>${fmtCoin(price)} 🪙</b></div>
    <div class="dr-kv"><span>Bạn đang có</span><b>${fmtCoin(drState.gold||0)} 🪙</b></div>
    <button class="dr-btn go block" id="drBuyFeedGo" ${afford?'':'disabled'}>${afford?('🪙 Mua & lên cấp · '+fmtCoin(price)):'Không đủ vàng'}</button>
    <button class="dr-btn block" id="drBuyFeedNo">Để sau</button>`;
  drModal('Mua thức ăn?', body);
  const go=$('drBuyFeedGo'); if(go) go.onclick=()=>{ if((drState.gold||0)<price){ toast('Thiếu vàng'); return; }
    drState.gold-=price; drState.food=(drState.food||0)+shortfall; drFeed(i, remainForLevel); };
  const no=$('drBuyFeedNo'); if(no) no.onclick=()=>drShowDragon(i);
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
  if(drLvCapped(d)){ drCapToast(d); return; }
  const before=drEvolution(d.lv).id;
  drState.food-=amount; d.fed+=amount; drQC('feed'); drAddXp(2);
  const need=drFoodToNext(d.lv);
  if(d.fed>=need && d.lv<drMaxLv(d)){ d.fed-=need; d.lv++; drAddXp(15); drEvolutionNotice(d,before); }
  if(d.lv>=drMaxLv(d)) d.fed=0;                                   // chạm trần -> không dồn dư thức ăn
  drRenderHud(); drRenderDragons(); drSave(); drShowDragon(i);   // refresh
}
function drEvolutionNotice(d,before){
  const evo=drEvolution(d.lv);
  if(evo.id!==before){
    toast(`✨ ${DR_SPECIES[d.sp].name} tiến hoá thành ${evo.name}!`);
    if(typeof confetti==='function') confetti(); drFx('unlock');
  }else{ toast('🐉 '+DR_SPECIES[d.sp].name+' lên Lv'+d.lv+'!'); drFx('level-up'); }
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
  clearInterval(drBreedTimer);
  // đang lai dở?
  if(drState.breed&&drState.breed.readyAt){
    const left=Math.max(0,Math.round((drState.breed.readyAt-drNow())/1000));
    const rs=DR_SPECIES[drState.breed.resultEl]?drState.breed.resultEl:'fire';
    const body=`<div class="dr-breed-run">
      <div class="dr-egg-big">${drDragonArt({sp:rs,lv:1})}</div>
      ${left>0?`<div class="dr-timer">⏳ Còn ${drFmtTime(left)}</div>
        <button class="dr-btn" id="drSkip">Tua nhanh · ${Math.max(1,Math.ceil(left/60))} 💎</button>`
      :`<div class="dr-timer ready">🥚 Trứng đã sẵn sàng!</div>
        <button class="dr-btn hero hp-success" id="drHatch">Nở rồng 🎉</button>`}
      <p class="dr-note">Đưa 2 rồng vào để ra trứng theo cặp nguyên tố.</p></div>`;
    drModal('Lai Rồng', body);
    const skipCost=()=>Math.max(1,Math.ceil(Math.max(0,(drState.breed.readyAt-drNow())/1000)/60));
    if($('drSkip')) $('drSkip').onclick=()=>{ const need=skipCost(); if(drState.gems<need){toast('Thiếu 💎');return;} drState.gems-=need; drState.breed.readyAt=drNow(); drRenderHud(); drSave(); drShowBreed(); };
    if($('drHatch')) $('drHatch').onclick=drHatch;
    // Đếm giây LIVE ngay trong modal (trước đây đứng yên "Còn 30s")
    drBreedTimer=setInterval(()=>{
      if(!$('drModal')||!drState.breed||!drState.breed.readyAt){ clearInterval(drBreedTimer); return; }
      const l=Math.max(0,Math.round((drState.breed.readyAt-drNow())/1000));
      if(l>0){
        const tm=document.querySelector('#drModal .dr-timer'); if(tm) tm.textContent='⏳ Còn '+drFmtTime(l);
        const sk=$('drSkip'); if(sk) sk.textContent='Tua nhanh · '+skipCost()+' 💎';
      }else{ clearInterval(drBreedTimer); drShowBreed(); }   // hết giờ -> tự chuyển sang nút Nở rồng
    },1000);
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
          return `<div class="dr-odd"><span class="dr-odd-mini">${drDragonArt({sp:o.sp,lv:1})}</span><b>${esc(s.name)}</b>${drRarChip(s.rar)}<span class="dr-odd-pct">${o.pct}%</span></div>`; }).join('')}</div>`
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
  if(drState.dragons.length>=drCapacity()){ toast(drFullMsg()); return; }
  const sp=DR_SPECIES[drState.breed.resultEl]?drState.breed.resultEl:'fire';
  drState.dragons.push({sp,lv:1,fed:0}); drState.breed=null; drQC('breed'); drFocusLast();
  drAddXp(30); drRenderHud(); drRenderDragons(); drRenderEgg(); drSave();
  drCloseModal(); drFx('egg-hatch'); drNewSp(sp);
  const rar=(DR_SPECIES[sp]||{}).rar, pk=rar==='legendary'?'legendary':(rar==='epic'||rar==='rare')?'crystal':'common';
  const rl=rar==='legendary'?'🌟 Huyền Thoại!':rar==='epic'?'💜 Cực Hiếm!':rar==='rare'?'✨ Rồng Hiếm!':'🥚 Rồng mới!';
  drRevealCard(pk, `${drDragonArt({sp,lv:1})}<b>${esc(DR_SPECIES[sp].name)}</b><small>${rl}</small>`);
}

/* ---------- Bảng nhiệm vụ ---------- */
function drRotRow(q, scope){
  const val=drRotProg(q,scope), done=val>=q.target, claimed=drRotClaimed(scope).includes(q.id), pct=Math.round(val/q.target*100);
  const right = claimed ? `<span class="dr-q-done">✓ Đã nhận</span>`
    : done ? `<button class="dr-btn sm go" data-rot="${q.id}" data-scope="${scope}">Nhận</button>`
    : `<span class="dr-q-prog">${val}/${q.target}</span>`;
  return `<div class="dr-quest ${claimed?'claimed':(done?'ready':'')}">
      <span class="dr-q-ic">${drIcon(q.ic)}</span>
      <div class="dr-q-mid"><b>${esc(q.name)}</b><small>${drRewardText(q.r)}</small>
        <div class="dr-q-bar"><i style="width:${pct}%"></i></div></div>
      ${right}</div>`;
}
function drJourneySection(){
  const idx=drJIdx(), total=DR_JOURNEY.length;
  if(idx>=total) return `<div class="dr-journey-done">🧭 <b>Đã hoàn tất Hành trình Đảo Rồng!</b> 🏆</div>`;
  const s=DR_JOURNEY[idx], val=Math.min(drQuestVal(s),s.target), ready=drQuestVal(s)>=s.target, pct=Math.round(val/s.target*100);
  const rw=drRewardText(s.r)+(s.dragon?(' · 🐣 '+(DR_SPECIES[s.dragon]?DR_SPECIES[s.dragon].name:'Rồng')):'');
  const cur=`<div class="dr-journey-cur ${ready?'ready':''}">
      <div class="dr-journey-badge">Chặng ${idx+1}/${total}${s.evo?' · 🧬 Tiến hoá':''}</div>
      <div class="dr-quest ${ready?'ready':''}"><span class="dr-q-ic">${drIcon(s.ic)}</span>
        <div class="dr-q-mid"><b>${esc(s.name)}</b><small>${esc(s.desc)} · <em>${rw}</em></small>
          <div class="dr-q-bar"><i style="width:${pct}%"></i></div></div>
        ${ready?`<button class="dr-btn sm go" id="drJClaim">Nhận</button>`:`<span class="dr-q-prog">${val}/${s.target}</span>`}</div></div>`;
  const nexts=DR_JOURNEY.slice(idx+1, idx+3).map(n=>`<div class="dr-journey-next"><span>${n.evo?'🧬':'🔒'}</span><b>${esc(n.name)}</b><em>${drRewardText(n.r)}</em></div>`).join('');
  return cur + (nexts?`<div class="dr-journey-preview">${nexts}</div>`:'');
}
function drBonusRow(scope){
  const all=(scope==='w')?drWeeklyAllDone():drDailyAllDone();
  if(!all) return '';
  const ready=(scope==='w')?drWeeklyBonusReady():drDailyBonusReady();
  const rw=drRewardText((scope==='w')?DR_WEEKLY_BONUS:DR_DAILY_BONUS);
  const id=(scope==='w')?'drWeekBonus':'drDayBonus';
  return `<div class="dr-quest ${ready?'ready':'claimed'} dr-bonus-row"><span class="dr-q-ic">${drIcon('gift')}</span>
      <div class="dr-q-mid"><b>Rương hoàn thành ${scope==='w'?'tuần':'ngày'}</b><small>Xong tất cả nhiệm vụ ${scope==='w'?'tuần':'ngày'} · <em>${rw}</em></small></div>
      ${ready?`<button class="dr-btn sm go" id="${id}">Mở 🎁</button>`:`<span class="dr-q-done">✓ Đã mở</span>`}</div>`;
}
let drQuestTab='journey';
function drQuestTabCounts(){
  return { jr:drJReady()?1:0,
    rot:drRotClaimCount()+(drDailyBonusReady()?1:0)+(drWeeklyBonusReady()?1:0),
    mile:DR_QUESTS.filter(drQuestClaimable).length };
}
// NHẬN NHANH: gom hết nhiệm vụ ngày/tuần + cột mốc + rương đang sẵn sàng, nhận 1 lần (Hành trình có nút riêng).
function drClaimAllQuests(){
  let n=0; const R={gold:0,gems:0,food:0}; const add=r=>{ if(!r)return; R.gold+=r.gold||0; R.gems+=r.gems||0; R.food+=r.food||0; };
  drDailyQuests().forEach(q=>{ if(drRotClaimable(q,'d')){ drRotClaimed('d').push(q.id); add(q.r); n++; } });
  drWeeklyQuests().forEach(q=>{ if(drRotClaimable(q,'w')){ drRotClaimed('w').push(q.id); add(q.r); n++; } });
  DR_QUESTS.forEach(q=>{ if(drQuestClaimable(q)){ drState.qClaimed=(drState.qClaimed||[]).concat(q.id); add({gold:q.gold,gems:q.gems,food:q.food}); n++; } });
  if(drDailyBonusReady()){ drState.dq.bonus=true; add(DR_DAILY_BONUS); n++; }
  if(drWeeklyBonusReady()){ drState.wq.bonus=true; add(DR_WEEKLY_BONUS); n++; }
  if(!n){ toast('Chưa có nhiệm vụ nào để nhận'); return; }
  drState.gold+=R.gold; drState.gems+=R.gems; drState.food+=R.food;
  drRenderHud(); drSave(); if(typeof drUpdateQuestDot==='function') drUpdateQuestDot();
  if(typeof confetti==='function') confetti();
  toast('🎁 Nhận nhanh '+n+' nhiệm vụ: +'+drRewardText(R));
  drShowQuests();
}
function drMileRows(){
  return DR_QUESTS.map(q=>{
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
}
function drShowQuests(tab){
  drQuestTab = tab || drQuestTab || 'journey';
  const c=drQuestTabCounts();
  const badge=n=>n>0?`<i class="dr-tab-badge">${n}</i>`:'';
  const tabs=`<div class="dr-tabs">
      <button class="dr-tab ${drQuestTab==='journey'?'on':''}" data-qtab="journey">🧭 Hành trình${badge(c.jr)}</button>
      <button class="dr-tab ${drQuestTab==='rot'?'on':''}" data-qtab="rot">📅 Ngày·Tuần${badge(c.rot)}</button>
      <button class="dr-tab ${drQuestTab==='mile'?'on':''}" data-qtab="mile">🏆 Cột mốc${badge(c.mile)}</button>
    </div>`;
  const totalClaim=c.rot+c.mile;
  const allBtn=(totalClaim>=2)?`<button class="dr-btn go block" id="drClaimAllQ">⚡ Nhận nhanh tất cả (${totalClaim})</button>`:'';
  let content='';
  if(drQuestTab==='journey'){
    content=`<p class="dr-hab-intro">Theo tuyến Hành trình để nhận thưởng leo thang — xương sống là các mốc <b>Tiến hoá</b> 🧬.</p>${drJourneySection()}`;
  } else if(drQuestTab==='rot'){
    const dq=drDailyQuests().map(q=>drRotRow(q,'d')).join('')+drBonusRow('d');
    const wq=drWeeklyQuests().map(q=>drRotRow(q,'w')).join('')+drBonusRow('w');
    content=`${allBtn}<div class="dr-sub2">📅 Nhiệm vụ ngày <small class="dr-q-reset">(đổi mới mỗi ngày)</small></div><div class="dr-qlist">${dq}</div>
      <div class="dr-sub2">🗓️ Nhiệm vụ tuần <small class="dr-q-reset">(đổi mới mỗi tuần)</small></div><div class="dr-qlist">${wq}</div>`;
  } else {
    content=`${allBtn}<p class="dr-hab-intro">Cột mốc lớn — hoàn thành nhận 💎, mỗi mốc 1 lần.</p><div class="dr-qlist">${drMileRows()}</div>`;
  }
  drModal('Nhiệm vụ', tabs+content, true);
  $('drModal').querySelectorAll('[data-qtab]').forEach(b=>b.onclick=()=>drShowQuests(b.dataset.qtab));
  const ca=$('drClaimAllQ'); if(ca) ca.onclick=drClaimAllQuests;
  const jc=$('drJClaim'); if(jc) jc.onclick=drClaimJourney;
  const db=$('drDayBonus'); if(db) db.onclick=drClaimDailyBonus;
  const wb=$('drWeekBonus'); if(wb) wb.onclick=drClaimWeeklyBonus;
  $('drModal').querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>drClaimQuest(b.dataset.claim));
  $('drModal').querySelectorAll('[data-rot]').forEach(b=>b.onclick=()=>drClaimRot(b.dataset.rot, b.dataset.scope));
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

/* ============ HÀNH TRÌNH ĐẢO RỒNG (chuỗi nhiệm vụ nối tiếp, mở khoá dần) ============
   Chiều sâu: người chơi đi theo 1 tuyến dài dẫn từ tân thủ → cao thủ; xong chặng này mới mở chặng sau,
   thưởng leo thang. Xương sống là các mốc TIẾN HOÁ (Teen→Adult→Legend→bầy Legend) xen kẽ kinh tế/đấu/sưu tầm.
   Tiến độ = drState.journey (số chặng ĐÃ xong). Chỉ chặng hiện tại mới nhận được; nhận xong tự mở chặng kế. */
const DR_JOURNEY=[
  {name:'Chào mừng đến Đảo',  desc:'Cho rồng ăn 5 lần',        type:'feed',    target:5,  ic:'food',  r:{gold:400}},
  {name:'Người đãi vàng',     desc:'Chạm thu vàng 30 lần',     type:'tap',     target:30, ic:'gold',  r:{gold:800,gems:2}},
  {name:'Tiến Hoá Đầu Tiên',  desc:'Nuôi 1 rồng lên Thiếu Niên (Lv5)', type:'evostage', target:1, ic:'star', evo:true, r:{gems:4,food:30}},
  {name:'Đấu sĩ nhập môn',    desc:'Thắng 5 trận',             type:'win',     target:5,  ic:'arena', r:{gems:3}},
  {name:'Nhà lai tạo',        desc:'Lai/nở 2 rồng',            type:'breed',   target:2,  ic:'breed', r:{gems:4}},
  {name:'Nhà sưu tầm',        desc:'Sở hữu 6 loài rồng',       type:'species', target:6,  ic:'codex', r:{gems:5}},
  {name:'Rồng Trưởng Thành',  desc:'Nuôi 1 rồng lên Trưởng Thành (Lv9)', type:'evostage', target:2, ic:'star', evo:true, r:{gems:7,gold:2000}},
  {name:'Kẻ thám hiểm',       desc:'Vượt 3 màn Phiêu lưu',     type:'advst',   target:3,  ic:'arena', r:{gems:7}},
  {name:'Chinh phục Tháp',    desc:'Lên Tầng 5 Tháp',          type:'towerf',  target:5,  ic:'rock',  r:{gems:8}},
  {name:'Đảo phồn vinh',      desc:'Đạt cấp đảo 6',            type:'islvl',   target:6,  ic:'star',  r:{gems:8,gold:3000}},
  {name:'Chiến thần',         desc:'Thắng 25 trận',            type:'win',     target:25, ic:'arena', r:{gems:10}},
  {name:'Hình Thái Huyền Thoại',desc:'Nuôi 1 rồng lên Huyền Thoại (Lv13)', type:'evostage', target:3, ic:'gem', evo:true, r:{gems:14,food:80}},
  {name:'Đàn rồng hùng hậu',  desc:'Sở hữu 10 rồng',           type:'own',     target:10, ic:'egg',   r:{gems:10}},
  {name:'Ngũ tinh',           desc:'Nâng 1 rồng đạt 5★',       type:'stars',   target:5,  ic:'gem',   r:{gems:14}},
  {name:'Đế chế phiêu lưu',   desc:'Vượt 6 màn Phiêu lưu',     type:'advst',   target:6,  ic:'arena', r:{gems:16,gold:6000}},
  {name:'Bầy Huyền Thoại',    desc:'Có 3 rồng Huyền Thoại',    type:'legends', target:3,  ic:'gem', evo:true, r:{gems:30,dragon:'rainbow'}},
];
function drJIdx(){ return Math.max(0, Math.min(DR_JOURNEY.length, drState.journey||0)); }
function drJStage(){ return DR_JOURNEY[drJIdx()]||null; }
function drJReady(){ const s=drJStage(); return !!s && drQuestVal(s)>=s.target; }
function drJourneyCount(){ return drJReady()?1:0; }
function drClaimJourney(){
  const s=drJStage(); if(!s||drQuestVal(s)<s.target) return;
  if(s.dragon && DR_SPECIES[s.dragon]){
    if(drState.dragons.length < (typeof drCapacity==='function'?drCapacity():12)){
      drState.dragons.push({sp:s.dragon,lv:1,fed:0,star:1}); drFocusLast(); if(typeof drRenderDragons==='function') drRenderDragons();
      toast('🥚 Phần thưởng Hành trình: '+DR_SPECIES[s.dragon].name+'!');
    } else { drState.gems+=25; toast('Đảo đầy — quy đổi rồng thành +25 💎'); }
  }
  drReward({gold:s.r.gold, gems:s.r.gems, food:s.r.food});
  drState.journey=drJIdx()+1;
  drRenderHud(); drSave(); if(typeof drUpdateQuestDot==='function') drUpdateQuestDot();
  if(typeof confetti==='function') confetti();
  toast('🧭 Hoàn thành chặng: '+s.name+'! +'+drRewardText(s.r));
  drShowQuests();
}

/* ---- Rương HOÀN THÀNH TẤT CẢ nhiệm vụ ngày/tuần (thưởng thêm để khuyến khích làm trọn bộ) ---- */
const DR_DAILY_BONUS={gems:5}, DR_WEEKLY_BONUS={gold:5000,gems:20};
function drDailyAllDone(){ const c=drRotClaimed('d'); return drDailyQuests().every(q=>c.includes(q.id)); }
function drWeeklyAllDone(){ const c=drRotClaimed('w'); return drWeeklyQuests().every(q=>c.includes(q.id)); }
function drDailyBonusReady(){ drRotClaimed('d'); return drDailyAllDone() && !drState.dq.bonus; }
function drWeeklyBonusReady(){ drRotClaimed('w'); return drWeeklyAllDone() && !drState.wq.bonus; }
function drClaimDailyBonus(){ if(!drDailyBonusReady()) return; drState.dq.bonus=true; drReward(DR_DAILY_BONUS);
  drRenderHud(); drSave(); if(typeof drUpdateQuestDot==='function') drUpdateQuestDot(); if(typeof confetti==='function') confetti();
  toast('🎁 Rương ngày: +'+drRewardText(DR_DAILY_BONUS)); drShowQuests(); }
function drClaimWeeklyBonus(){ if(!drWeeklyBonusReady()) return; drState.wq.bonus=true; drReward(DR_WEEKLY_BONUS);
  drRenderHud(); drSave(); if(typeof drUpdateQuestDot==='function') drUpdateQuestDot(); if(typeof confetti==='function') confetti();
  toast('🎁 Rương tuần: +'+drRewardText(DR_WEEKLY_BONUS)); drShowQuests(); }

/* ---------- Vàng offline (idle) — dùng GIỜ SERVER + cap để chống tua đồng hồ ---------- */
const DR_OFFLINE_CAP_H=8;              // tích luỹ tối đa 8 giờ
const DR_OFFLINE_K=0.45;              // hệ số vàng offline / phút cho mỗi rồng (giảm từ 0.6 chống lạm phát)
function drOfflineRatePerMin(){        // tổng vàng/phút của cả đàn (theo cấp, sao, bùa vàng)
  const base=(drState.dragons||[]).reduce((sum,d)=>sum + DR_SPECIES[d.sp].gold * drLvGoldMul(d.lv) * drStarGoldMult(d), 0);
  return base * drForgeGoldMult() * drRebirthGoldMult() * DR_OFFLINE_K;
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
    <button class="dr-btn hero hp-legendary block" id="drSpinBtn">${drSpinBtnLabel()}</button>`;
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
  if(typeof drQC==='function') drQC('spin'); if(typeof drUpdateQuestDot==='function') drUpdateQuestDot();
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
    if(drState.dragons.length<drCapacity()){ drState.dragons.push({sp,lv:1,fed:0,star:1}); drFocusLast(); drQC('breed'); drNewSp(sp); msg=`🥚 Rồng hiếm: ${DR_SPECIES[sp].name}!`; }
    else{ drState.gems+=15; msg='Các đảo đầy ô — quy đổi +15 💎'; }
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
  drNotify('mail','Đã nhận quà từ hòm thư!');
  drShowMail();
}

/* ---------- Shop ---------- */
const DR_SHOP_RARE_POOL=['electric','ice','lava','steam','swamp','storm','dark','rose','lotus','peony','bubblegum','aurora','carnival','prism','starlight','rainbow','mint','lemon','berry','coral','cloud',
  'cotton-candy','strawberry-cream','blossom-bubble','cherry-soda','pearl-lotus','rose-quartz','moon-ribbon','rainbow-mochi','starlight-bow','cupid-heart'];  // trứng hiếm: loài hiếm/epic đã có sprite (gồm 10 rồng dễ thương mới)
const DR_SHOP_LEGEND_POOL=['kaleidoscope','light'];   // trứng huyền thoại
function drShowShop(){
  const body=`<div class="dr-shop-grid">
    <div class="dr-shop-item"><div class="dr-shop-ic">${drIcon('egg')}</div><b>Trứng thường</b><small>Nở 1 rồng nguyên tố cơ bản</small><button class="dr-btn" id="drBuyEgg">250 🪙</button></div>
    <div class="dr-shop-item"><div class="dr-shop-ic">${drIcon('star')}</div><b>Trứng HIẾM</b><small>Nở rồng hiếm/epic (Cực Quang, Lễ Hội, Hoa Sen, Cầu Vồng…)</small><button class="dr-btn alt" id="drBuyEggRare">40 💎</button></div>
    <div class="dr-shop-item"><div class="dr-shop-ic">${drIcon('gift')}</div><b>Trứng HUYỀN THOẠI</b><small>Chắc chắn rồng huyền thoại (Vạn Hoa / Thần Long)</small><button class="dr-btn alt" id="drBuyEggLegend">120 💎</button></div>
    <div class="dr-shop-item"><div class="dr-shop-ic">${drIcon('food')}</div><b>Thức ăn ×20</b><small>Cho rồng lên cấp</small><button class="dr-btn" id="drBuyFood">100 🪙</button></div>
    <div class="dr-shop-item"><div class="dr-shop-ic">${drIcon('food')}</div><b>Thức ăn ×100</b><small>Gói lớn tiết kiệm</small><button class="dr-btn" id="drBuyFood100">400 🪙</button></div>
    <div class="dr-shop-item"><div class="dr-shop-ic">${drIcon('gem')}</div><b>Đổi 30 🍖</b><small>Mua thức ăn bằng kim cương</small><button class="dr-btn alt" id="drBuyFood2">3 💎</button></div>
    <div class="dr-shop-item"><div class="dr-shop-ic">${drIcon('rock')}</div><b>Quặng ×10 ⛏️</b><small>Nguyên liệu Lò rèn</small><button class="dr-btn alt" id="drBuyOre">5 💎</button></div>
    <div class="dr-shop-item"><div class="dr-shop-ic">${drIcon('gold')}</div><b>Túi vàng 🪙5.000</b><small>Đổi kim cương lấy vàng</small><button class="dr-btn alt" id="drBuyGold">5 💎</button></div>
  </div><p class="dr-note">Rồng cực hiếm có được qua <b>Lai rồng</b> 💞 và <b>Chúc phúc</b>.</p>`;
  drModal('Shop', body);
  const full=()=>{ if(drState.dragons.length>=drCapacity()){ toast(drFullMsg()); return true; } return false; };
  $('drBuyEgg').onclick=()=>{ if(full())return; if(drState.gold<250){toast('Thiếu vàng');return;}
    drState.gold-=250; const sp=['fire','water','plant','earth'][Math.floor(Math.random()*4)]; drState.dragons.push({sp,lv:1,fed:0}); drFocusLast();
    drAddXp(10); drRenderHud(); drRenderDragons(); drSave(); drFx('egg-hatch'); drNewSp(sp);
    drRevealCard('common', `${drDragonArt({sp,lv:1})}<b>${esc(DR_SPECIES[sp].name)}</b><small>🥚 Rồng mới!</small>`); };
  $('drBuyEggRare').onclick=()=>{ if(full())return; if(drState.gems<40){toast('Thiếu 💎 (cần 40)');return;}
    drState.gems-=40; const sp=DR_SHOP_RARE_POOL[Math.floor(Math.random()*DR_SHOP_RARE_POOL.length)]; drState.dragons.push({sp,lv:1,fed:0,star:1}); drFocusLast();
    drAddXp(30); if(typeof confetti==='function') confetti(); drFx('egg-hatch'); drRenderHud(); drRenderDragons(); drSave(); drNewSp(sp);
    drRevealCard('crystal', `${drDragonArt({sp,lv:1})}<b>${esc(DR_SPECIES[sp].name)}</b><small>✨ Rồng Hiếm!</small>`); };
  $('drBuyEggLegend').onclick=()=>{ if(full())return; if(drState.gems<120){toast('Thiếu 💎 (cần 120)');return;}
    drState.gems-=120; const sp=DR_SHOP_LEGEND_POOL[Math.floor(Math.random()*DR_SHOP_LEGEND_POOL.length)]; drState.dragons.push({sp,lv:1,fed:0,star:1}); drFocusLast();
    drAddXp(50); if(typeof confetti==='function') confetti(); drFx('egg-hatch'); drRenderHud(); drRenderDragons(); drSave(); drNewSp(sp);
    drRevealCard('legendary', `${drDragonArt({sp,lv:1})}<b>${esc(DR_SPECIES[sp].name)}</b><small>🌟 Rồng Huyền Thoại!</small>`); };
  $('drBuyFood').onclick=()=>{ if(drState.gold<100){drNotify('warning','Thiếu vàng để mua');return;} drState.gold-=100; drState.food+=20; drRenderHud(); drBump('drFood'); drSave(); drNotify('success','Đã mua +20 🍖'); };
  $('drBuyFood100').onclick=()=>{ if(drState.gold<400){drNotify('warning','Thiếu vàng để mua');return;} drState.gold-=400; drState.food+=100; drRenderHud(); drBump('drFood'); drSave(); drNotify('success','Đã mua +100 🍖'); };
  $('drBuyFood2').onclick=()=>{ if(drState.gems<3){drNotify('warning','Thiếu 💎');return;} drState.gems-=3; drState.food+=30; drRenderHud(); drBump('drFood'); drSave(); drNotify('success','Đã mua +30 🍖'); };
  $('drBuyOre').onclick=()=>{ if(drState.gems<5){drNotify('warning','Thiếu 💎 (cần 5)');return;} drState.gems-=5; drState.ore=(drState.ore||0)+10; drRenderHud(); drBump('drOre'); drSave(); drNotify('success','Đã mua +10 ⛏️ quặng'); };
  $('drBuyGold').onclick=()=>{ if(drState.gems<5){drNotify('warning','Thiếu 💎 (cần 5)');return;} drState.gems-=5; drState.gold+=5000; drRenderHud(); drBump('drGold'); drSave(); drNotify('success','Đã đổi +5.000 🪙'); };
}

/* ---------- Cho ăn (chọn rồng để nuôi) ---------- */
function drShowFeed(){
  const list=drState.dragons.map((d,i)=>{ const s=DR_SPECIES[d.sp], cap=drLvCapped(d), need=drFoodToNext(d.lv), pct=cap?100:Math.min(100,Math.round(d.fed/need*100));
    return `<div class="dr-feed-row"><span class="dr-dcard-mini sm">${drDragonArt(d)}</span>
      <div class="dr-feed-mid"><b>${esc(s.name)} · Lv${d.lv} · ${drEvolution(d.lv).name}</b><div class="dr-feedbar sm"><i style="width:${pct}%"></i></div></div>
      <button class="dr-btn sm" data-feed="${i}" ${cap?'disabled':''}>${cap?(drStar(d)<DR_STAR_MAX?'⭐ sao':'👑 max'):'🍖 +10'}</button></div>`; }).join('');
  const body=`<div class="dr-feed-top">Bạn có <b>${fmtCoin(drState.food)} 🍖</b> · <button class="dr-linkbtn" id="drGetFood">＋ Mua thức ăn</button></div>
    <div class="dr-feedlist">${list}</div>`;
  drModal('Cho ăn', body);
  $('drGetFood').onclick=drShowShop;
  $('drModal').querySelectorAll('[data-feed]').forEach(b=>b.onclick=()=>drFeedInline(+b.dataset.feed));
}
function drFeedInline(i){
  const d=drState.dragons[i]; if(!d) return;
  if(drState.food<10){ toast('Thiếu thức ăn'); return; }
  if(drLvCapped(d)){ drCapToast(d); return; }
  const before=drEvolution(d.lv).id;
  drState.food-=10; d.fed+=10; drQC('feed'); drAddXp(2);
  const need=drFoodToNext(d.lv);
  if(d.fed>=need && d.lv<drMaxLv(d)){ d.fed-=need; d.lv++; drAddXp(15); drEvolutionNotice(d,before); }
  if(d.lv>=drMaxLv(d)) d.fed=0;
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
  const enemy={sp:enemySp, lv:Math.max(1, me.lv+(Math.floor(Math.random()*3)-1)), star:1};
  drCloseModal();
  drStartBattle([me], [enemy], {
    title:'⚔️ Đấu trường',
    onWin:()=>{ const reward={gold:80+enemy.lv*30, gems:(Math.random()<0.35?1:0), xp:40};
      drState.gold+=reward.gold; drState.gems+=reward.gems; drState.ore=(drState.ore||0)+3; if(typeof drQC==='function') drQC('win'); drAddXp(reward.xp);
      drRenderHud(); drSave(); toast('🏆 Thắng! +'+fmtCoin(reward.gold)+' 🪙'+(reward.gems?' · +'+reward.gems+' 💎':'')); },
    onDone:()=>drShowArena()
  });
}
function drFightOld_unused(i){ return; /* mã kết quả cũ — đã chuyển sang đánh theo lượt, giữ để không vỡ diff */
  const me=drState.dragons[i]; if(!me) return;
  const enemySp=DR_SP_ORDER[0];
  const enemy={sp:enemySp, lv:me.lv};
  const reward={gold:0};
  { drState.gold+=0; }
  drRenderHud(); drSave();
  const es=DR_SPECIES[enemy.sp];
  const body=`<div class="dr-fight">
      <div class="dr-fight-side ${win?'win':''}"><div class="dr-fight-art">${drDragonArt(me)}</div><b>${esc(DR_SPECIES[me.sp].name)}</b><small>Lv${me.lv} · ${drEvolution(me.lv).name}${meAdv>1?' · Khắc chế!':''}</small></div>
      <div class="dr-vs">${win?'THẮNG':'THUA'}</div>
      <div class="dr-fight-side ${!win?'win':''}"><div class="dr-fight-art">${drDragonArt(enemy)}</div><b>${esc(es.name)}</b><small>Lv${enemy.lv} · ${drEvolution(enemy.lv).name}</small></div>
    </div>
    <div class="dr-fight-reward">${win?'🏆 Thắng!':'💪 Thua rồi'} +${fmtCoin(reward.gold)} 🪙${reward.gems?` · +${reward.gems} 💎`:''} · +${reward.xp} XP</div>
    <button class="dr-btn go" id="drFightAgain">Đấu tiếp</button>`;
  drModal('Kết quả trận', body);
  if(win){ confetti(); drFx('victory'); }
  $('drFightAgain').onclick=drShowArena;
}

/* ---------- Sách rồng (đồ giám) ---------- */
// Cấp cao nhất của loài này đang sở hữu (0 = chưa nuôi con nào).
function drBestLv(sp){ const b=drState.dragons.filter(d=>d.sp===sp).sort((a,b)=>b.lv-a.lv)[0]; return b?b.lv:0; }
function drShowCodex(){
  const owned=new Set(drState.dragons.map(d=>d.sp));
  const seen=new Set([...(drState.seen||[]), ...owned]);           // sưu tầm bền vững qua Chuyển Sinh
  // Nhóm theo độ hiếm cho "sách" gọn gàng, dễ ngắm.
  const order=['common','rare','epic','legendary'];
  const groups=order.map(rar=>{
    const list=DR_SP_ORDER.filter(sp=>DR_SPECIES[sp].rar===rar);
    if(!list.length) return '';
    const gotN=list.filter(sp=>seen.has(sp)).length;
    const cells=list.map(sp=>{ const s=DR_SPECIES[sp], has=seen.has(sp), have=owned.has(sp);
      const art = have?drDragonArt({sp,lv:drBestLv(sp)}):(has?drDragonArt({sp,lv:1}):'<span class="dr-lock">?</span>');
      const evoTag = have?`<em class="dr-codex-stage">${drEvolution(drBestLv(sp)).name}</em>`:'';
      const label = has?esc(s.name):'? ? ?';
      return `<button class="dr-codex-cell ${has?'':'locked'} ${have?'owned':''}" data-sp="${sp}">
        <span class="dr-codex-mini">${art}${evoTag}</span>
        <small>${label}</small></button>`; }).join('');
    const r=DR_RAR[rar]||DR_RAR.common;
    return `<div class="dr-codex-sec">
      <div class="dr-codex-sechead"><span class="dr-rar" style="--rc:${r.c}">${r.n}</span><b>${gotN}/${list.length}</b></div>
      <div class="dr-codex-grid">${cells}</div></div>`;
  }).join('');
  const body=`<p class="dr-note">Đã sưu tầm <b>${seen.size}/${DR_SP_ORDER.length}</b> loài rồng. Bấm từng con để xem <b>các hình thái tiến hoá</b> khi lên cấp.</p>
    ${groups}`;
  drModal('Sách Rồng', body, true);
  $('drModal').querySelectorAll('[data-sp]').forEach(c=>c.onclick=()=>drCodexDetail(c.dataset.sp, seen.has(c.dataset.sp)));
}
// Dải hình thái: Baby → Teen → Adult → Legend. Loài có atlas tiến hoá (s.evo) đổi hẳn
// tạo hình theo cấp; loài chưa có atlas thì lớn dần + hào quang mạnh hơn theo cấp.
function drCodexEvoStrip(sp,has){
  const bestLv=drBestLv(sp);
  return `<div class="dr-evostrip">`+DR_EVOLUTIONS.map((evo,i)=>{
    const reached=bestLv>=evo.minLv, cur=reached&&drEvolution(bestLv).id===evo.id;
    const next=DR_EVOLUTIONS[i+1];
    const range='Lv'+evo.minLv+(next?'–'+(next.minLv-1):'+');
    const art = has?drDragonArt({sp,lv:evo.minLv}):'<span class="dr-lock">?</span>';
    return `<div class="dr-evostage ${cur?'cur':''} ${has?'':'silh'} ${reached?'reached':'todo'}">
      <div class="dr-evostage-art">${art}${cur?'<i class="dr-evostage-flag">Hiện tại</i>':''}</div>
      <b class="dr-evostage-name">${evo.name}</b>
      <em class="dr-evostage-lv">${range}</em>
    </div>${next?'<span class="dr-evoarrow">➜</span>':''}`;
  }).join('')+`</div>`;
}
function drCodexDetail(sp,has){
  const s=DR_SPECIES[sp];
  const bestLv=drBestLv(sp), own=bestLv>0;
  const bar=(label,val,max)=>`<div class="dr-statrow"><span>${label}</span><div class="dr-statbar"><i style="width:${Math.min(100,Math.round(val/max*100))}%"></i></div></div>`;
  const evoNote = s.evo ? 'Đổi hẳn tạo hình qua 4 hình thái khi lên cấp.' : 'Lớn dần & toả hào quang mạnh hơn theo cấp.';
  const body=`<button class="dr-back-btn" id="drCodexBack">← Danh sách rồng</button>
    <div class="dr-codex-detail">
    <div class="dr-codex-art ${has?'':'silh'}">${has?drDragonArt({sp,lv:bestLv||1}):'<span class="dr-lock">?</span>'}</div>
    <div class="dr-codex-meta"><div class="dr-detail-name">${has?esc(s.name):'? ? ?'} ${drRarChip(s.rar)}</div>
      <div class="dr-chips">${s.els.map(drElChip).join('')}</div>
      ${own?`<div class="dr-kv"><span>Hình thái cao nhất</span><b>${drEvolution(bestLv).name} · Lv${bestLv}</b></div>`
           :(has?'<p class="dr-note">Đã sưu tầm — nuôi & lên cấp để mở các hình thái.</p>':'<p class="dr-note">Chưa sở hữu — lai hoặc mua để mở khoá.</p>')}
      <div class="dr-kv"><span>Sinh vàng</span><b>${s.gold} 🪙/phút (Lv1)</b></div>
    </div></div>
    <div class="dr-evohead"><b>🧬 Hình thái tiến hoá</b><span>${evoNote}</span></div>
    ${drCodexEvoStrip(sp,has)}
    <div class="dr-stats">
      ${bar('Máu',s.hp,200)}${bar('Sát thương',s.atk,120)}${bar('Tầm đánh',s.range,6)}${bar('Tốc độ',s.spd,10)}
    </div>
    ${has&&s.els.length>1?`<p class="dr-note">Lai từ: ${s.els.map(drElChip).join(' + ')}</p>`:''}`;
  drModal('Đồ giám: '+(has?esc(s.name):'Bí ẩn'), body);
  const back=$('drCodexBack'); if(back) back.onclick=drShowCodex;
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
  return s.gold * drLvGoldMul(d.lv) * drStarGoldMult(d) * drForgeGoldMult() * drRebirthGoldMult() * match * DR_HAB_RATE_HR;
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
  toast('🏝️ Đã xây khu '+(DR_ELNAME[el]||el)+'!'); if(typeof confetti==='function') confetti(); drFx('unlock');
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
function drReward(r){ if(!r) return; if(r.gold){drState.gold+=r.gold;} if(r.gems){drState.gems+=r.gems;} if(r.food){drState.food+=r.food;} if(r.xp){drAddXp(r.xp);}
  // Hiệu ứng nhận thưởng: chỉ vàng -> coin, chỉ 💎 -> gem, còn lại -> bung thưởng tổng hợp
  const only=(k)=>r[k]&&!['gold','gems','food','xp','dragon'].some(x=>x!==k&&r[x]);
  drFx(only('gold')?'coin-collect':only('gems')?'gem-collect':'reward-burst');
}
function drRewardText(r){ const p=[]; if(r&&r.gold)p.push(fmtCoin(r.gold)+' 🪙'); if(r&&r.gems)p.push(r.gems+' 💎'); if(r&&r.food)p.push(r.food+' 🍖'); return p.join(' · ')||'—'; }
function drTeamPower(){ return drState.dragons.map(drPower).sort((a,b)=>b-a).slice(0,3).reduce((a,b)=>a+b,0); }
function drFmtSec(s){ const m=Math.floor(s/60), ss=s%60; return m>0?(m+'p'+(ss<10?'0':'')+ss+'s'):(ss+'s'); }
function drDayNum(){ return Math.floor(drNow()/86400000); }
function drDockBadge(act){ const m={coach:'drCoachDot',quest:'drQuestDot',mail:'drMailDot',habitat:'drHabDot',daily:'drDailyDot',boss:'drBossDot',ach:'drAchDot',farm:'drFarmDot',friends:'drFriendDot',event:'drEventDot',tower:'drTowerDot'}; return m[act]?`<span class="dr-dock-badge" id="${m[act]}" hidden></span>`:''; }
function drSetDot(id,n){ const el=$(id); if(el){ el.textContent=n; el.hidden=(n<=0); } }
function drUpdateFeatureDots(){
  if(!drState) return;
  if(typeof drTodayTasks==='function') drSetDot('drCoachDot', drTodayTasks().filter(t=>t.ready).length);
  drSetDot('drDailyDot', drCanDaily()?1:0);
  drSetDot('drFarmDot', (drState.farm||[]).filter(t=>drFarmReady(t)).length);
  drSetDot('drAchDot', DR_ACH.filter(a=>a.chk()&&!(drState.achClaimed||[]).includes(a.id)).length);
  drSetDot('drBossDot', drBossClaimable());
  if(typeof drCanTowerSweep==='function') drSetDot('drTowerDot', drCanTowerSweep()?1:0);
  if(typeof drRenderDecor==='function') drRenderDecor();
  if(typeof drWatchGifts==='function') drWatchGifts();
  if(typeof drUpdateEventDot==='function') drUpdateEventDot();
}

/* ============ GỢI Ý TĂNG SỨC MẠNH + VIỆC HÔM NAY (huấn luyện viên) ============
   Nhìn trạng thái người chơi -> gợi ý CỤ THỂ để mạnh hơn + liệt kê VIỆC HÔM NAY (reset ngày) còn làm được.
   Mỗi dòng có nút mở thẳng màn liên quan. Badge 💡 trên dock = số việc hôm nay nên làm. */
function drTodayTasks(){
  const t=[];
  t.push({ic:'📅', name:'Điểm danh nhận thưởng', ready:(typeof drCanDaily==='function'&&drCanDaily()), act:'daily', done:'Đã điểm danh hôm nay'});
  if(typeof drCanTowerSweep==='function') t.push({ic:'🧹', name:'Quét Tháp (nhận nhanh ×2)', ready:drCanTowerSweep(), act:'tower', done:(drTower().floor<=0?'Qua 1 tầng để mở':'Đã quét hôm nay')});
  if(typeof drCanFreeSpin==='function') t.push({ic:'🎡', name:'Vòng quay MIỄN PHÍ', ready:drCanFreeSpin(), act:'wheel', done:'Đã quay free hôm nay'});
  const bh=(typeof drBossSync==='function'&&drState.boss)?Math.max(0,DR_BOSS_HITS-(drBossSync().hits||0)):0;
  t.push({ic:'👹', name:'Đánh Boss'+(bh?(' · còn '+bh+' lượt'):''), ready:bh>0, act:'boss', done:'Hết lượt Boss hôm nay'});
  const qn=(typeof drQuestCount==='function')?drQuestCount():0;
  t.push({ic:'🎁', name:'Nhận thưởng nhiệm vụ'+(qn?(' · '+qn):''), ready:qn>0, act:'quest', done:'Chưa có thưởng để nhận'});
  const fr=(drState.farm||[]).filter(x=>drFarmReady(x)).length;
  if((drState.farm||[]).some(Boolean)) t.push({ic:'🌾', name:'Thu nông trại'+(fr?(' · '+fr):''), ready:fr>0, act:'farm', done:'Chưa có ô chín'});
  const gi=(typeof drGiftInboxN==='function')?drGiftInboxN():0;
  if(gi) t.push({ic:'💝', name:'Nhận quà bạn bè · '+gi, ready:true, act:'friends', done:''});
  return t;
}
function drPowerTips(){
  const tips=[], ds=drState.dragons||[];
  const top=ds.slice().sort((a,b)=>drPower(b)-drPower(a))[0];
  if(top && drStar(top)<DR_STAR_MAX){ const c=drStarCost(drStar(top)), ok=drState.gold>=c.gold&&drState.gems>=c.gems;
    tips.push({ic:'⭐', name:'Nâng sao rồng mạnh nhất', desc:`${DR_SPECIES[top.sp].name} ${drStar(top)}★→${drStar(top)+1} · ${fmtCoin(c.gold)}🪙 ${c.gems}💎`, ready:ok, act:'bag'}); }
  if(ds.some(d=>!drLvCapped(d))) tips.push({ic:'🍖', name:'Nuôi rồng lên cấp', desc:`Đang có ${fmtCoin(drState.food)} 🍖 · lên cấp tăng máu/công/sinh vàng`, ready:(drState.food||0)>=10, act:'feed'});
  const emptySlots=ds.some(d=>((d.runes||[]).length)<DR_RUNE_SLOTS), haveRunes=(drState.runes||[]).length>0;
  if(haveRunes&&emptySlots) tips.push({ic:'💎', name:'Gắn đá cường hoá vào rồng', desc:`Có ${(drState.runes||[]).length} đá trong túi + còn ô trống`, ready:true, act:'runes'});
  else if((drState.gold||0)>=DR_RUNE_CRAFT) tips.push({ic:'💎', name:'Ghép đá cường hoá mới', desc:`${fmtCoin(DR_RUNE_CRAFT)} 🪙/viên · +ATK/HP/SPD khi gắn`, ready:true, act:'runes'});
  tips.push({ic:'🔨', name:'Rèn Bùa ở Lò rèn', desc:'Tăng % sinh vàng / sức mạnh lâu dài', ready:(drState.ore||0)>0, act:'forge'});
  if(!drState.breed && ds.length>=2) tips.push({ic:'💞', name:'Lai rồng hiếm hơn', desc:'Ghép 2 hệ để ra loài mạnh/hiếm mới', ready:true, act:'breed'});
  tips.push({ic:'🌸', name:'Đặt trang trí tăng %', desc:'Trang trí cộng % sinh vàng cho cả đảo', ready:true, act:'decor'});
  if(typeof drCanRebirth==='function' && drCanRebirth()) tips.push({ic:'🔮', name:'Chuyển Sinh — hệ số VĨNH VIỄN', desc:'Đủ điều kiện: đổi Linh Khí tăng lực mãi mãi', ready:true, act:'rebirth'});
  return tips.sort((a,b)=>(b.ready?1:0)-(a.ready?1:0));   // "làm được ngay" lên đầu
}
function drCoachRow(o){
  return `<div class="dr-coach-row ${o.ready?'ready':''}"><span class="dr-coach-ic">${o.ic}</span>
    <div class="dr-coach-mid"><b>${esc(o.name)}</b>${o.desc?`<small>${esc(o.desc)}</small>`:(o.ready?'':`<small class="dr-muted">${esc(o.done||'')}</small>`)}</div>
    ${o.ready?`<button class="dr-btn sm go" data-coach="${o.act}">Làm ngay ›</button>`:`<span class="dr-q-done">✓</span>`}</div>`;
}
function drShowCoach(){
  const tasks=drTodayTasks(), tips=drPowerTips(), nToday=tasks.filter(t=>t.ready).length;
  const pw=(typeof drTeamPower==='function')?drTeamPower():0;
  const body=`<div class="dr-coach-hd">💪 Lực đội hiện tại: <b>${fmtCoin(pw)}</b></div>
    <p class="dr-hab-intro">Làm theo gợi ý dưới đây để rồng khoẻ nhanh nhất mỗi ngày.</p>
    <div class="dr-sub2">📅 Việc hôm nay ${nToday?`<small class="dr-q-reset">(${nToday} việc nên làm)</small>`:'<small class="dr-q-reset">(đã làm hết — tuyệt vời!)</small>'}</div>
    <div class="dr-coach-list">${tasks.map(drCoachRow).join('')}</div>
    <div class="dr-sub2">🔨 Cách tăng sức mạnh</div>
    <div class="dr-coach-list">${tips.map(drCoachRow).join('')}</div>`;
  drModal('Gợi ý tăng sức mạnh', body, true);
  $('drModal').querySelectorAll('[data-coach]').forEach(b=>b.onclick=()=>drOpen(b.dataset.coach));   // mở thẳng màn liên quan (reuse popup, mượt)
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
const DR_DAILY_CYCLE=30;                       // lịch điểm danh theo tháng (30 ngày)
function drDailyIsMile(i){ const n=i+1; return n===7||n===14||n===21||n===30; }
function drDailyReward(i){                      // i = 0-based (0..29); mốc lớn 7/14/21/30
  const n=i+1;
  if(n===7)  return {gold:1200, gems:5};
  if(n===14) return {gold:2500, gems:10, food:40};
  if(n===21) return {gold:4000, gems:15, food:60};
  if(n===30) return {gold:9000, gems:30, food:100};        // jackpot cuối tháng
  const r={gold:150+n*35};
  if(n%3===0) r.food=15+Math.floor(n/3)*4;
  if(n%5===0) r.gems=2;
  return r;
}
function drCanDaily(){ return (drState.daily?drState.daily.day:0) < drDayNum(); }
function drClaimDaily(){
  if(!drCanDaily()){ toast('Hôm nay đã điểm danh rồi 📅'); return; }
  const today=drDayNum(), cont=(drState.daily.day===today-1);
  drState.daily.streak = cont ? (drState.daily.streak+1) : 1;
  drState.daily.day = today;
  const r=drDailyReward((drState.daily.streak-1)%DR_DAILY_CYCLE);
  drReward(r); if(typeof confetti==='function') confetti();
  drRenderHud(); drSave(); drShowDaily();
  toast('📅 Điểm danh ngày '+drState.daily.streak+': +'+drRewardText(r));
}
function drShowDaily(){
  const streak=drState.daily?drState.daily.streak:0;
  const donePos=(streak>0)?((streak-1)%DR_DAILY_CYCLE):-1;                                 // ô vừa nhận
  const nextPos=drCanDaily()?((drState.daily&&drState.daily.day===drDayNum()-1?streak:0)%DR_DAILY_CYCLE):-1;
  const days=Array.from({length:DR_DAILY_CYCLE},(_,i)=>{
    const r=drDailyReward(i), mile=drDailyIsMile(i);
    const got = !drCanDaily() && donePos===i;
    const isNext = i===nextPos;
    return `<div class="dr-day ${got?'got':''} ${isNext?'next':''} ${mile?'mile':''}">
      <span class="dr-day-n">${mile?'★ ':''}N${i+1}</span><span class="dr-day-r">${drRewardText(r)}</span>${got?'<span class="dr-day-tick">✓</span>':''}</div>`;
  }).join('');
  const cycleDay=((streak>0?streak-1:0)%DR_DAILY_CYCLE)+1;
  const body=`<p class="dr-hab-intro">Điểm danh mỗi ngày, thưởng tăng dần cả tháng. Chuỗi: <b>${streak} ngày</b> (lịch ngày ${cycleDay}/${DR_DAILY_CYCLE}). Mốc lớn ★ ở ngày 7/14/21/30. Bỏ lỡ 1 ngày về mốc 1.</p>
    <div class="dr-daily-grid month">${days}</div>
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
  drRenderHud(); drSave(); drShowAch(); drNotify('achievement','Thành tựu: '+a.name); }
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
  {name:'Cổng Hư Không',  power:6000,  r:{gold:12000,gems:18}},
  {name:'Biển Sao',       power:8500,  r:{gold:16000,gems:22}},
  {name:'Lâu Đài Băng',   power:12000, r:{gold:22000,gems:28}},
  {name:'Ngai Rồng Cổ',   power:16000, r:{gold:30000,gems:35}},
  {name:'Tận Thế',        power:22000, r:{gold:45000,gems:50}},
];
const DR_ADV_THEME=['beach','forest','ice','volcano','swamp','dark','sky','cosmic','cosmic','ice','gold','dark'];
const DR_ADV_BG=['01-beach','02-jungle','03-ice-cave','04-volcano','05-swamp','06-dark-abyss','07-dragon-peak','08-ancient-desert','09-cloud-islands','10-luminous-grove','11-ruined-city','12-crystal-garden'];
function drFightStage(i){
  if(i!==(drState.adv||0)) return;
  const s=DR_ADV_STAGES[i];
  drCloseModal();
  drStartBattle(drTeamTop3(), drMakeEnemyTeam(s.power, i<2?2:3), {
    title:'⚔️ '+s.name, theme:DR_ADV_THEME[i]||'grass', bg:DR_ADV_BG[i]?('assets/dragon-island/adventure/'+DR_ADV_BG[i]+'.webp'):null,
    onWin:()=>{ drState.adv=Math.max(drState.adv||0,i+1); drReward(s.r);
      if(typeof drQC==='function') drQC('adv'); if(typeof drEventGain==='function') drEventGain(30+i*8);
      if(typeof drUpdateQuestDot==='function') drUpdateQuestDot();
      if(typeof confetti==='function') confetti(); drRenderHud(); drSave(); toast('🏆 Vượt "'+s.name+'"! +'+drRewardText(s.r)); },
    onDone:()=>drShowAdventure()
  });
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
const DR_BOSS_SP=['water','lava','aurora','dark'];   // hình boss theo tuần: Hải Xà · Dung Nham · Titan Băng · Ác Long
const DR_BOSS_IMG=['sea-serpent','lava-dragon','ice-titan','dark-dragon'];   // ảnh boss động (webp animated) theo tuần
function drHitBoss(){ const b=drBossSync(); if(b.hits>=DR_BOSS_HITS){ toast('Hết lượt đánh hôm nay — mai quay lại 👹'); return; }
  const dmg=drTeamPower(); b._prepct=drBossPct(); b.dmg+=dmg; b.hits++;
  b._fxHit={dmg, els:drTeamTop3().map(d=>(DR_SPECIES[d.sp]||DR_SPECIES.fire).el)};   // đánh dấu để diễn hoạt đòn
  if(typeof drQC==='function') drQC('boss'); if(typeof drUpdateQuestDot==='function') drUpdateQuestDot();
  drAddXp(3); drSave(); drShowBoss(); toast('⚔️ Gây '+fmtCoin(dmg)+' sát thương!'); }
// Diễn hoạt đòn đánh boss: cả đội lao lên, bắn chiêu vào boss, boss giật + rung sân + số sát thương.
function drBossHitFx(info){
  const m=$('drModal'); if(!m) return; const fig=m.querySelector('#drBossFig');
  const allies=[...m.querySelectorAll('.dr-boss-ally')];
  allies.forEach((a,i)=>setTimeout(()=>{
    if(a.animate) a.animate([{transform:'translateY(0) scale(1)'},{transform:'translateY(-16px) scale(1.12)',offset:.4},{transform:'translateY(0) scale(1)'}],{duration:360,easing:'cubic-bezier(.35,1.4,.5,1)'});
    if(fig) drProjectile(a, fig, (info.els||[])[i]||'fire');
  }, i*90));
  setTimeout(()=>{ if(fig){ fig.classList.remove('dr-boss-shake'); void fig.offsetWidth; fig.classList.add('dr-boss-shake');
      drBurstEl(fig, (info.els||[])[0]||'fire'); drFloatDmg(fig, '-'+fmtCoin(info.dmg), 'crit'); }
    drShakeField(true); }, allies.length*90+240);
}
function drClaimBossMile(p){ const b=drBossSync(); const m=DR_BOSS_MILE.find(x=>x.p===p); if(!m) return;
  if(drBossPct()<p||(b.claimed||[]).includes(p)) return;
  b.claimed.push(p); drReward(m.r); if(typeof confetti==='function') confetti();
  drRenderHud(); drSave(); drShowBoss(); toast('👹 Mốc '+p+'%: +'+drRewardText(m.r)); }
function drShowBoss(){
  const b=drBossSync(); const name=DR_BOSS_NAME[b.week%DR_BOSS_NAME.length];
  const sp=DR_BOSS_SP[b.week%DR_BOSS_SP.length]; const pct=drBossPct();
  const initPct=(b._prepct!=null)?b._prepct:pct;
  const miles=DR_BOSS_MILE.map(m=>{ const reached=pct>=m.p, got=(b.claimed||[]).includes(m.p);
    return `<div class="dr-boss-mile"><span class="dr-boss-p">${m.p}%</span><span class="dr-ach-rw">${drRewardText(m.r)}</span>
      ${got?'<span class="dr-ach-ok">✓</span>':(reached?`<button class="dr-btn sm" data-mile="${m.p}">Nhận</button>`:'<span class="dr-ach-lock">🔒</span>')}</div>`;
  }).join('');
  const team=drTeamTop3().map(d=>`<span class="dr-boss-ally">${drDragonArt({sp:d.sp,lv:d.lv})}</span>`).join('')||'<small class="dr-muted">Chưa có rồng</small>';
  const bimg=DR_BOSS_IMG[b.week%DR_BOSS_IMG.length];
  // Boss = sprite động 8 khung (2048×256). Lỗi tải -> quay về ảnh tĩnh -> art rồng.
  const bossArt=bimg?`<div class="dr-boss-sprite" data-boss="${bimg}" style="--u:url('assets/dragon-island/bosses/sprites/${bimg}.webp')"></div>`:drDragonArt({sp,lv:14});
  const body=`<div class="dr-field boss" style="background:${DR_FIELD_THEMES.boss}">
      <div class="dr-boss-fig" id="drBossFig">${bossArt}</div>
      <div class="dr-boss-name">👹 ${esc(name)}</div>
      <div class="dr-boss-hp"><i id="drBossBar" style="width:${initPct}%"></i><em>${fmtCoin(b.dmg)} / ${fmtCoin(DR_BOSS_HP)} · ${pct}%</em></div>
      <div class="dr-boss-team">${team}</div>
    </div>
    <button class="dr-btn hero hp-danger block" id="drBossHit" ${b.hits>=DR_BOSS_HITS?'disabled':''}>⚔️ Tấn công · còn ${Math.max(0,DR_BOSS_HITS-b.hits)} lượt (lực ${fmtCoin(drTeamPower())})</button>
    <div class="dr-boss-miles">${miles}</div>`;
  const bd=drModal('👹 Boss Tuần', body, true);
  const h=$('drBossHit'); if(h) h.onclick=drHitBoss;
  bd.addEventListener('click',e=>{ const m=e.target.closest('[data-mile]'); if(m) drClaimBossMile(+m.dataset.mile); });
  requestAnimationFrame(()=>{ const bar=$('drBossBar'); if(bar) bar.style.width=pct+'%'; delete b._prepct; });  // máu boss tụt mượt
  if(b._fxHit){ const info=b._fxHit; b._fxHit=null; requestAnimationFrame(()=>drBossHitFx(info)); }
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
    return `<span class="dr-decor-item" style="left:${d.x}%; top:${d.y}%" title="${d.name}"><img src="assets/dragon-island/decor/${d.id}.webp" alt="" draggable="false" onerror="this.replaceWith(document.createTextNode('${d.ic}'))"></span>`; }).join('');
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
      <span class="dr-decor-ic"><img src="assets/dragon-island/decor/${d.id}.webp" alt="" draggable="false" onerror="this.replaceWith(document.createTextNode('${d.ic}'))"></span>
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

/* ============ CHIẾN ĐẤU THEO LƯỢT (engine dùng chung: Phiêu lưu · Đấu trường) ============
   Mỗi rồng có máu/atk (theo loài×cấp×sao), năng lượng ⚡ (đủ 3 dùng kỹ năng hệ), khắc hệ (DR_ADV).
   Đội tối đa 3 con, đánh con đầu (front) tới khi ngã thì tới con sau. Địch AI tự đánh. */
let drBattle=null, drBattleTimer=null, drBattleQ=[];
// Nền SÂN ĐẤU theo khu (gradient sẵn — nhìn khác nhau ngay; sau này thay bằng ảnh nền qua opts.bg).
const DR_FIELD_THEMES={
  grass:  'linear-gradient(180deg,#173a52 0%,#1f4e46 46%,#2c6b3e 100%)',
  beach:  'linear-gradient(180deg,#1f8fc4 0%,#5fc4dc 42%,#e6d29a 100%)',
  forest: 'linear-gradient(180deg,#123a2a 0%,#1c5136 46%,#2f7d3a 100%)',
  ice:    'linear-gradient(180deg,#295a7a 0%,#6aa6cf 46%,#c2e6f0 100%)',
  volcano:'linear-gradient(180deg,#3a1414 0%,#6e2416 46%,#c04a1f 100%)',
  swamp:  'linear-gradient(180deg,#23301a 0%,#3a4a24 46%,#5f6f2f 100%)',
  dark:   'linear-gradient(180deg,#160f2c 0%,#281a48 46%,#3d2c60 100%)',
  sky:    'linear-gradient(180deg,#274a8a 0%,#5a8fd0 46%,#c2e2ff 100%)',
  cosmic: 'linear-gradient(180deg,#0c0e2a 0%,#22224a 46%,#3e2c72 100%)',
  gold:   'linear-gradient(180deg,#382c10 0%,#6e5416 46%,#c0921f 100%)',
  tower:  'linear-gradient(180deg,#221a3a 0%,#3a2a5a 46%,#63508a 100%)',
  boss:   'linear-gradient(180deg,#2a0e14 0%,#3a1428 46%,#5a1a2f 100%)',
};
/* ===== VAI TRÒ · TRẠNG THÁI (bản refactor) =====
   Vai trò suy ra từ hệ: Đỡ đòn (dày máu, lên khiên, khiêu khích hút đòn), Hồi máu (cứu đồng đội + buff),
   Sát thương (đấm mạnh, dễ chí mạng, gây trạng thái theo hệ). Cả 3 con đều tham chiến theo lượt. */
const DR_ROLE_OF={ earth:'tank', ice:'tank', steam:'tank', swamp:'tank',
  water:'heal', plant:'heal', light:'heal',
  fire:'dps', electric:'dps', dark:'dps', lava:'dps', storm:'dps' };
function drRoleOf(el){ return DR_ROLE_OF[el]||'dps'; }
const DR_ROLE_UI={ tank:{ic:'🛡️',nm:'Đỡ đòn'}, heal:{ic:'💚',nm:'Hồi máu'}, dps:{ic:'⚔️',nm:'Sát thương'} };
const DR_STATUS_UI={ burn:'🔥', poison:'☠️', freeze:'❄️', shield:'🛡️', atkup:'⬆️', taunt:'❗' };
// dps tung chiêu -> áp trạng thái theo hệ: cháy/độc (mất máu mỗi lượt), đóng băng (mất 1 lượt)
const DR_EL_STATUS={ fire:'burn', lava:'burn', dark:'poison', swamp:'poison', electric:'freeze', storm:'freeze' };
function drSkillName(role,el){
  if(role==='heal') return el==='light'?'Thánh Quang ✨':(el==='plant'?'Hồi Sinh 🌿':'Sóng Hồi 🌊');
  if(role==='tank') return el==='ice'?'Giáp Băng ❄️':'Thành Đá 🪨';
  const m={fire:'Phun Lửa 🔥',electric:'Sấm Sét ⚡',dark:'Hắc Ám 🌑',lava:'Dung Nham 🌋',storm:'Cuồng Phong 🌪️'};
  return m[el]||'Tuyệt Kỹ ✨';
}
function drElAdv(atkEl,defEl){ if(DR_ADV[atkEl]===defEl) return 1.3; if(DR_ADV[defEl]===atkEl) return 0.8; return 1; }
function drCombatStats(d){
  const s=DR_SPECIES[d.sp]||DR_SPECIES.fire;
  const mul=(1+0.18*((d.lv||1)-1))*(typeof drStarMult==='function'?drStarMult(d):1);
  const rb=(typeof drRuneBonus==='function')?drRuneBonus(d):{atk:0,hp:0,spd:0};
  const role=drRoleOf(s.el);
  // Vai trò nắn chỉ số: tank dày máu/ít công, dps mạnh công, healer cân bằng
  const hpMul=role==='tank'?1.35:(role==='heal'?1.05:0.9);
  const atkMul=role==='tank'?0.75:(role==='dps'?1.15:0.85);
  const hp=Math.max(1,Math.round(s.hp*mul*(1+rb.hp)*hpMul));
  const spd=(s.spd||5)+rb.spd;
  return { sp:d.sp, lv:d.lv||1, el:s.el, name:s.name, role,
    hp, maxhp:hp, atk:Math.max(1,Math.round(s.atk*mul*(1+rb.atk)*atkMul)), spd,
    crit:Math.min(.5,(role==='dps'?.20:.08)+spd*0.006),   // chí mạng: dps cao hơn, +theo tốc độ
    dodge:Math.min(.30,.04+spd*0.006),                    // né: theo tốc độ
    en:0, st:{}, pos:0, _prehp:null };
}
function drTeamTop3(){ return drState.dragons.slice().sort((a,b)=>drPower(b)-drPower(a)).slice(0,3); }
function drMakeEnemyTeam(power,n){
  n=n||2; const per=power/n; const pool=['fire','water','plant','earth','electric','ice','dark'];
  const arr=[]; for(let k=0;k<n;k++){ const sp=pool[(k*3+1)%pool.length]; const lv=Math.max(1,Math.min(15,Math.round(per/55)));
    arr.push({sp, lv, star:1}); } return arr;
}
function drFront(team){ return team.find(c=>c.hp>0)||null; }   // giữ cho code boss/label cũ
function drTeamDead(team){ return team.every(c=>c.hp<=0); }
function drLoc(u){ const st=drBattle; let i=st.P.indexOf(u); if(i>=0) return {side:'P',idx:i}; i=st.E.indexOf(u); return {side:'E',idx:i}; }
function drPushFx(o){ (drBattle._fx=drBattle._fx||[]).push(o); }
function drLog(msg){ const st=drBattle; st.log.unshift(msg); st.log=st.log.slice(0,6); }
// Chọn mục tiêu: có kẻ KHIÊU KHÍCH (tank) thì buộc đánh nó; không thì dồn con MÁU THẤP nhất (đứng trước ưu tiên)
function drPickTarget(foes){
  const alive=foes.filter(c=>c.hp>0); if(!alive.length) return null;
  const taunt=alive.find(c=>c.st.taunt>0); if(taunt) return taunt;
  return alive.slice().sort((a,b)=>(a.hp/a.maxhp)-(b.hp/b.maxhp)||a.pos-b.pos)[0];
}
// Trạng thái ĐẦU LƯỢT: cháy/độc trừ máu, đóng băng -> mất lượt. Trả về true nếu mất lượt.
function drStatusTick(u){
  let frozen=false; const L=drLoc(u);
  if(u.st.burn>0){ const d=Math.max(1,Math.round(u.maxhp*0.06)); u.hp-=d; u.st.burn--;
    drPushFx({dot:true,tSide:L.side,tIdx:L.idx,dmg:d,el:'fire'}); drLog(`🔥 ${u.name} bị cháy <b>-${d}</b>`); }
  if(u.st.poison>0){ const d=Math.max(1,Math.round(u.maxhp*0.05)); u.hp-=d; u.st.poison--;
    drPushFx({dot:true,tSide:L.side,tIdx:L.idx,dmg:d,el:'dark'}); drLog(`☠️ ${u.name} trúng độc <b>-${d}</b>`); }
  if(u.st.freeze>0){ u.st.freeze--; frozen=true;
    drPushFx({frozen:true,tSide:L.side,tIdx:L.idx}); drLog(`❄️ ${u.name} bị đóng băng — mất lượt`); }
  if(u.st.taunt>0) u.st.taunt--;
  if(u.st.atkup>0) u.st.atkup--;
  return frozen;
}
// Một con RA ĐÒN (đánh thường hoặc tung chiêu theo vai trò). Ghi FX + log để render diễn hoạt.
function drAct(atk, special){
  const st=drBattle;
  const mine=st.P.indexOf(atk)>=0; const foes=mine?st.E:st.P, allies=mine?st.P:st.E;
  const who=mine?'Bạn':'Địch', role=atk.role, aL=drLoc(atk);
  atk.en=special?0:Math.min(3,atk.en+1);
  // HEALER tung chiêu: hồi máu đồng đội yếu nhất + tăng công cho nó (không đánh lượt này)
  if(special && role==='heal'){
    const hurt=allies.filter(c=>c.hp>0).sort((a,b)=>(a.hp/a.maxhp)-(b.hp/b.maxhp))[0]||atk;
    const heal=Math.round(atk.maxhp*0.35); hurt.hp=Math.min(hurt.maxhp,hurt.hp+heal); hurt.st.atkup=2;
    const hL=drLoc(hurt); drPushFx({aSide:aL.side,aIdx:aL.idx,dSide:hL.side,dIdx:hL.idx,heal,special:true,el:atk.el,support:true});
    drLog(`${who}: <b>${atk.name}</b> dùng ${drSkillName(role,atk.el)} → hồi <b>+${heal}♥</b> ${hurt.name} ⬆️`);
    return;
  }
  // TANK tung chiêu: lên khiên + khiêu khích (kéo địch về mình) rồi vẫn đấm mục tiêu
  let shieldGain=false;
  if(special && role==='tank'){ atk.st.shield=1; atk.st.taunt=2; shieldGain=true; }
  const def=drPickTarget(foes); if(!def){ return; }
  const dL=drLoc(def);
  // NÉ đòn (theo tốc độ)
  const evade=Math.max(.02, def.dodge - atk.spd*0.004);
  if(Math.random()<evade){
    drPushFx({aSide:aL.side,aIdx:aL.idx,dSide:dL.side,dIdx:dL.idx,dodged:true});
    drLog(`${who}: ${atk.name} đánh hụt — <b>${def.name} NÉ!</b>${shieldGain?' (🛡 khiên)':''}`);
    return;
  }
  // Sát thương
  let dmg=atk.atk*(0.9+Math.random()*0.2);
  const mul=drElAdv(atk.el,def.el); dmg*=mul;
  if(atk.st.atkup>0) dmg*=1.25;
  dmg*= def.pos===0?1.10:0.92;                 // đội hình: đứng trước ăn nặng hơn, sau nhẹ hơn
  let crit=Math.random()<atk.crit;
  if(special && role==='dps'){ dmg*=2.1; crit=true; }
  if(crit) dmg*=2;
  if(def.st.shield){ dmg*=0.4; def.st.shield=0; }
  dmg=Math.max(1,Math.round(dmg)); def.hp-=dmg;
  // dps tung chiêu -> áp trạng thái theo hệ
  let status=null;
  if(special && role==='dps' && def.hp>0){ const sk=DR_EL_STATUS[atk.el];
    if(sk==='freeze'){ if(Math.random()<0.6){ def.st.freeze=1; status='freeze'; } }
    else if(sk){ def.st[sk]=Math.max(def.st[sk]||0,3); status=sk; } }
  drPushFx({aSide:aL.side,aIdx:aL.idx,dSide:dL.side,dIdx:dL.idx,dmg,special:!!special,el:atk.el,mul,crit,status,shieldGain});
  const adv=mul>1?' 💥khắc hệ':(mul<1?' 🛡kháng':'');
  const act=special?('dùng '+drSkillName(role,atk.el)):'đánh';
  drLog(`${who}: <b>${atk.name}</b> ${act} → ${def.name} <b>-${dmg}</b>${crit?' ⚡BẠO':''}${adv}${status?' '+DR_STATUS_UI[status]:''}${shieldGain?' · 🛡':''}`);
}
function drTeamPow(team){ return team.reduce((s,c)=>s+c.atk+c.maxhp*0.25,0); }
function drStartBattle(playerDragons, enemyDragons, opts){
  clearTimeout(drBattleTimer);
  const P=playerDragons.slice(0,3).map(drCombatStats);
  const E=enemyDragons.slice(0,3).map(drCombatStats);
  // ĐỘI HÌNH: tự xếp tank ra trước (hút đòn), dps giữa, healer ra sau (an toàn hơn)
  const ord={tank:0,dps:1,heal:2};
  [P,E].forEach(t=>{ t.sort((a,b)=>ord[a.role]-ord[b.role]); t.forEach((c,i)=>c.pos=i); });
  // Nhịp: chênh lệch lực CÀNG lớn -> đánh CÀNG nhanh (đỡ lê thê); cân tài -> chậm & rõ để nhìn kỹ
  const r=Math.max(1,drTeamPow(P))/Math.max(1,drTeamPow(E)); const gap=Math.max(r,1/r);
  const pace=gap>2.6?0.5:(gap>1.8?0.72:1);
  drBattle={ P, E, log:['⚔️ Trận đấu bắt đầu!'], round:1, turn:1, over:false, win:false, opts:opts||{}, speed:1, pace, acting:null };
  drBattleQ=[];
  drRenderBattle();
  drScheduleTick(800);                                   // TỰ ĐỘNG đánh — người chơi chỉ ngồi xem
}
// Hẹn giờ hành động kế; nhịp CHẬM cho dễ nhìn, tự nhanh hơn khi chênh lệch lực lớn / theo nút tốc độ.
function drScheduleTick(first){
  clearTimeout(drBattleTimer);
  const st=drBattle; if(!st||st.over) return;
  const base=(first!=null)?first:1500;                   // chậm hơn bản cũ (1150) để xem rõ
  const gap=Math.max(240, Math.round(base*st.pace/(st.speed||1)));
  drBattleTimer=setTimeout(drBattleStep, gap);
}
// Xếp hàng đợi lượt theo TỐC ĐỘ (nhanh đi trước) + lắc nhẹ ngẫu nhiên để khi tốc độ xấp xỉ thì
// không phe nào luôn ra tay trước (bỏ lợi thế người-chơi-đi-trước ở trận cân tài).
function drBuildQueue(){
  const st=drBattle;
  return st.P.concat(st.E).filter(c=>c.hp>0)
    .map(c=>{ c._ini=c.spd+Math.random()*3; return c; })
    .sort((a,b)=>(b._ini-a._ini));
}
function drBattleStep(){
  const st=drBattle; if(!st||st.over) return;
  if(!$('drModal')){ clearTimeout(drBattleTimer); return; }   // thoát modal -> dừng
  if(!drBattleQ.length){ drBattleQ=drBuildQueue(); st.round++; }
  let u=null;
  while(drBattleQ.length){ const c=drBattleQ.shift(); if(c&&c.hp>0){ u=c; break; } }
  if(!u){ drScheduleTick(); return; }                    // cả hàng đều đã chết -> vòng mới ở tick sau
  drBattleAct(u);
}
// MỘT con hành động mỗi tick (chậm & rõ). Trạng thái đầu lượt -> nếu không đóng băng thì ra đòn.
function drBattleAct(u){
  const st=drBattle; if(!st||st.over) return;
  st._fx=[]; st.P.concat(st.E).forEach(c=>{ c._prehp=c.hp; });   // chốt máu trước -> thanh máu tụt/lên mượt
  const L=drLoc(u); st.acting=L.side+L.idx;
  const frozen=drStatusTick(u);
  if(u.hp>0 && !frozen) drAct(u, u.en>=3);                // đủ ⚡ thì tự tung chiêu theo vai trò
  st.turn++;
  if(drTeamDead(st.E)) return drEndBattle(true);          // drEndBattle tự render (kèm FX đòn kết liễu)
  if(drTeamDead(st.P)) return drEndBattle(false);
  drRenderBattle();
  drScheduleTick();
}
function drEndBattle(win){
  clearTimeout(drBattleTimer);
  const st=drBattle; if(!st) return; st.over=true; st.win=win; st.acting=null;
  st.log.unshift(win?'🏆 <b>CHIẾN THẮNG!</b>':'💀 <b>Thất bại…</b>');
  if(win && st.opts.onWin) st.opts.onWin();
  else if(!win && st.opts.onLose) st.opts.onLose();
  drRenderBattle();
}
function drCombatIcon(c){ return `<span class="dr-cbt-ic">${drDragonArt({sp:c.sp,lv:c.lv})}</span>`; }
function drStatusIcons(c){
  const s=c.st||{}, p=[];
  const add=(k,e)=>p.push(drAsset('assets/dragon-island/combat/status/'+k+'.webp', e));
  if(s.shield) add('shield','🛡️'); if(s.taunt>0) add('taunt','❗'); if(s.atkup>0) add('atkup','⬆️');
  if(s.burn>0) add('burn','🔥'); if(s.poison>0) add('poison','☠️'); if(s.freeze>0) add('freeze','❄️');
  return p.length?`<span class="dr-unit-st">${p.join('')}</span>`:'';
}
function drRenderBattle(){
  const st=drBattle; if(!st) return;
  // Mỗi con đứng trên SÂN ĐẤU: huy hiệu VAI TRÒ + biểu tượng TRẠNG THÁI, thanh máu, sprite; con ĐANG RA ĐÒN
  // (acting) bước ra + to hơn cho dễ theo dõi.
  const unit=(c,side,i)=>{ const acting=st.acting===(side+i);
    const initHp=(c._prehp!=null)?c._prehp:c.hp; const pct=Math.max(0,Math.round(initHp/c.maxhp*100));
    const enDots=[0,1,2].map(k=>`<i class="${k<c.en?'on':''}"></i>`).join('');
    const role=DR_ROLE_UI[c.role]||DR_ROLE_UI.dps;
    return `<div class="dr-unit ${c.hp<=0?'dead':''} ${acting?'front':''} role-${c.role}" data-cbt="${side}${i}">
      <div class="dr-unit-top"><span class="dr-unit-role" title="${role.nm}">${drAsset('assets/dragon-island/combat/roles/'+c.role+'.webp', role.ic)}</span>${drStatusIcons(c)}</div>
      <div class="dr-unit-hp${c.st&&c.st.shield?' shielded':''}"><i data-hp style="width:${pct}%"></i></div>
      <span class="dr-unit-art">${drDragonArt({sp:c.sp,lv:c.lv})}</span>
      <span class="dr-unit-nm">${esc(c.name)}</span>
      <span class="dr-unit-en">${enDots}</span>
    </div>`; };
  const actions = st.over
    ? `<button class="dr-btn go block" id="drBtlDone">${st.win?'🎉 Nhận thưởng':'Thoát'}</button>`
    : `<div class="dr-btl-auto">
        <span class="dr-btl-auto-lbl"><i class="dr-auto-dot"></i> Tự động đấu…</span>
        <button class="dr-btn sm" id="drBtlSpeed">⏩ ${st.speed||1}×</button>
      </div>`;
  const th=DR_FIELD_THEMES[st.opts.theme]||DR_FIELD_THEMES.grass;
  // Có ảnh nền: phủ thêm lớp gradient tối (đậm dần xuống đáy) để rồng nổi bật, có chiều sâu, đỡ chói.
  const fieldStyle=st.opts.bg
    ? `background:#10121d; background-image:linear-gradient(180deg,rgba(10,12,24,.20) 0%,rgba(8,10,20,.24) 40%,rgba(5,7,14,.74) 100%), url('${st.opts.bg}'); background-size:cover,cover; background-position:center,center`
    : `background:${th}`;
  const body=`<div class="dr-field${st.opts.bg?' has-bg':''}" style="${fieldStyle}">
      <div class="dr-army ally">${st.P.map((c,i)=>unit(c,'P',i)).join('')}</div>
      <div class="dr-vs-badge" id="drBtlVs">⚔️<b>VS</b></div>
      <div class="dr-army enemy">${st.E.map((c,i)=>unit(c,'E',i)).join('')}</div>
    </div>
    <div class="dr-army-lbls"><span>🐲 Đội bạn</span><span>👹 Địch</span></div>
    <div class="dr-btl-log">${st.log.map((l,i)=>`<div${i===0?' class="fresh"':''}>${l}</div>`).join('')}</div>
    ${actions}`;
  drModal((st.opts.title||'⚔️ Chiến đấu')+(st.over?'':` · Vòng ${st.round}`), body, true);
  drPlayBattleFx();                                     // diễn hoạt đòn đánh vừa xảy ra
  if(!st.over){ const sp=$('drBtlSpeed'); if(sp) sp.onclick=()=>{           // đổi tốc độ 1× → 2× → 3× → 1×
      st.speed=(st.speed||1)>=3?1:(st.speed||1)+1; sp.textContent='⏩ '+st.speed+'×'; drScheduleTick(120); }; }
  else { const d=$('drBtlDone'); if(d) d.onclick=()=>{ clearTimeout(drBattleTimer); const cb=st.opts.onDone; drBattle=null; drCloseModal(); if(cb) cb(); }; }
}
// Diễn hoạt các đòn của lượt vừa rồi: rồng lao vào, đối thủ giật + chớp đỏ, số sát thương bay lên,
// chiêu hệ nổ quầng màu, thanh máu tụt mượt. Chạy sau khi modal đã dựng DOM.
function drPlayBattleFx(){
  const st=drBattle; if(!st) return;
  const modal=$('drModal'); if(!modal) return;
  const cell=k=>modal.querySelector(`[data-cbt="${k}"]`);
  requestAnimationFrame(()=>{
    // 1) thanh máu tụt về giá trị thật (đã có transition trong CSS)
    ['P','E'].forEach(side=>{ (side==='P'?st.P:st.E).forEach((c,i)=>{
      const el=cell(side+i); if(!el) return; const bar=el.querySelector('[data-hp]');
      if(bar) bar.style.width=Math.max(0,Math.round(c.hp/c.maxhp*100))+'%';
      delete c._prehp;
    });});
    // 2) từng hiệu ứng: stagger cho dễ nhìn
    (st._fx||[]).forEach((fx,k)=>{
      setTimeout(()=>{
        // Mất máu do CHÁY/ĐỘC đầu lượt
        if(fx.dot){ const t=cell(fx.tSide+fx.tIdx); if(t){ drFloatDmg(t,'-'+fx.dmg,'hit'); drBurstEl(t,fx.el); } return; }
        // ĐÓNG BĂNG mất lượt
        if(fx.frozen){ const t=cell(fx.tSide+fx.tIdx); if(t) drFloatDmg(t,'❄️','heal'); return; }
        const atk=cell(fx.aSide+fx.aIdx), def=cell(fx.dSide+fx.dIdx);
        // HỒI MÁU đồng đội
        if(fx.support){ if(def){ drFloatDmg(def,'+'+fx.heal,'heal'); drBurstEl(def,fx.el||'light'); drFx('heal',def); } return; }
        const atkArt=atk&&atk.querySelector('.dr-unit-art');
        const lunge=()=>{ if(!atkArt||!atkArt.animate) return; const dir=(fx.aSide==='P')?1:-1; const base=(fx.aSide==='E')?'scaleX(-1) ':'';
          atkArt.animate([{transform:base+'translateX(0) scale(1)'},{transform:base+`translateX(${dir*30}px) scale(1.14)`,offset:.4},{transform:base+'translateX(0) scale(1)'}],
            {duration:fx.special?540:400, easing:'cubic-bezier(.35,1.4,.5,1)'}); };
        // NÉ đòn: người đánh lao tới nhưng trượt, hiện "NÉ!"
        if(fx.dodged){ lunge(); if(def) drFloatDmg(def,'NÉ!','heal'); return; }
        lunge();
        const impact=()=>{
          if(!def) return;
          def.classList.remove('dr-unit-hit'); void def.offsetWidth; def.classList.add('dr-unit-hit');
          if(fx.special) drBurstEl(def, fx.el);
          if(fx.dmg!=null) drFloatDmg(def, '-'+fx.dmg, fx.crit?'crit':'hit');
          if(fx.crit) drFx('critical-hit', def);                 // chí mạng -> nổ hiệu ứng
          if(fx.status) drFloatDmg(def, DR_STATUS_UI[fx.status]||'✦', 'heal');   // nhãn trạng thái vừa dính
          if(fx.shieldGain){ const a=cell(fx.aSide+fx.aIdx); if(a) drFx('shield', a); }  // tank lên khiên
          if(fx.special||fx.crit) drShakeField(fx.special);      // rung sân khi tung chiêu / chí mạng
        };
        if(fx.special && atkArt && def){ drProjectile(atkArt, def, fx.el); setTimeout(impact,300); }  // chiêu: bắn đạn rồi mới trúng
        else impact();
      }, k*360);
    });
    st._fx=[];
  });
}
function drFloatDmg(cell, txt, kind){
  const n=document.createElement('span'); n.className='dr-dmgnum '+kind; n.textContent=txt;
  cell.appendChild(n);
  if(n.animate) n.animate([{transform:'translate(-50%,0) scale(.6)',opacity:0},{transform:'translate(-50%,-8px) scale(1.15)',opacity:1,offset:.25},{transform:'translate(-50%,-34px) scale(1)',opacity:0}],{duration:900,easing:'ease-out'});
  setTimeout(()=>n.remove(),920);
}
function drBurstEl(cell, el){
  const col=(DR_PAL[el]||DR_PAL.fire).body||'#ffd35c';
  const b=document.createElement('span'); b.className='dr-cbt-burst'; b.style.setProperty('--bc',col);
  cell.appendChild(b);
  if(b.animate) b.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:.95},{transform:'translate(-50%,-50%) scale(1.8)',opacity:0}],{duration:560,easing:'ease-out'});
  setTimeout(()=>b.remove(),580);
}
// Emoji chiêu theo hệ (cho đạn bay)
const DR_EL_EMOJI={fire:'🔥',electric:'⚡',dark:'🌑',water:'🌊',ice:'❄️',light:'✨',plant:'🌿',earth:'🪨'};
// RUNG SÂN khi trúng đòn nặng / hạ gục. field = phần tử .dr-field trong modal.
function drShakeField(hard){
  const m=$('drModal'); const f=m&&m.querySelector('.dr-field'); if(!f) return;
  const cls=hard?'dr-shake-hard':'dr-shake';
  f.classList.remove('dr-shake','dr-shake-hard'); void f.offsetWidth; f.classList.add(cls);
  setTimeout(()=>f.classList.remove(cls), hard?520:340);
}
// ĐẠN CHIÊU bay từ ô này -> ô kia rồi biến mất (toạ độ tính theo .dr-field để nằm gọn trong sân).
// Hệ có ảnh ĐẠN ANIMATION (sprite 8 frame) -> dùng thay emoji cho đẹp; hệ khác vẫn fallback emoji.
const DR_PROJ_EL=new Set(['fire','electric','dark','water','ice','light','plant','earth']);
function drProjectile(fromEl, toEl, el){
  const m=$('drModal'); const field=m&&m.querySelector('.dr-field'); if(!field||!fromEl||!toEl||!fromEl.animate) return;
  const fr=field.getBoundingClientRect(), a=fromEl.getBoundingClientRect(), b=toEl.getBoundingClientRect();
  const x0=a.left+a.width/2-fr.left, y0=a.top+a.height/2-fr.top;
  const x1=b.left+b.width/2-fr.left, y1=b.top+b.height/2-fr.top;
  const dx=x1-x0, dy=y1-y0, useSprite=DR_PROJ_EL.has(el);
  const p=document.createElement('span');
  let rot;
  if(useSprite){ p.className='dr-proj dr-proj-sprite';
    p.innerHTML=`<img src="assets/dragon-island/effects/projectiles/${el}.webp" alt="" draggable="false" onerror="this.parentNode.classList.remove('dr-proj-sprite');this.replaceWith(document.createTextNode('${DR_EL_EMOJI[el]||'✨'}'))">`;
    rot=` rotate(${(Math.atan2(dy,dx)*180/Math.PI).toFixed(1)}deg)`;   // đạn xoay hướng bay
  } else { p.className='dr-proj'; p.textContent=DR_EL_EMOJI[el]||'✨'; rot=''; }
  p.style.left=x0+'px'; p.style.top=y0+'px'; field.appendChild(p);
  const frames = useSprite
    ? [ {transform:`translate(-50%,-50%)${rot} scale(.6)`,opacity:.4},
        {transform:`translate(calc(-50% + ${dx*.5}px),calc(-50% + ${dy*.5}px))${rot} scale(1.1)`,opacity:1,offset:.6},
        {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))${rot} scale(.95)`,opacity:.95} ]
    : [ {transform:'translate(-50%,-50%) scale(.5) rotate(0deg)',opacity:.5},
        {transform:`translate(calc(-50% + ${dx*.5}px),calc(-50% + ${dy*.5}px)) scale(1.25) rotate(180deg)`,opacity:1,offset:.6},
        {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1) rotate(300deg)`,opacity:.95} ];
  const an=p.animate(frames,{duration:340,easing:'cubic-bezier(.5,0,.9,.6)'});
  an.onfinish=()=>p.remove();
}

/* ============ BẠN BÈ + TẶNG QUÀ (Firebase) ============
   Mã kết bạn = uid (copy được). Kết bạn = dán mã -> đọc hồ sơ công khai leaderboard/<uid>.
   Tặng quà -> đẩy vào gifts/<friendUid> (mỗi bạn 1 lần/ngày). Hòm quà đọc gifts/<myUid> rồi nhận.
   CẦN LUẬT Firebase cho "gifts" (xem tin nhắn hướng dẫn). Client-authoritative -> chỉ để chơi vui. */
const DR_GIFT_ITEMS=[{item:'food',n:15,ic:'🍖'},{item:'gold',n:300,ic:'🪙'},{item:'food',n:25,ic:'🍖'}];
function drMyUid(){ try{ return (auth&&auth.currentUser)?auth.currentUser.uid:null; }catch(_){ return null; } }
function drPubProfile(){
  const uid=drMyUid(); if(!uid||!db) return;
  try{ db.ref('leaderboard/'+uid).set({ name:drPlayerName().slice(0,24), power:drTeamPower(), lvl:drState.level||1,
    top:drTeamTop3().map(d=>d.sp), at:firebase.database.ServerValue.TIMESTAMP }).catch(()=>{}); }catch(_){}
}
function drGiftDayLeft(uid){ return !!(drState.giftLog && drState.giftLog[uid]===drDayNum()); }
function drGiftInboxN(){ return drState._giftN||0; }
function drUpdateGiftDot(){ drSetDot('drFriendDot', drGiftInboxN()); }
function drWatchGifts(){
  if(!drState || drState._giftWatch) return; const uid=drMyUid(); if(!uid||!db) return;
  drState._giftWatch=true;
  try{ db.ref('gifts/'+uid).on('value', s=>{ if(drState){ drState._giftN=s.numChildren(); drUpdateGiftDot(); } }); }catch(_){}
}
function drAddFriend(code){
  code=(code||'').trim(); const uid=drMyUid();
  if(!code){ toast('Nhập mã bạn bè'); return; }
  if(code===uid){ toast('Đây là mã của chính bạn 😅'); return; }
  if((drState.friends||[]).some(f=>f.uid===code)){ toast('Đã là bạn rồi'); return; }
  if(!db){ toast('Cần đăng nhập online để kết bạn'); return; }
  db.ref('leaderboard/'+code).get().then(s=>{ const v=s.val();
    if(!v){ toast('Không tìm thấy người chơi với mã này'); return; }
    drState.friends=drState.friends||[]; drState.friends.push({uid:code, name:v.name||'Bạn'});
    if(typeof confetti==='function') confetti(); drSave(); drShowFriends(); toast('🤝 Đã kết bạn với '+(v.name||'Bạn')+'!');
  }).catch(()=>toast('Lỗi/chưa bật luật — xem hướng dẫn.'));
}
function drRemoveFriend(uid){ drState.friends=(drState.friends||[]).filter(f=>f.uid!==uid); drSave(); drShowFriends(); }
function drGiftFriend(uid,name){
  if(drGiftDayLeft(uid)){ toast('Hôm nay đã tặng '+name+' rồi 🎁'); return; }
  if(!db){ toast('Cần đăng nhập online'); return; }
  const g=DR_GIFT_ITEMS[Math.floor(Math.random()*DR_GIFT_ITEMS.length)];
  db.ref('gifts/'+uid).push({ from:drPlayerName().slice(0,24), fromUid:drMyUid(), item:g.item, n:g.n, at:firebase.database.ServerValue.TIMESTAMP })
    .then(()=>{ drState.giftLog=drState.giftLog||{}; drState.giftLog[uid]=drDayNum();
      drReward({food:5}); drRenderHud(); drSave(); drShowFriends(); toast('🎁 Đã tặng '+name+'! (+5🍖 cảm ơn)'); })
    .catch(()=>toast('Chưa gửi được — kiểm tra luật "gifts".'));
}
function drVisitFriend(uid,name){
  if(!db){ toast('Cần đăng nhập online'); return; }
  db.ref('leaderboard/'+uid).get().then(s=>{ const v=s.val()||{};
    const tops=(v.top||[]).slice(0,3).map(sp=>DR_SPECIES[sp]?`<span class="dr-odd-mini">${drDragonArt({sp,lv:v.lvl||1})}</span>`:'').join('');
    const body=`<div class="dr-visit-hd">🏝️ Đảo của <b>${esc(v.name||name)}</b></div>
      <div class="dr-kv"><span>Cấp đảo</span><b>${v.lvl||1}</b></div>
      <div class="dr-kv"><span>Lực đội</span><b>${fmtCoin(v.power||0)} 💪</b></div>
      <div class="dr-visit-drgs">${tops||'<span class="dr-muted">Chưa có rồng công khai</span>'}</div>
      <button class="dr-btn alt block" data-giftv="${uid}" data-name="${esc(v.name||name)}" ${drGiftDayLeft(uid)?'disabled':''}>🎁 Tặng quà hôm nay</button>
      <button class="dr-btn block" id="drBackFriends">← Về danh sách bạn</button>`;
    const bd=drModal('Thăm đảo', body, true);
    bd.querySelectorAll('[data-giftv]').forEach(b=>b.onclick=()=>drGiftFriend(b.dataset.giftv,b.dataset.name));
    const bk=$('drBackFriends'); if(bk) bk.onclick=drShowFriends;
  }).catch(()=>toast('Không tải được đảo bạn.'));
}
function drShowFriends(){
  drPubProfile(); drWatchGifts();
  const uid=drMyUid()||'—';
  const short=uid.length>12?(uid.slice(0,6)+'…'+uid.slice(-4)):uid;
  const friends=drState.friends||[];
  const flist=friends.length
    ? friends.map(f=>`<div class="dr-friend"><span class="dr-friend-ic">🐲</span><div class="dr-ach-mid"><b>${esc(f.name||'Bạn')}</b><small>${esc(f.uid.slice(0,6))}…</small></div>
        <button class="dr-btn sm" data-visit="${f.uid}" data-name="${esc(f.name||'Bạn')}">Thăm</button>
        <button class="dr-btn sm alt" data-giftf="${f.uid}" data-name="${esc(f.name||'Bạn')}" ${drGiftDayLeft(f.uid)?'disabled':''}>🎁</button></div>`).join('')
    : '<p class="dr-muted">Chưa có bạn. Chia sẻ mã của bạn hoặc dán mã bạn bè để kết bạn!</p>';
  const body=`<div class="dr-mycode"><div class="dr-mycode-lbl">Mã bạn bè của bạn (chia sẻ để người khác kết bạn):</div>
      <div class="dr-mycode-row"><code class="dr-code">${esc(short)}</code><button class="dr-btn sm" id="drCopyCode">📋 Copy</button></div></div>
    <div class="dr-addfriend"><input id="drFriendInput" class="dr-input" placeholder="Dán mã bạn bè…" autocomplete="off"><button class="dr-btn" id="drAddFriendBtn">➕ Kết bạn</button></div>
    <button class="dr-btn alt block" id="drOpenGifts">🎁 Hòm quà${drGiftInboxN()?` · ${drGiftInboxN()} món`:''}</button>
    <div class="dr-sub2">Bạn bè (${friends.length})</div><div class="dr-friend-list">${flist}</div>`;
  const bd=drModal('👫 Bạn bè', body, true);
  const cp=$('drCopyCode'); if(cp) cp.onclick=()=>{ try{ navigator.clipboard.writeText(uid); toast('Đã copy mã!'); }catch(_){ toast('Mã của bạn: '+uid); } };
  const af=$('drAddFriendBtn'); if(af) af.onclick=()=>drAddFriend(($('drFriendInput')||{}).value);
  const og=$('drOpenGifts'); if(og) og.onclick=drShowGifts;
  bd.querySelectorAll('[data-visit]').forEach(b=>b.onclick=()=>drVisitFriend(b.dataset.visit,b.dataset.name));
  bd.querySelectorAll('[data-giftf]').forEach(b=>b.onclick=()=>drGiftFriend(b.dataset.giftf,b.dataset.name));
}
function drClaimGift(id,item,n){ const uid=drMyUid(); if(!uid||!db) return;
  drReward(item==='gold'?{gold:+n}:{food:+n}); if(item==='gold')drBump('drGold'); else drBump('drFood'); drRenderHud();
  db.ref('gifts/'+uid+'/'+id).remove().catch(()=>{}); drSave();
  toast('🎁 Nhận +'+n+(item==='gold'?' 🪙':' 🍖')); }
function drShowGifts(){
  const uid=drMyUid();
  drModal('🎁 Hòm quà', '<div id="drGiftList"><p class="dr-muted">Đang tải…</p></div>', true);
  if(!uid||!db){ const l=$('drGiftList'); if(l) l.innerHTML='<p class="dr-muted">Cần đăng nhập online.</p>'; return; }
  db.ref('gifts/'+uid).get().then(s=>{ const list=$('drGiftList'); if(!list) return;
    const items=[]; s.forEach(c=>{ const v=c.val()||{}; items.push({id:c.key, from:v.from, item:v.item, n:v.n}); });
    if(!items.length){ list.innerHTML='<p class="dr-muted">Chưa có quà. Kết bạn và tặng nhau mỗi ngày nhé! 🤝</p>'; return; }
    list.innerHTML=items.map(g=>`<div class="dr-ach"><span class="dr-ach-ic">${g.item==='gold'?'🪙':'🍖'}</span>
        <div class="dr-ach-mid"><b>${esc(g.from||'Bạn')}</b><small>tặng ${g.n||10} ${g.item==='gold'?'vàng':'thức ăn'}</small></div>
        <button class="dr-btn sm" data-claim="${g.id}" data-item="${g.item}" data-n="${g.n||10}">Nhận</button></div>`).join('')
      + `<button class="dr-btn alt block" id="drClaimAll">Nhận tất cả (${items.length})</button>`;
    list.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>{ drClaimGift(b.dataset.claim,b.dataset.item,b.dataset.n); drShowGifts(); });
    const all=$('drClaimAll'); if(all) all.onclick=()=>{ items.forEach(g=>drClaimGift(g.id,g.item,g.n||10)); if(typeof confetti==='function')confetti(); drShowGifts(); };
  }).catch(()=>{ const l=$('drGiftList'); if(l) l.innerHTML='<p class="dr-muted">Chưa bật luật "gifts" trên Firebase — xem hướng dẫn trong game.</p>'; });
}

/* ============ HỆ THỐNG SỰ KIỆN (tự xoay theo tuần) ============
   Mỗi tuần 1 chủ đề (DR_EVENTS xoay vòng). Chơi bất kỳ (nuôi/lai/đánh/thu vàng…) đều tích
   ĐIỂM SỰ KIỆN (nối vào drAddXp). Đạt mốc -> nhận thưởng, mốc cuối tặng RỒNG SỰ KIỆN.
   NOTE ART: icon 🎉 trên dock + ảnh 4 chủ đề (Trăng Rằm/Lửa/Đại Dương/Hoa) -> xem AI-ART-TODO.txt */
const DR_EVENTS=[
  {id:'moon',  ic:'🌕', img:'assets/dragon-island/events/moon.webp',    name:'Lễ Hội Trăng Rằm',  miles:[{pts:50,r:{gold:1500}},{pts:130,r:{gems:8}},{pts:240,r:{food:120}},{pts:380,r:{gems:15}},{pts:540,r:{gold:6000,gems:12}},{pts:720,r:{gems:30,dragon:'candy'}}]},
  {id:'flame', ic:'🔥', img:'assets/dragon-island/events/flame.webp',   name:'Lễ Hội Lửa Thiêng', miles:[{pts:50,r:{gold:1800}},{pts:130,r:{gems:8}},{pts:240,r:{gems:12}},{pts:380,r:{food:120}},{pts:540,r:{gems:18}},{pts:720,r:{gems:35,dragon:'lava'}}]},
  {id:'ocean', ic:'🌊', img:'assets/dragon-island/events/ocean.webp',   name:'Ngày Hội Đại Dương', miles:[{pts:50,r:{gold:1500}},{pts:130,r:{food:120}},{pts:240,r:{gems:12}},{pts:380,r:{gems:15}},{pts:540,r:{gold:6000,gems:12}},{pts:720,r:{gems:32,dragon:'steam'}}]},
  {id:'bloom', ic:'🌸', img:'assets/dragon-island/events/blossom.webp', name:'Mùa Hoa Nở',        miles:[{pts:50,r:{gold:1300}},{pts:130,r:{gems:8}},{pts:240,r:{food:120}},{pts:380,r:{gems:15}},{pts:540,r:{gems:18}},{pts:720,r:{gems:30,dragon:'peach'}}]},
];
function drEventWeek(){ return Math.floor(drNow()/604800000); }
function drEventDef(){ return DR_EVENTS[drEventWeek()%DR_EVENTS.length]; }
function drEventSync(){ if(!drState.event) drState.event={week:-1,pts:0,claimed:[]};
  const w=drEventWeek(); if(drState.event.week!==w){ drState.event.week=w; drState.event.pts=0; drState.event.claimed=[]; }
  return drState.event; }
function drEventGain(n){ if(!drState||!drState.event) return; drEventSync(); drState.event.pts+=Math.max(0,Math.round(n||0)); }
function drEventClaimable(){ if(!drState||!drState.event) return 0; drEventSync();
  const def=drEventDef(), c=drState.event.claimed||[];
  return def.miles.filter((m,i)=>drState.event.pts>=m.pts && !c.includes(i)).length; }
function drUpdateEventDot(){ drSetDot('drEventDot', drEventClaimable()); }
function drEvtLeftTxt(){ const end=(drEventWeek()+1)*604800000; let s=Math.max(0,Math.floor((end-drNow())/1000));
  const d=Math.floor(s/86400); s-=d*86400; const h=Math.floor(s/3600); return d>0?(d+' ngày '+h+' giờ'):(h+' giờ'); }
function drClaimEventMile(i){
  drEventSync(); const def=drEventDef(), m=def.miles[i]; if(!m) return;
  if(drState.event.pts<m.pts || (drState.event.claimed||[]).includes(i)) return;
  drState.event.claimed.push(i);
  if(m.r.dragon && DR_SPECIES[m.r.dragon]){
    if(drState.dragons.length < (typeof drCapacity==='function'?drCapacity():12)){
      drState.dragons.push({sp:m.r.dragon,lv:1,fed:0,star:1}); drFocusLast(); toast('🥚 Nhận rồng sự kiện: '+DR_SPECIES[m.r.dragon].name+'!');
    } else { drState.gems+=20; toast('Các đảo đầy — quy đổi rồng thành +20 💎'); }
  }
  drReward({gold:m.r.gold, gems:m.r.gems, food:m.r.food});
  if(typeof confetti==='function') confetti();
  drRenderHud(); if(typeof drRenderDragons==='function') drRenderDragons(); drSave(); drShowEvent();
  toast('🎉 Nhận mốc '+m.pts+' điểm!');
}
function drShowEvent(){
  drEventSync(); const def=drEventDef(), ev=drState.event, c=ev.claimed||[];
  const maxPts=def.miles[def.miles.length-1].pts, pct=Math.min(100,Math.round(ev.pts/maxPts*100));
  const miles=def.miles.map((m,i)=>{ const reached=ev.pts>=m.pts, got=c.includes(i);
    const rw=m.r.dragon?('🐣 '+(DR_SPECIES[m.r.dragon]?DR_SPECIES[m.r.dragon].name:'Rồng')):drRewardText(m.r);
    return `<div class="dr-evt-mile"><span class="dr-evt-pts">${m.pts}đ</span><span class="dr-ach-rw">${rw}</span>
      ${got?'<span class="dr-ach-ok">✓</span>':(reached?`<button class="dr-btn sm" data-evt="${i}">Nhận</button>`:'<span class="dr-ach-lock">🔒</span>')}</div>`;
  }).join('');
  const evIc=def.img?drAsset(def.img, def.ic, 'dr-evt-ic-lg'):def.ic;
  const body=`<div class="dr-evt-banner">${evIc}<b>${def.name}</b></div>
    <p class="dr-hab-intro">Còn <b>${drEvtLeftTxt()}</b>. Chơi bất kỳ (nuôi/lai/đánh/thu vàng…) để tích <b>điểm sự kiện</b>. Mốc cuối tặng <b>rồng sự kiện</b>! 🐉</p>
    <div class="dr-feedbar big"><i style="width:${pct}%"></i><em>${fmtCoin(ev.pts)} / ${fmtCoin(maxPts)} điểm</em></div>
    <div class="dr-evt-miles">${miles}</div>`;
  const bd=drModal(def.ic+' Sự kiện tuần', body, true);
  bd.addEventListener('click',e=>{ const b=e.target.closest('[data-evt]'); if(b) drClaimEventMile(+b.dataset.evt); });
}

/* ============ ĐÁ CƯỜNG HÓA (Runes) — gắn vào rồng tăng lực đánh ============
   Túi đá drState.runes=[{t,tier}]; gắn lên rồng d.runes=[{t,tier}] (tối đa 3 ô).
   Cộng thẳng vào drCombatStats (đánh nhau) + drPower (lực). Ghép đá tốn vàng.
   NOTE ART: icon 💎 dock + icon 3 loại đá (Công/Thủ/Tốc) -> AI-ART-TODO.txt */
const DR_RUNE={ atk:{name:'Đá Công',ic:'🔴',unit:'% ATK'}, hp:{name:'Đá Thủ',ic:'🟢',unit:'% HP'}, spd:{name:'Đá Tốc',ic:'🔵',unit:' SPD'} };
const DR_RUNE_VAL={ atk:[8,16,28], hp:[10,20,35], spd:[1,2,3] };
const DR_RUNE_SLOTS=3, DR_RUNE_CRAFT=800;
let drRuneSel=0;
function drRuneStr(r){ const d=DR_RUNE[r.t]; if(!d) return '?'; const t=r.tier||1;
  return `${drAsset('assets/dragon-island/runes/'+r.t+'-t'+t+'.webp', d.ic)} +${DR_RUNE_VAL[r.t][t-1]}${d.unit} · T${t}`; }
function drRuneBonus(d){ let atk=0,hp=0,spd=0; ((d&&d.runes)||[]).forEach(r=>{ const v=DR_RUNE_VAL[r.t]; if(!v)return; const x=v[(r.tier||1)-1]||0;
  if(r.t==='atk')atk+=x/100; else if(r.t==='hp')hp+=x/100; else spd+=x; }); return {atk,hp,spd}; }
function drCraftRune(){
  if(drState.gold<DR_RUNE_CRAFT){ toast('Thiếu vàng (cần '+fmtCoin(DR_RUNE_CRAFT)+' 🪙)'); return; }
  drState.gold-=DR_RUNE_CRAFT;
  const t=['atk','hp','spd'][Math.floor(Math.random()*3)];
  const roll=Math.random(), tier= roll<0.6?1:(roll<0.9?2:3);
  drState.runes=drState.runes||[]; drState.runes.push({t,tier});
  if(typeof drQC==='function') drQC('rune'); if(typeof drUpdateQuestDot==='function') drUpdateQuestDot();
  drRenderHud(); drSave(); drShowRunes(drRuneSel);
  toast('💎 Ghép được '+drRuneStr({t,tier})+'!'); if(tier===3&&typeof confetti==='function') confetti();
}
function drEquipRune(ri){
  const d=drState.dragons[drRuneSel], r=(drState.runes||[])[ri]; if(!d||!r) return;
  d.runes=d.runes||[]; if(d.runes.length>=DR_RUNE_SLOTS){ toast('Rồng đã đủ '+DR_RUNE_SLOTS+' ô đá'); return; }
  d.runes.push(r); drState.runes.splice(ri,1);
  if(typeof drRenderDragons==='function') drRenderDragons(); drSave(); drShowRunes(drRuneSel); toast('Gắn đá 💎');
}
function drUnequipRune(si){
  const d=drState.dragons[drRuneSel]; if(!d||!d.runes) return; const r=d.runes[si]; if(!r) return;
  d.runes.splice(si,1); drState.runes=drState.runes||[]; drState.runes.push(r);
  drSave(); drShowRunes(drRuneSel); toast('Gỡ đá vào túi');
}
function drShowRunes(sel){
  drRuneSel=Math.max(0,Math.min(drState.dragons.length-1, (sel==null?drRuneSel:sel)));
  const d=drState.dragons[drRuneSel], s=DR_SPECIES[d.sp]||DR_SPECIES.fire, b=drRuneBonus(d);
  const picker=drState.dragons.map((dd,i)=>`<button class="dr-rune-drg ${i===drRuneSel?'on':''}" data-rsel="${i}">${drDragonArt(dd)}<span class="dr-hab-lv">Lv${dd.lv}</span></button>`).join('');
  const slots=Array.from({length:DR_RUNE_SLOTS},(_,i)=>{ const r=(d.runes||[])[i];
    return r?`<button class="dr-rune-slot filled" data-unrune="${i}" title="Gỡ ra">${drRuneStr(r)}</button>`:'<div class="dr-rune-slot empty">＋ ô trống</div>'; }).join('');
  const inv=(drState.runes||[]).length
    ? drState.runes.map((r,i)=>`<button class="dr-rune-item" data-eqrune="${i}">${drRuneStr(r)}</button>`).join('')
    : '<span class="dr-muted">Túi trống — ghép đá bên dưới 👇</span>';
  const body=`<p class="dr-hab-intro">Gắn <b>đá cường hóa</b> vào rồng để tăng sức đánh (mỗi rồng ${DR_RUNE_SLOTS} ô). Chạm đá trong túi để gắn, chạm ô đá để gỡ.</p>
    <div class="dr-rune-pick">${picker}</div>
    <div class="dr-sub2">${esc(s.name)} — <span style="color:#ffd76a">+${Math.round(b.atk*100)}% ATK · +${Math.round(b.hp*100)}% HP · +${b.spd} SPD</span></div>
    <div class="dr-rune-slots">${slots}</div>
    <div class="dr-sub2">Túi đá (${(drState.runes||[]).length})</div><div class="dr-rune-inv">${inv}</div>
    <button class="dr-btn alt block" id="drCraftRune">💎 Ghép đá ngẫu nhiên · ${fmtCoin(DR_RUNE_CRAFT)} 🪙</button>`;
  const bd=drModal('💎 Cường hóa', body, true);
  bd.querySelectorAll('[data-rsel]').forEach(x=>x.onclick=()=>drShowRunes(+x.dataset.rsel));
  bd.querySelectorAll('[data-unrune]').forEach(x=>x.onclick=()=>drUnequipRune(+x.dataset.unrune));
  bd.querySelectorAll('[data-eqrune]').forEach(x=>x.onclick=()=>drEquipRune(+x.dataset.eqrune));
  const cr=$('drCraftRune'); if(cr) cr.onclick=drCraftRune;
}

/* ============ ĐẤU HẠNG PvP (async, dùng engine đánh theo lượt) ============
   Đấu với ĐỘI của người chơi khác lấy từ leaderboard (không cần họ online).
   Thắng +điểm hạng, thua -ít. Leo hạng Đồng→Cao Thủ. Thưởng theo tuần.
   NOTE ART: icon 🏅 dock -> AI-ART-TODO.txt */
const DR_RANK_IMG='assets/dragon-island/ranks/';
const DR_RANKS=[{min:0,name:'Đồng',ic:'🥉',img:'bronze'},{min:100,name:'Bạc',ic:'🥈',img:'silver'},{min:250,name:'Vàng',ic:'🥇',img:'gold'},{min:500,name:'Bạch Kim',ic:'💠',img:'platinum'},{min:1000,name:'Kim Cương',ic:'💎',img:'diamond'},{min:2000,name:'Cao Thủ',ic:'👑',img:'master'}];
function drRankIcon(r,cls){ return r.img?drAsset(DR_RANK_IMG+r.img+'.webp', r.ic, cls):r.ic; }
function drRankOf(pts){ let r=DR_RANKS[0]; for(const x of DR_RANKS) if(pts>=x.min) r=x; return r; }
function drRankNext(pts){ return DR_RANKS[DR_RANKS.indexOf(drRankOf(pts))+1]||null; }
function drMyTeamPow(){ return drTeamTop3().reduce((s,d)=>s+drPower(d),0); }
function drArenaSync(){ if(!drState.arena) drState.arena={pts:0,week:-1,wins:0,claimed:false};
  const w=Math.floor(drNow()/604800000); if(drState.arena.week!==w){ drState.arena.week=w; drState.arena.claimed=false; drState.arena.wins=0; }
  return drState.arena; }
function drRankWeekReward(){ return Math.max(2,(DR_RANKS.indexOf(drRankOf((drState.arena||{}).pts||0))+1)*4); }
function drRankedFight(){
  const myTeam=drTeamTop3(); if(!myTeam.length){ toast('Cần có rồng để đấu'); return; }
  drArenaSync(); const mp=drMyTeamPow();
  const go=(oppTeam,oppName,oppPow)=>{
    drStartBattle(myTeam, oppTeam, {
      title:'⚔️ Đấu Hạng',
      onWin:()=>{ const gain=15+Math.round(Math.min(2,oppPow/Math.max(1,mp))*12); drState.arena.pts+=gain; drState.arena.wins=(drState.arena.wins||0)+1;
        drState.gems+=1; drAddXp(20); drRenderHud(); drSave(); toast('🏆 Thắng '+oppName+'! +'+gain+' điểm hạng · +1 💎'); },
      onLose:()=>{ drState.arena.pts=Math.max(0,drState.arena.pts-10); drSave(); toast('💪 Thua '+oppName+' · -10 điểm hạng'); },
      onDone:()=>drShowRanked()
    });
  };
  const ai=()=>go(drMakeEnemyTeam(mp,3),'Máy luyện tập',mp);
  if(auth&&auth.currentUser&&db){
    db.ref('leaderboard').limitToLast(25).get().then(s=>{
      const arr=[]; s.forEach(c=>{ if(c.key!==auth.currentUser.uid){ const v=c.val()||{}; if(v.top&&v.top.length) arr.push(v); } });
      if(!arr.length) return ai();
      const o=arr[Math.floor(Math.random()*arr.length)];
      const team=o.top.slice(0,3).map(sp=>({sp:(DR_SPECIES[sp]?sp:'fire'), lv:Math.max(1,Math.min(15,o.lvl||5)), star:1}));
      go(team, (o.name||'Đối thủ').slice(0,16), o.power||mp);
    }).catch(ai);
  } else ai();
}
function drShowRanked(){
  drArenaSync(); if(typeof drPubProfile==='function') drPubProfile();
  const a=drState.arena, rank=drRankOf(a.pts), nx=drRankNext(a.pts);
  const prog=nx?Math.max(0,Math.min(100,Math.round((a.pts-rank.min)/(nx.min-rank.min)*100))):100;
  const wr=drRankWeekReward();
  const ladder=DR_RANKS.map(r=>`<span class="dr-rank-pip ${r.name===rank.name?'on':''}">${drRankIcon(r)}</span>`).join('');
  const body=`<div class="dr-rank-hd">${drRankIcon(rank,'dr-rank-ic-lg')} <b>Hạng ${rank.name}</b> · ${fmtCoin(a.pts)} điểm</div>
    <div class="dr-rank-ladder">${ladder}</div>
    <div class="dr-feedbar big"><i style="width:${prog}%"></i><em>${nx?(fmtCoin(a.pts)+' / '+fmtCoin(nx.min)+' → '+nx.name):'Hạng cao nhất! 👑'}</em></div>
    <div class="dr-kv"><span>Thắng tuần này</span><b>${a.wins||0}</b></div>
    <button class="dr-btn go block" id="drRankFight">⚔️ Tìm đối thủ · đấu theo lượt</button>
    <button class="dr-btn alt block" id="drRankReward" ${a.claimed?'disabled':''}>${a.claimed?'✅ Đã nhận thưởng tuần':('🎁 Thưởng tuần (hạng '+rank.name+'): +'+wr+' 💎')}</button>
    <p class="dr-hab-intro">Đấu với <b>đội của người chơi khác</b> (không cần họ online). Thắng lên điểm hạng; cuối tuần nhận thưởng theo hạng. Reset thắng mỗi tuần.</p>`;
  const bd=drModal('🏅 Đấu Hạng', body, true);
  const f=$('drRankFight'); if(f) f.onclick=drRankedFight;
  const rb=$('drRankReward'); if(rb) rb.onclick=()=>{ drArenaSync(); if(drState.arena.claimed){ toast('Tuần này đã nhận rồi'); return; }
    drState.arena.claimed=true; drState.gems+=wr; drRenderHud(); drSave(); if(typeof confetti==='function') confetti(); drShowRanked(); drNotify('reward','Thưởng hạng '+rank.name+': +'+wr+' 💎'); };
}

/* ================= THÁP VÔ TẬN =================
   Leo tầng vô hạn: mỗi tầng địch mạnh dần, thắng ăn thưởng tăng dần + qua tầng (lưu 'floor').
   "Quét tháp": mỗi ngày nhận nhanh thưởng (×2) của tầng cao nhất đã qua, không cần đánh
   -> vẫn có lý do mở game mỗi ngày ngay cả khi đã chạm trần sức mạnh. Tái dùng engine đấu theo lượt. */
const DR_TOWER_BASE=140;        // lực địch tầng 1
const DR_TOWER_GROWTH=1.27;     // nhân lực mỗi tầng
function drTower(){ if(!drState.tower) drState.tower={floor:0,sweepDay:0}; return drState.tower; }
function drTowerPower(floor){ return Math.round(DR_TOWER_BASE*Math.pow(DR_TOWER_GROWTH, floor)); }
function drTowerReward(floor){                      // thưởng khi CHINH PHỤC tầng thứ (floor+1)
  const n=floor+1, r={gold:Math.round(260*Math.pow(1.21, floor))};
  if(n%3===0) r.food=15+Math.floor(n/3)*5;
  if(n%5===0) r.gems=2+Math.floor(n/5);             // mỗi 5 tầng có 💎, tăng dần
  return r;
}
function drTowerSweepReward(){                       // quét ngày: gấp đôi thưởng tầng cao nhất đã qua
  const t=drTower(); if(t.floor<=0) return null;
  const base=drTowerReward(t.floor-1);
  return {gold:Math.round((base.gold||0)*2), gems:(base.gems||0), food:Math.round((base.food||0)*2)};
}
function drCanTowerSweep(){ const t=drTower(); return t.floor>0 && (t.sweepDay||0)<drDayNum(); }
function drTowerSweep(){
  if(!drCanTowerSweep()){ toast('Hôm nay đã quét tháp rồi — mai quay lại 🗼'); return; }
  const r=drTowerSweepReward(); if(!r) return;
  drTower().sweepDay=drDayNum(); drReward(r);
  if(typeof drEventGain==='function') drEventGain(20);
  drRenderHud(); drSave(); if(typeof confetti==='function') confetti();
  if(typeof drUpdateFeatureDots==='function') drUpdateFeatureDots();
  drShowTower(); toast('🧹 Quét tháp: +'+drRewardText(r));
}
function drTowerClimb(){
  const floor=drTower().floor, power=drTowerPower(floor);
  drCloseModal();
  drStartBattle(drTeamTop3(), drMakeEnemyTeam(power, 3), {
    title:'🗼 Tháp · Tầng '+(floor+1), theme:'tower',
    onWin:()=>{ const r=drTowerReward(floor); drTower().floor=floor+1; drReward(r);
      if(typeof drQC==='function'){ drQC('win'); drQC('tower'); }
      if(typeof drEventGain==='function') drEventGain(Math.round(power/40));
      if(typeof drUpdateQuestDot==='function') drUpdateQuestDot();
      if(typeof confetti==='function') confetti(); drRenderHud(); drSave();
      toast('🏆 Chinh phục Tầng '+(floor+1)+'! +'+drRewardText(r)); },
    onDone:()=>drShowTower()
  });
}
function drShowTower(){
  const t=drTower(), floor=t.floor, power=drTowerPower(floor), tp=drTeamPower();
  const r=drTowerReward(floor), strong=tp>=power;
  const sweepR=drTowerSweepReward(), canSweep=drCanTowerSweep();
  const body=`<p class="dr-hab-intro">Leo tháp vô tận — mỗi tầng địch mạnh dần, thắng nhận thưởng tăng theo. Ra trận bằng 3 rồng mạnh nhất.</p>
    <div class="dr-kv"><span>Tầng cao nhất đã qua</span><b>${floor}</b></div>
    <div class="dr-kv"><span>Lực đội của bạn</span><b>${fmtCoin(tp)} 💪</b></div>
    <div class="dr-tower-next">
      <div><b>Tầng ${floor+1}</b> · địch ${fmtCoin(power)} lực ${strong?'<span class="dr-adv-ok">✓ đủ sức</span>':'<span class="dr-tower-warn">⚠ hơi mạnh</span>'}</div>
      <small>Thưởng qua tầng: ${drRewardText(r)}</small>
    </div>
    <button class="dr-btn go block" id="drTowerClimb">⚔️ Leo Tầng ${floor+1}</button>
    <button class="dr-btn alt block" id="drTowerSweep" ${canSweep?'':'disabled'}>${canSweep?('🧹 Quét tháp hôm nay · +'+drRewardText(sweepR)):(floor<=0?'🧹 Qua 1 tầng để mở Quét ngày':'✅ Hôm nay đã quét tháp')}</button>`;
  drModal('🗼 Tháp Vô Tận', body, true);
  const c=$('drTowerClimb'); if(c) c.onclick=drTowerClimb;
  const s=$('drTowerSweep'); if(s) s.onclick=drTowerSweep;
}

/* ================= CHUYỂN SINH (Prestige) =================
   Reset "ván chơi" (đàn rồng, cấp, vàng, Phiêu lưu, Tháp, Khu đảo...) để nhận Linh Khí 🔮 —
   tiền tệ vĩnh viễn mua hệ số nhân TOÀN CỤC (vàng/lực/XP) không bao giờ mất.
   GIỮ NGUYÊN: Sách rồng đã sưu tầm (drState.seen), 💎, Lò rèn, Cường hoá, Trang trí, Bạn bè, Thư. */
const DR_REBIRTH_MIN=2500;          // lực đội tối thiểu để Chuyển Sinh (đạt được sau 1 lượt chơi ổn)
function drReb(){ if(!drState.rebirth) drState.rebirth={count:0,ki:0,up:{gold:0,power:0,xp:0}}; if(!drState.rebirth.up) drState.rebirth.up={gold:0,power:0,xp:0}; return drState.rebirth; }
function drRebLv(kind){ const u=(drState&&drState.rebirth&&drState.rebirth.up)||{}; return u[kind]||0; }
function drRebirthGoldMult(){ const r=drState&&drState.rebirth; if(!r) return 1; return (1+0.10*drRebLv('gold'))*(1+0.03*(r.count||0)); }
function drRebirthPowerMult(){ const r=drState&&drState.rebirth; if(!r) return 1; return (1+0.08*drRebLv('power'))*(1+0.03*(r.count||0)); }
function drRebirthXpMult(){ const r=drState&&drState.rebirth; if(!r) return 1; return 1+0.12*drRebLv('xp'); }
function drRebirthGain(){ return Math.floor(Math.sqrt(drTeamPower()/1200)); }   // Linh Khí (2500→1, 4800→2, 10800→3, 30k→5, 120k→10)
function drCanRebirth(){ return drTeamPower()>=DR_REBIRTH_MIN && drRebirthGain()>=1; }
const DR_REB_UP={
  gold:  {name:'Vàng Vĩnh Cửu', ic:'🪙', per:'+10% vàng'},
  power: {name:'Lực Vĩnh Cửu',  ic:'⚔️', per:'+8% lực'},
  xp:    {name:'Trí Tuệ Cổ',    ic:'⭐', per:'+12% XP'},
};
function drRebUpCost(kind){ return drRebLv(kind)+1; }    // Lv0→1:1🔮, Lv1→2:2🔮 ...
function drBuyRebUp(kind){
  const r=drReb(), cost=drRebUpCost(kind);
  if((r.ki||0)<cost){ toast('Thiếu Linh Khí 🔮 (cần '+cost+')'); return; }
  r.ki-=cost; r.up[kind]=drRebLv(kind)+1;
  drRenderHud(); drSave(); drShowRebirth(); toast('🔮 Nâng '+DR_REB_UP[kind].name+' → Lv'+r.up[kind]);
}
let drRebConfirm=false;
function drDoRebirth(){
  if(!drCanRebirth()){ toast('Cần lực đội ≥ '+fmtCoin(DR_REBIRTH_MIN)+' để Chuyển Sinh'); return; }
  const gain=drRebirthGain(), r=drReb();
  drState.seen=Array.from(new Set([...(drState.seen||[]), ...drState.dragons.map(d=>d.sp)]));   // giữ bộ sưu tập
  r.count=(r.count||0)+1; r.ki=(r.ki||0)+gain;
  const def=drDefault();                    // reset "ván chơi", giữ meta
  drState.dragons=def.dragons; drState.gold=def.gold; drState.food=def.food; drState.ore=0;
  drState.level=1; drState.xp=0; drState.adv=0; drState.breed=null; drState.pity=0;
  drState.tower={floor:0,sweepDay:0};
  drState.habitats=def.habitats; drState.habNext=3; drState.farm=[0,0,0];
  drState.qc={tap:0,feed:0,breed:0,win:0,clear:0}; drState.qClaimed=[]; drState.cleared=[];
  drCloseModal(); if(typeof drRenderDragons==='function') drRenderDragons(); drRenderHud(); drSave();
  if(typeof drUpdateQuestDot==='function') drUpdateQuestDot();
  if(typeof confetti==='function') confetti();
  toast('🔮 Chuyển Sinh lần '+r.count+'! +'+gain+' Linh Khí');
  drShowRebirth();
}
function drShowRebirth(keepConfirm){
  if(!keepConfirm) drRebConfirm=false;
  const r=drReb(), tp=drTeamPower(), gain=drRebirthGain(), can=drCanRebirth();
  const goldM=Math.round((drRebirthGoldMult()-1)*100), powM=Math.round((drRebirthPowerMult()-1)*100), xpM=Math.round((drRebirthXpMult()-1)*100);
  const upRow=(k)=>{ const d=DR_REB_UP[k], lv=drRebLv(k), cost=drRebUpCost(k), afford=(r.ki||0)>=cost;
    return `<div class="dr-reb-up"><span class="dr-reb-ic">${d.ic}</span>
      <div class="dr-reb-mid"><b>${d.name}</b><small>Lv${lv} · ${d.per} mỗi cấp</small></div>
      <button class="dr-btn sm ${afford?'alt':''}" data-rebup="${k}" ${afford?'':'disabled'}>${cost} 🔮</button></div>`; };
  const body=`<div class="dr-reb-hd">🔮 <b>${fmtCoin(r.ki||0)}</b> Linh Khí · đã Chuyển Sinh <b>${r.count||0}</b> lần</div>
    <div class="dr-reb-mults">🪙 +${goldM}% vàng · ⚔️ +${powM}% lực · ⭐ +${xpM}% XP</div>
    <div class="dr-reb-cur">
      <div class="dr-kv"><span>Lực đội hiện tại</span><b>${fmtCoin(tp)} 💪</b></div>
      <div class="dr-kv"><span>Chuyển Sinh sẽ nhận</span><b>+${gain} 🔮</b></div>
    </div>
    <button class="dr-btn ${can&&drRebConfirm?'go':(can?'alt':'')} block" id="drRebGo" ${can?'':'disabled'}>${can?(drRebConfirm?'⚠️ Chắc chắn? Nhấn lần nữa để RESET':('🔮 Chuyển Sinh · nhận +'+gain+' Linh Khí')):('🔒 Cần lực đội ≥ '+fmtCoin(DR_REBIRTH_MIN))}</button>
    <div class="dr-reb-shop"><div class="dr-sub2">Nâng cấp vĩnh viễn (mua bằng 🔮)</div>${upRow('gold')}${upRow('power')}${upRow('xp')}</div>
    <p class="dr-hab-intro">Chuyển Sinh reset đàn rồng, cấp, vàng, Phiêu lưu, Tháp, Khu đảo → đổi lấy Linh Khí mua hệ số nhân <b>vĩnh viễn</b>. <b>Giữ nguyên:</b> Sách rồng đã sưu tầm, 💎, Lò rèn, Cường hoá, Trang trí, Bạn bè.</p>`;
  const bd=drModal('🔮 Chuyển Sinh', body, true);
  const go=$('drRebGo'); if(go) go.onclick=()=>{ if(!drRebConfirm){ drRebConfirm=true; drShowRebirth(true); return; } drRebConfirm=false; drDoRebirth(); };
  bd.addEventListener('click',e=>{ const b=e.target.closest('[data-rebup]'); if(b) drBuyRebUp(b.dataset.rebup); });
}

/* ---------- Tự kiểm tra loài rồng (chạy drSpeciesAudit() trong console) ----------
   Báo loài nào CHƯA thể sở hữu (không lai được & không phải rồng thường khởi đầu &
   không quay được), và công thức lai tham chiếu loài/hệ lạ. Rồng mới thêm vào
   DR_SPECIES sẽ tự vào Sách rồng/Vòng quay; nếu có 'el' thì tự lai được cặp cùng hệ. */
function drSpeciesAudit(){
  const problems=[];
  const allEls=new Set(Object.values(DR_SPECIES).map(s=>s.el));
  // loài nào ra được từ bảng lai (mọi cặp hệ)?
  const els=[...allEls]; const breedable=new Set();
  for(const a of els) for(const b of els){ try{ drBreedPool(a,b).forEach(sp=>breedable.add(sp)); }catch(_){}}
  for(const sp in DR_SPECIES){ const s=DR_SPECIES[sp], rr=drRarRank(sp);
    const canSpin=rr>=1, canBreed=breedable.has(sp), isStarter=(rr===0);
    if(!canSpin && !canBreed && !isStarter) problems.push('KHÔNG SỞ HỮU ĐƯỢC: '+sp+' ('+s.name+')');
    if(DR_SP_ORDER.indexOf(sp)<0) problems.push('THIẾU trong DR_SP_ORDER: '+sp);
  }
  for(const key in DR_BREED) DR_BREED[key].forEach(sp=>{ if(!DR_SPECIES[sp]) problems.push('Công thức "'+key+'" ra loài lạ: '+sp); });
  if(problems.length){ console.warn('⚠️ drSpeciesAudit — '+problems.length+' vấn đề:'); problems.forEach(p=>console.warn('  • '+p)); }
  else console.log('✅ drSpeciesAudit: '+Object.keys(DR_SPECIES).length+' loài rồng đều sở hữu được (lai/quay) và có trong Sách rồng.');
  return problems;
}
