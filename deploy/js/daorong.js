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
    ['event',['sự kiện']],['runes',['cường hóa','đá rồng','rune']],['ranked',['đấu hạng','xếp hạng mùa']],['rebirth',['chuyển sinh']],
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
       sheet:{url:'assets/dragons/<id>.png', frames:8, fps:8}
   CHUẨN ẢNH (giống fire.png / water.png): 1 dải NGANG 8 khung đi bộ 4 chân, NỀN TRONG SUỐT,
   nhìn nghiêng 3/4, cùng nhân vật + cỡ ở mọi khung, style chibi mắt to má hồng.

   ĐÃ TẠO ẢNH + GẮN ATLAS TIẾN HOÁ 4×8:
     • peach → "Rồng Đào Hồng"  → assets/dragons/peach.png + evolution/peach.png
     • candy → "Rồng Kẹo Ngọt"  → assets/dragons/candy.png + evolution/candy.png

   Ý TƯỞNG MÀU DỄ THƯƠNG THÊM (tạo ảnh xong nói tên+màu, mình thêm data mỗi con 1 dòng):
     • mint   "Rồng Bạc Hà"    — XANH MINT pastel #9be7c4
     • lemon  "Rồng Chanh"     — VÀNG chanh #ffe37a
     • berry  "Rồng Việt Quất" — XANH-TÍM berry #8aa0ff
     • coral  "Rồng San Hô"    — CAM-HỒNG san hô #ff9e7a
     • cloud  "Rồng Mây"       — XÁM-XANH mây pastel #cfe3ff
     • rainbow "Rồng Cầu Vồng" — nhiều màu pastel chuyển sắc

   PROMPT MẪU CHO AI (thay [MÀU] / [TÊN]):
     "A super cute chibi baby dragon, [MÀU] pastel body, big sparkly round eyes, rosy cheeks,
      tiny wings, short horns, 3/4 side view. ONE horizontal sprite sheet of 8 frames forming a
      smooth 4-legged walk cycle — identical character, size and colors in every frame, walking in
      place. Transparent background, soft cel-shaded game art, centered, even spacing between frames."
   =========================================================================================== */
const DR_SPECIES={
  peach:   {name:'Rồng Đào Hồng',   el:'plant',   els:['plant'],          rar:'rare',   gold:18, atk:48, hp:125, range:4, spd:6, evo:'assets/dragons/evolution/peach.png', sheet:{url:'assets/dragons/peach.png',frames:8,fps:7,act:1.35}, pal:{body:'#ff9ec4',bd:'#ffe0ee',wg:'#ffc2dc',st:'#e85b93',horn:'#d43f7a'}},
  candy:   {name:'Rồng Kẹo Ngọt',   el:'water',   els:['water'],          rar:'rare',   gold:20, atk:52, hp:120, range:4, spd:7, evo:'assets/dragons/evolution/candy.png', sheet:{url:'assets/dragons/candy.png',frames:8,fps:8,act:1.25}, pal:{body:'#c89bf0',bd:'#f4e6ff',wg:'#dcc2f5',st:'#8f5ecf',horn:'#7346b3'}},
  mint:    {name:'Rồng Bạc Hà',     el:'plant',   els:['plant'],          rar:'rare',   gold:19, atk:46, hp:130, range:4, spd:6, pal:{body:'#9be7c4',bd:'#e4fbf0',wg:'#bff2dc',st:'#3fae86',horn:'#2f9670'}},
  lemon:   {name:'Rồng Chanh',      el:'electric',els:['electric'],       rar:'rare',   gold:21, atk:58, hp:112, range:5, spd:8, pal:{body:'#ffe37a',bd:'#fff9d6',wg:'#ffee9e',st:'#d9a516',horn:'#b9860d'}},
  berry:   {name:'Rồng Việt Quất',  el:'ice',     els:['ice'],            rar:'rare',   gold:20, atk:50, hp:122, range:4, spd:6, pal:{body:'#8aa0ff',bd:'#e6ebff',wg:'#b3c0ff',st:'#5566cc',horn:'#3f4ba3'}},
  coral:   {name:'Rồng San Hô',     el:'fire',    els:['fire'],           rar:'rare',   gold:20, atk:54, hp:118, range:4, spd:7, pal:{body:'#ff9e7a',bd:'#ffe6dc',wg:'#ffc2ac',st:'#e8663f',horn:'#c24a25'}},
  cloud:   {name:'Rồng Mây',        el:'water',   els:['water'],          rar:'rare',   gold:19, atk:48, hp:126, range:4, spd:6, pal:{body:'#cfe3ff',bd:'#f0f7ff',wg:'#e0eeff',st:'#8fa8c8',horn:'#6f88a8'}},
  rainbow: {name:'Rồng Cầu Vồng',   el:'light',   els:['light'],          rar:'epic',   gold:40, atk:80, hp:150, range:5, spd:8, pal:{body:'#ff9ec4',bd:'#fff0f8',wg:'#c9b3ff',st:'#b0569f',horn:'#8f3f86'}},
  sakura:  {name:'Rồng Anh Đào',    el:'plant',   els:['plant'],          rar:'rare',   gold:19, atk:50, hp:124, range:4, spd:6, pal:{body:'#ff8fc7',bd:'#ffe3f1',wg:'#ffb3d9',st:'#e84f95',horn:'#c93a7a'}},
  fire:    {name:'Rồng Lửa',       el:'fire',    els:['fire'],           rar:'common', gold:10, atk:42, hp:100, range:3, spd:6, evo:'assets/dragons/evolution/fire.png',       sheet:{url:'assets/dragons/fire.png', frames:8, fps:7, act:1.25}},
  water:   {name:'Rồng Nước',      el:'water',   els:['water'],          rar:'common', gold:10, atk:38, hp:112, range:4, spd:5, evo:'assets/dragons/evolution/water.png',      sheet:{url:'assets/dragons/water.png', frames:8, fps:9, act:1.3}},
  plant:   {name:'Rồng Cây',       el:'plant',   els:['plant'],          rar:'common', gold:10, atk:36, hp:118, range:3, spd:5, evo:'assets/dragons/evolution/plant.png',      sheet:{url:'assets/dragons/plant.png', frames:8, fps:6, act:1.45}},
  earth:   {name:'Rồng Đất',       el:'earth',   els:['earth'],          rar:'common', gold:11, atk:46, hp:126, range:2, spd:4, evo:'assets/dragons/evolution/earth.png',      sheet:{url:'assets/dragons/earth.png', frames:8, fps:5, act:1.55}},
  electric:{name:'Rồng Điện',      el:'electric',els:['electric'],       rar:'rare',   gold:16, atk:54, hp:100, range:5, spd:8, evo:'assets/dragons/evolution/electric.png',   sheet:{url:'assets/dragons/electric.png', frames:8, fps:9, act:1.05}},
  ice:     {name:'Rồng Băng',      el:'ice',     els:['ice'],            rar:'rare',   gold:16, atk:50, hp:110, range:4, spd:6, evo:'assets/dragons/evolution/ice.png',        sheet:{url:'assets/dragons/ice.png', frames:8, fps:6, act:1.5}},
  lava:    {name:'Rồng Dung Nham', el:'fire',    els:['fire','earth'],   rar:'rare',   gold:22, atk:62, hp:132, range:3, spd:5, evo:'assets/dragons/evolution/lava.png',       sheet:{url:'assets/dragons/lava.png', frames:8, fps:6, act:1.35}},
  steam:   {name:'Rồng Hơi Nước',  el:'water',   els:['fire','water'],   rar:'rare',   gold:22, atk:56, hp:120, range:4, spd:6, evo:'assets/dragons/evolution/steam.png',      sheet:{url:'assets/dragons/steam.png', frames:8, fps:7, act:1.35}},
  swamp:   {name:'Rồng Đầm Lầy',   el:'plant',   els:['water','plant'],  rar:'rare',   gold:22, atk:52, hp:138, range:3, spd:5, evo:'assets/dragons/evolution/swamp.png',      sheet:{url:'assets/dragons/swamp.png', frames:8, fps:5, act:1.7}},
  storm:   {name:'Rồng Bão',       el:'electric',els:['electric','water'],rar:'epic',  gold:34, atk:74, hp:130, range:5, spd:9, evo:'assets/dragons/evolution/storm.png',      sheet:{url:'assets/dragons/storm.png', frames:8, fps:8, act:1.15}},
  dark:    {name:'Hắc Long',       el:'dark',    els:['dark'],           rar:'epic',   gold:40, atk:86, hp:150, range:4, spd:7, evo:'assets/dragons/evolution/dark.png',       sheet:{url:'assets/dragons/dark.png', frames:8, fps:7, act:1.45}},
  light:   {name:'Thần Long',      el:'light',   els:['light'],          rar:'legendary',gold:70,atk:110,hp:180, range:5, spd:8, evo:'assets/dragons/evolution/light.png',      sheet:{url:'assets/dragons/light.png', frames:8, fps:7, act:1.6}},
};
const DR_SP_PRIORITY=['peach','sakura','candy','mint','lemon','berry','coral','cloud','rainbow','fire','water','plant','earth','electric','ice','lava','steam','swamp','storm','dark','light'];
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
  'fire+fire':['fire','fire','lava','coral'],
  'water+water':['water','water','steam','candy','cloud'],
  'plant+plant':['plant','plant','swamp','peach','mint','sakura'],
  'earth+earth':['earth','earth','lava'],
  'earth+fire':['lava','fire','earth'],
  'fire+water':['steam','fire','water'],
  'plant+water':['swamp','ice','water','plant'],
  'electric+water':['storm','water','electric'],
  'earth+electric':['electric','earth','storm'],   // key phải theo abc (earth<electric) — trước ghi 'electric+earth' nên KHÔNG bao giờ khớp
  'ice+plant':['ice','plant','swamp'],
  'dark+fire':['dark','lava','fire'],
  'dark+dark':['dark','dark','light','rainbow'],
  'electric+electric':['electric','electric','storm','lemon'],
  'ice+ice':['ice','ice','storm','berry'],
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
  return {gold:800, gems:20, food:60, level:1, xp:0,
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
    if(d&&d.sp&&DR_SPECIES[d.sp]) return {sp:d.sp, lv:d.lv||1, fed:d.fed||0, star:Math.min(5,Math.max(1,d.star||1)), hab:(typeof d.hab==='number'?d.hab:null), runes:Array.isArray(d.runes)?d.runes.filter(r=>r&&DR_RUNE[r.t]):[]};
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
    dragons:drState.dragons.map(d=>({sp:d.sp,lv:d.lv,fed:d.fed,star:drStar(d),hab:d.hab||null,runes:(d.runes||[]).slice()})),
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
function drFoodToNext(lv){ return Math.round(20*Math.pow(1.5,lv-1)); }
function drXpToNext(lvl){ return Math.round(100*Math.pow(1.3,lvl-1)); }
function drGoldPerTap(d){ return Math.round(DR_SPECIES[d.sp].gold * d.lv * (2+Math.random()*2) * drStarMult(d) * drForgeGoldMult() * drRebirthGoldMult() * (typeof drDecorMult==='function'?drDecorMult():1)); }
function drSellPrice(d){ return Math.round(DR_SPECIES[d.sp].gold * 25 * d.lv * DR_RAR[DR_SPECIES[d.sp].rar].mult); }
function drPower(d){ const s=DR_SPECIES[d.sp]; const rb=(typeof drRuneBonus==='function')?drRuneBonus(d):{atk:0,hp:0}; return Math.round((s.atk*1.6 + s.hp*0.4)*(1+0.18*(d.lv-1)) * drStarMult(d) * drForgePowerMult() * drRebirthPowerMult() * (1+rb.atk+rb.hp)); }
/* ---------- Lò rèn: bùa toàn đảo (mỗi cấp +5%) ---------- */
const DR_FORGE_MAX=10;
function drForgeGoldMult(){ return 1 + 0.05*(((drState&&drState.forge)?drState.forge.gold:0)||0); }
function drForgePowerMult(){ return 1 + 0.05*(((drState&&drState.forge)?drState.forge.power:0)||0); }
function drForgeCost(level){ return {gems:3+level*2, ore:5+level*4}; }   // Lv0→1:3💎/5⛏️ … Lv9→10:21💎/41⛏️
/* ---------- Hệ sao rồng: nâng sao -> tăng sinh vàng & sức mạnh ---------- */
const DR_STAR_MAX=25;
function drStar(d){ return Math.min(DR_STAR_MAX, Math.max(1, (d&&d.star)||1)); }
// Piecewise: giữ nguyên 1★=1.0 → 5★=2.0 (tương thích save cũ), rồi +0.10/sao tới 25★=4.0x
function drStarMult(d){ const s=drStar(d); return (1 + 0.25*(Math.min(s,5)-1)) + (s>5?0.10*(s-5):0); }
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
const DR_PITY_MAX=4;                                      // lai 4 lần liền ra rồng thường -> lần sau CHẮC CHẮN ra hiếm
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
  if(up) toast('⭐ Lên cấp '+drState.level+'! +5 💎');
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
  return (drState.qc&&drState.qc[q.type])||0;
}
function drQuestDone(q){ return drQuestVal(q)>=q.target; }
function drQuestClaimable(q){ return drQuestDone(q) && !(drState.qClaimed||[]).includes(q.id); }
function drQuestCount(){ return DR_QUESTS.filter(drQuestClaimable).length + drRotClaimCount(); }
/* ============ NHIỆM VỤ NGÀY / TUẦN LUÂN PHIÊN ============
   Chọn xoay vòng theo drDayNum()/tuần nên mỗi kỳ ra bộ nhiệm vụ khác nhau.
   Tiến độ đọc từ bộ đếm theo kỳ (drPeriodic) -> tự reset đầu ngày/tuần. */
const DR_DQ_POOL=[
  {id:'d_tap',  ic:'gold',  name:'Đãi vàng',    type:'tap',   target:15, r:{gold:400,gems:1}},
  {id:'d_feed', ic:'food',  name:'Bữa ăn ngon', type:'feed',  target:6,  r:{food:40,gems:1}},
  {id:'d_win',  ic:'arena', name:'Thử sức',     type:'win',   target:2,  r:{gold:500,gems:1}},
  {id:'d_breed',ic:'breed', name:'Ươm mầm',     type:'breed', target:1,  r:{gems:3}},
  {id:'d_tap2', ic:'gold',  name:'Thợ mỏ vàng', type:'tap',   target:30, r:{gold:800,gems:2}},
  {id:'d_win2', ic:'arena', name:'Đấu sĩ',      type:'win',   target:4,  r:{gold:900,food:20}},
];
const DR_WQ_POOL=[
  {id:'w_tap',  ic:'gold',  name:'Núi vàng',      type:'tap',   target:120, r:{gold:4000,gems:5}},
  {id:'w_win',  ic:'arena', name:'Bất bại',       type:'win',   target:20,  r:{gold:6000,gems:8}},
  {id:'w_feed', ic:'food',  name:'Nhà chăn rồng', type:'feed',  target:40,  r:{food:150,gems:5}},
  {id:'w_breed',ic:'breed', name:'Bậc thầy lai',  type:'breed', target:6,   r:{gems:15}},
  {id:'w_clear',ic:'rock',  name:'Mở mang bờ cõi',type:'clear', target:2,   r:{gold:5000,gems:6}},
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
  const app=document.createElement('div'); app.id='drApp'; app.className='dr-screen'; app.style.display='none';
  let deco=DR_DECO.map(d=>`<span class="dr-deco" style="left:${d[1]}%; top:${d[2]}%; font-size:${26*d[3]}px">${d[0]}</span>`).join('');
  let sparks=''; for(let i=0;i<10;i++) sparks+=`<span class="dr-sparkle" style="left:${Math.floor(Math.random()*100)}%; top:${58+Math.floor(Math.random()*38)}%; animation-delay:${(-Math.random()*3.5).toFixed(1)}s"></span>`;
  const dockList=[
    ['habitat','Khu đảo'],['farm','Nông trại'],['adventure','Phiêu lưu'],['tower','Tháp'],['boss','Boss'],['daily','Điểm danh'],['ach','Thành tựu'],['leaderboard','BXH'],['friends','Bạn bè'],['event','Sự kiện'],['runes','Cường hóa'],['ranked','Đấu hạng'],['decor','Trang trí'],['shop','Shop'],['quest','Nhiệm vụ'],['wheel','Vòng quay'],['forge','Lò rèn'],['rebirth','Chuyển Sinh'],['breed','Lai rồng'],['feed','Cho ăn'],['arena','Đấu'],['codex','Sách rồng'],['mail','Thư']
  ];
  // Gán mỗi icon vào 1 cụm góc; icon mới (nếu có) mặc định vào cụm 'br'
  const DR_DOCK_POS={ habitat:'bl',farm:'bl',feed:'bl',breed:'bl',decor:'bl',
    adventure:'lm',tower:'lm',boss:'lm',arena:'lm',ranked:'lm',
    shop:'br',quest:'br',wheel:'br',forge:'br',runes:'br',rebirth:'br',daily:'br',
    friends:'rm',leaderboard:'rm',event:'rm',codex:'rm',ach:'rm',mail:'rm' };
  const DR_POD_T={ bl:'Nuôi dưỡng', lm:'Chiến đấu', br:'Cửa hàng', rm:'Cộng đồng' };
  const podBuckets={bl:[],lm:[],br:[],rm:[]};
  dockList.forEach(d=>{ const pos=DR_DOCK_POS[d[0]]||'br', icon=d[0]==='ach'?'achievement':d[0];
    podBuckets[pos].push(`<button class="dr-dock-btn dr-dock-${icon}" data-act="${d[0]}" type="button" title="${d[1]}"><span class="di">${drFeatureIcon(icon)}</span><span class="dl">${d[1]}</span>${typeof drDockBadge==='function'?drDockBadge(d[0]):''}</button>`); });
  const dock=['bl','lm','br','rm'].map(pos=>`<div class="dr-pod dr-pod-${pos}"><span class="dr-pod-t">${DR_POD_T[pos]}</span><div class="dr-pod-grid">${podBuckets[pos].join('')}</div></div>`).join('');
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
    const bob=document.createElement('div'); bob.className=`dr-bob dr-star-${Math.min(st,5)} dr-stage-${evo.id}`;
    bob.style.animationDelay=(-Math.random()*2.6).toFixed(2)+'s';
    bob.style.setProperty('--acc',(DR_PAL[s.el]||{}).body||'#8fe0ff');
    const scale=(evo.scale+Math.max(0,(d.lv||1)-evo.minLv)*0.012).toFixed(3);
    bob.innerHTML=`<span class="dr-aura"></span>`
      +`<div class="dr-artwrap dr-facing" style="--dScale:${scale}">${drDragonArt(d)}</div>`
      +(st>1?`<span class="dr-starbadge" style="color:${drStarCol(st)}">★${st}</span>`:'')
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
  const feature=drModalFeature(title), meta=DR_FEATURE_UI[feature]||DR_FEATURE_UI.incubator;
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
  else if(act==='friends'){ if(typeof drShowFriends==='function') drShowFriends(); }
  else if(act==='event'){ if(typeof drShowEvent==='function') drShowEvent(); }
  else if(act==='runes'){ if(typeof drShowRunes==='function') drShowRunes(0); }
  else if(act==='ranked'){ if(typeof drShowRanked==='function') drShowRanked(); }
  else if(act==='tower'){ if(typeof drShowTower==='function') drShowTower(); }
  else if(act==='rebirth'){ if(typeof drShowRebirth==='function') drShowRebirth(); }
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
  if(drState.dragons.length>=drCapacity()){ toast(drCapacity()>=DR_MAX?'Đảo đã đủ '+DR_MAX+' rồng — bán bớt đã':'Hết ô nuôi — dọn 🪨 chướng ngại để mở thêm ô'); return; }
  const sp=DR_SPECIES[drState.breed.resultEl]?drState.breed.resultEl:'fire';
  drState.dragons.push({sp,lv:1,fed:0}); drState.breed=null; drQC('breed');
  drAddXp(30); drRenderHud(); drRenderDragons(); drRenderEgg(); drSave();
  drCloseModal(); toast('🎉 Nở ra '+DR_SPECIES[sp].name+'!');
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
function drShowQuests(){
  const dq=drDailyQuests().map(q=>drRotRow(q,'d')).join('');
  const wq=drWeeklyQuests().map(q=>drRotRow(q,'w')).join('');
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
  const body=`<div class="dr-note dr-note-with-icon">${drIcon('gift')}<span>Nhiệm vụ ngày/tuần đổi mới liên tục — làm để nhận thưởng.</span></div>
    <div class="dr-sub2">📅 Nhiệm vụ ngày <small class="dr-q-reset">(đổi mới mỗi ngày)</small></div><div class="dr-qlist">${dq}</div>
    <div class="dr-sub2">🗓️ Nhiệm vụ tuần <small class="dr-q-reset">(đổi mới mỗi tuần)</small></div><div class="dr-qlist">${wq}</div>
    <div class="dr-sub2">🏆 Mục tiêu nhập môn</div><div class="dr-qlist">${rows}</div>`;
  drModal('Nhiệm vụ', body, true);
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

/* ---------- Vàng offline (idle) — dùng GIỜ SERVER + cap để chống tua đồng hồ ---------- */
const DR_OFFLINE_CAP_H=8;              // tích luỹ tối đa 8 giờ
const DR_OFFLINE_K=0.6;               // hệ số vàng offline / phút cho mỗi rồng
function drOfflineRatePerMin(){        // tổng vàng/phút của cả đàn (theo cấp, sao, bùa vàng)
  const base=(drState.dragons||[]).reduce((sum,d)=>sum + DR_SPECIES[d.sp].gold * d.lv * drStarMult(d), 0);
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
  if(win) confetti();
  $('drFightAgain').onclick=drShowArena;
}

/* ---------- Sách rồng (đồ giám) ---------- */
function drShowCodex(){
  const owned=new Set(drState.dragons.map(d=>d.sp));
  const seen=new Set([...(drState.seen||[]), ...owned]);           // sưu tầm bền vững qua Chuyển Sinh
  const cells=DR_SP_ORDER.map(sp=>{ const s=DR_SPECIES[sp], has=seen.has(sp), have=owned.has(sp);
    const best=drState.dragons.filter(d=>d.sp===sp).sort((a,b)=>b.lv-a.lv)[0];
    const art = have?drDragonArt(best):(has?drDragonArt({sp,lv:1}):'<span class="dr-lock">?</span>');
    const label = have?`${esc(s.name)} · ${drEvolution(best.lv).name}`:(has?esc(s.name):'? ? ?');
    return `<button class="dr-codex-cell ${has?'':'locked'}" data-sp="${sp}">
      <span class="dr-codex-mini">${art}</span>
      <small>${label}</small></button>`; }).join('');
  const body=`<p class="dr-note">Đã sưu tầm <b>${seen.size}/${DR_SP_ORDER.length}</b> loài rồng. Lai để mở khoá loài mới!</p>
    <div class="dr-codex-grid">${cells}</div>`;
  drModal('Sách Rồng', body, true);
  $('drModal').querySelectorAll('[data-sp]').forEach(c=>c.onclick=()=>drCodexDetail(c.dataset.sp, seen.has(c.dataset.sp)));
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
  return s.gold * (d.lv||1) * drStarMult(d) * drForgeGoldMult() * drRebirthGoldMult() * match * DR_HAB_RATE_HR;
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
function drDockBadge(act){ const m={quest:'drQuestDot',mail:'drMailDot',habitat:'drHabDot',daily:'drDailyDot',boss:'drBossDot',ach:'drAchDot',farm:'drFarmDot',friends:'drFriendDot',event:'drEventDot',tower:'drTowerDot'}; return m[act]?`<span class="dr-dock-badge" id="${m[act]}" hidden></span>`:''; }
function drSetDot(id,n){ const el=$(id); if(el){ el.textContent=n; el.hidden=(n<=0); } }
function drUpdateFeatureDots(){
  if(!drState) return;
  drSetDot('drDailyDot', drCanDaily()?1:0);
  drSetDot('drFarmDot', (drState.farm||[]).filter(t=>drFarmReady(t)).length);
  drSetDot('drAchDot', DR_ACH.filter(a=>a.chk()&&!(drState.achClaimed||[]).includes(a.id)).length);
  drSetDot('drBossDot', drBossClaimable());
  if(typeof drCanTowerSweep==='function') drSetDot('drTowerDot', drCanTowerSweep()?1:0);
  if(typeof drRenderDecor==='function') drRenderDecor();
  if(typeof drWatchGifts==='function') drWatchGifts();
  if(typeof drUpdateEventDot==='function') drUpdateEventDot();
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
  {name:'Cổng Hư Không',  power:6000,  r:{gold:12000,gems:18}},
  {name:'Biển Sao',       power:8500,  r:{gold:16000,gems:22}},
  {name:'Lâu Đài Băng',   power:12000, r:{gold:22000,gems:28}},
  {name:'Ngai Rồng Cổ',   power:16000, r:{gold:30000,gems:35}},
  {name:'Tận Thế',        power:22000, r:{gold:45000,gems:50}},
];
function drFightStage(i){
  if(i!==(drState.adv||0)) return;
  const s=DR_ADV_STAGES[i];
  drCloseModal();
  drStartBattle(drTeamTop3(), drMakeEnemyTeam(s.power, i<2?2:3), {
    title:'⚔️ '+s.name,
    onWin:()=>{ drState.adv=Math.max(drState.adv||0,i+1); drReward(s.r); if(typeof confetti==='function') confetti(); drRenderHud(); drSave(); toast('🏆 Vượt "'+s.name+'"! +'+drRewardText(s.r)); },
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

/* ============ CHIẾN ĐẤU THEO LƯỢT (engine dùng chung: Phiêu lưu · Đấu trường) ============
   Mỗi rồng có máu/atk (theo loài×cấp×sao), năng lượng ⚡ (đủ 3 dùng kỹ năng hệ), khắc hệ (DR_ADV).
   Đội tối đa 3 con, đánh con đầu (front) tới khi ngã thì tới con sau. Địch AI tự đánh. */
let drBattle=null;
const DR_SKILL={
  fire:{name:'Phun Lửa 🔥',kind:'atk'}, electric:{name:'Sấm Sét ⚡',kind:'atk'}, dark:{name:'Hắc Ám 🌑',kind:'atk'},
  water:{name:'Sóng Thần 🌊',kind:'heal'}, ice:{name:'Băng Giá ❄️',kind:'heal'}, light:{name:'Thánh Quang ✨',kind:'heal'},
  plant:{name:'Hồi Sinh 🌿',kind:'heal'}, earth:{name:'Giáp Đá 🪨',kind:'tank'},
};
function drSkillOf(el){ return DR_SKILL[el]||{name:'Tuyệt Chiêu ✨',kind:'atk'}; }
function drElAdv(atkEl,defEl){ if(DR_ADV[atkEl]===defEl) return 1.5; if(DR_ADV[defEl]===atkEl) return 0.7; return 1; }
function drCombatStats(d){
  const s=DR_SPECIES[d.sp]||DR_SPECIES.fire;
  const mul=(1+0.18*((d.lv||1)-1))*(typeof drStarMult==='function'?drStarMult(d):1);
  const rb=(typeof drRuneBonus==='function')?drRuneBonus(d):{atk:0,hp:0,spd:0};
  const hp=Math.max(1,Math.round(s.hp*mul*(1+rb.hp)));
  return {sp:d.sp, lv:d.lv||1, el:s.el, name:s.name, hp, maxhp:hp, atk:Math.max(1,Math.round(s.atk*mul*(1+rb.atk))), spd:(s.spd||5)+rb.spd, en:0, shield:0};
}
function drTeamTop3(){ return drState.dragons.slice().sort((a,b)=>drPower(b)-drPower(a)).slice(0,3); }
function drMakeEnemyTeam(power,n){
  n=n||2; const per=power/n; const pool=['fire','water','plant','earth','electric','ice','dark'];
  const arr=[]; for(let k=0;k<n;k++){ const sp=pool[(k*3+1)%pool.length]; const lv=Math.max(1,Math.min(15,Math.round(per/55)));
    arr.push({sp, lv, star:1}); } return arr;
}
function drFront(team){ return team.find(c=>c.hp>0)||null; }
function drTeamDead(team){ return team.every(c=>c.hp<=0); }
function drDmg(atk,def,special){
  let dmg=atk.atk*(0.85+Math.random()*0.3);
  const mul=drElAdv(atk.el,def.el); dmg*=mul;
  let heal=0, shield=0;
  if(special){ const sk=drSkillOf(atk.el);
    if(sk.kind==='atk') dmg*=2.2;
    else if(sk.kind==='heal'){ dmg*=1.4; heal=Math.round(atk.maxhp*0.3); }
    else { dmg*=1.5; shield=1; } }
  return {dmg:Math.max(1,Math.round(dmg)), mul, heal, shield};
}
function drResolve(atk,def,special,who){
  const st=drBattle;
  if(special){ atk.en=0; } else { atk.en=Math.min(3,atk.en+1); }
  const r=drDmg(atk,def,special);
  let dmg=r.dmg; if(def.shield){ dmg=Math.round(dmg*0.5); def.shield=0; }
  def.hp-=dmg;
  if(r.heal) atk.hp=Math.min(atk.maxhp, atk.hp+r.heal);
  if(r.shield) atk.shield=1;
  const advTxt=r.mul>1?' 💥khắc hệ':(r.mul<1?' 🛡kháng':'');
  const act=special?('dùng '+drSkillOf(atk.el).name):'đánh';
  st.log.unshift(`${who}: <b>${atk.name}</b> ${act} → ${def.name} <b>-${dmg}</b>${advTxt}${r.heal?` (+${r.heal}♥)`:''}${r.shield?' 🛡':''}`);
  st.log=st.log.slice(0,6);
}
function drStartBattle(playerDragons, enemyDragons, opts){
  drBattle={ P:playerDragons.slice(0,3).map(drCombatStats), E:enemyDragons.slice(0,3).map(drCombatStats),
    log:['Trận đấu bắt đầu!'], turn:1, over:false, win:false, opts:opts||{} };
  drRenderBattle();
}
function drBattleAct(kind){
  const st=drBattle; if(!st||st.over) return;
  const pf=drFront(st.P), ef=drFront(st.E); if(!pf||!ef) return;
  const special=(kind==='special');
  if(special && pf.en<3){ toast('Chưa đủ ⚡ (cần 3)'); return; }
  const enemyFirst = ef.spd > pf.spd;                    // spd quyết ai ra đòn trước
  const doP=()=>{ const e=drFront(st.E); if(e&&pf.hp>0) drResolve(pf, e, special, 'Bạn'); };
  const doE=()=>{ const e=drFront(st.E), p=drFront(st.P); if(e&&p) drResolve(e, p, e.en>=3, 'Địch'); };
  if(enemyFirst){ doE(); if(drTeamDead(st.P)) return drEndBattle(false); doP(); if(drTeamDead(st.E)) return drEndBattle(true); }
  else { doP(); if(drTeamDead(st.E)) return drEndBattle(true); doE(); if(drTeamDead(st.P)) return drEndBattle(false); }
  st.turn++; drRenderBattle();
}
function drEndBattle(win){
  const st=drBattle; st.over=true; st.win=win;
  st.log.unshift(win?'🏆 <b>CHIẾN THẮNG!</b>':'💀 <b>Thất bại…</b>');
  if(win && st.opts.onWin) st.opts.onWin();
  else if(!win && st.opts.onLose) st.opts.onLose();
  drRenderBattle();
}
function drCombatIcon(c){ return `<span class="dr-cbt-ic">${drDragonArt({sp:c.sp,lv:c.lv})}</span>`; }
function drRenderBattle(){
  const st=drBattle; if(!st) return;
  const row=(c)=>{ const pct=Math.max(0,Math.round(c.hp/c.maxhp*100)); const front=(!c._dead&&c.hp>0);
    return `<div class="dr-cbt ${c.hp<=0?'dead':''}">${drCombatIcon(c)}
      <div class="dr-cbt-mid"><b>${esc(c.name)}</b><div class="dr-hpbar"><i style="width:${pct}%"></i></div>
        <small>${Math.max(0,c.hp)}/${c.maxhp} · ⚡${c.en}/3${c.shield?' 🛡':''}</small></div></div>`; };
  const pf=drFront(st.P);
  const skill=pf?drSkillOf(pf.el):null;
  const actions = st.over
    ? `<button class="dr-btn go block" id="drBtlDone">${st.win?'🎉 Nhận thưởng':'Thoát'}</button>`
    : `<div class="dr-btl-acts">
        <button class="dr-btn" id="drBtlHit">⚔️ Đánh thường</button>
        <button class="dr-btn alt" id="drBtlSkill" ${pf&&pf.en>=3?'':'disabled'}>${skill?skill.name:'Kỹ năng'} (⚡3)</button>
      </div>`;
  const body=`<div class="dr-btl-side"><div class="dr-btl-lbl">👹 Địch</div>${st.E.map(row).join('')}</div>
    <div class="dr-btl-log">${st.log.map(l=>`<div>${l}</div>`).join('')}</div>
    <div class="dr-btl-side"><div class="dr-btl-lbl">🐲 Đội bạn</div>${st.P.map(row).join('')}</div>
    ${actions}`;
  drModal((st.opts.title||'⚔️ Chiến đấu')+(st.over?'':` · Lượt ${st.turn}`), body, true);
  if(!st.over){ const h=$('drBtlHit'); if(h) h.onclick=()=>drBattleAct('normal');
    const s=$('drBtlSkill'); if(s) s.onclick=()=>drBattleAct('special'); }
  else { const d=$('drBtlDone'); if(d) d.onclick=()=>{ const cb=st.opts.onDone; drBattle=null; drCloseModal(); if(cb) cb(); }; }
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
  {id:'moon',  ic:'🌕', name:'Lễ Hội Trăng Rằm',  miles:[{pts:60,r:{gold:1200}},{pts:180,r:{gems:8}},{pts:360,r:{food:120}},{pts:600,r:{gems:20,dragon:'candy'}}]},
  {id:'flame', ic:'🔥', name:'Lễ Hội Lửa Thiêng', miles:[{pts:60,r:{gold:1500}},{pts:180,r:{gems:8}},{pts:360,r:{gems:15}},{pts:600,r:{gems:25,dragon:'lava'}}]},
  {id:'ocean', ic:'🌊', name:'Ngày Hội Đại Dương', miles:[{pts:60,r:{gold:1200}},{pts:180,r:{food:100}},{pts:360,r:{gems:12}},{pts:600,r:{gems:22,dragon:'steam'}}]},
  {id:'bloom', ic:'🌸', name:'Mùa Hoa Nở',        miles:[{pts:60,r:{gold:1000}},{pts:180,r:{gems:8}},{pts:360,r:{food:120}},{pts:600,r:{gems:20,dragon:'peach'}}]},
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
      drState.dragons.push({sp:m.r.dragon,lv:1,fed:0,star:1}); toast('🥚 Nhận rồng sự kiện: '+DR_SPECIES[m.r.dragon].name+'!');
    } else { drState.gems+=20; toast('Đảo đầy — quy đổi rồng thành +20 💎'); }
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
  const body=`<p class="dr-hab-intro">${def.ic} <b>${def.name}</b> — còn <b>${drEvtLeftTxt()}</b>. Chơi bất kỳ (nuôi/lai/đánh/thu vàng…) để tích <b>điểm sự kiện</b>. Mốc cuối tặng <b>rồng sự kiện</b>! 🐉</p>
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
function drRuneStr(r){ const d=DR_RUNE[r.t]; return d?`${d.ic} +${DR_RUNE_VAL[r.t][(r.tier||1)-1]}${d.unit} · T${r.tier||1}`:'?'; }
function drRuneBonus(d){ let atk=0,hp=0,spd=0; ((d&&d.runes)||[]).forEach(r=>{ const v=DR_RUNE_VAL[r.t]; if(!v)return; const x=v[(r.tier||1)-1]||0;
  if(r.t==='atk')atk+=x/100; else if(r.t==='hp')hp+=x/100; else spd+=x; }); return {atk,hp,spd}; }
function drCraftRune(){
  if(drState.gold<DR_RUNE_CRAFT){ toast('Thiếu vàng (cần '+fmtCoin(DR_RUNE_CRAFT)+' 🪙)'); return; }
  drState.gold-=DR_RUNE_CRAFT;
  const t=['atk','hp','spd'][Math.floor(Math.random()*3)];
  const roll=Math.random(), tier= roll<0.6?1:(roll<0.9?2:3);
  drState.runes=drState.runes||[]; drState.runes.push({t,tier});
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
const DR_RANKS=[{min:0,name:'Đồng',ic:'🥉'},{min:100,name:'Bạc',ic:'🥈'},{min:250,name:'Vàng',ic:'🥇'},{min:500,name:'Bạch Kim',ic:'💠'},{min:1000,name:'Kim Cương',ic:'💎'},{min:2000,name:'Cao Thủ',ic:'👑'}];
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
  const ladder=DR_RANKS.map(r=>`<span class="dr-rank-pip ${r.name===rank.name?'on':''}">${r.ic}</span>`).join('');
  const body=`<div class="dr-rank-hd">${rank.ic} <b>Hạng ${rank.name}</b> · ${fmtCoin(a.pts)} điểm</div>
    <div class="dr-rank-ladder">${ladder}</div>
    <div class="dr-feedbar big"><i style="width:${prog}%"></i><em>${nx?(fmtCoin(a.pts)+' / '+fmtCoin(nx.min)+' → '+nx.name):'Hạng cao nhất! 👑'}</em></div>
    <div class="dr-kv"><span>Thắng tuần này</span><b>${a.wins||0}</b></div>
    <button class="dr-btn go block" id="drRankFight">⚔️ Tìm đối thủ · đấu theo lượt</button>
    <button class="dr-btn alt block" id="drRankReward" ${a.claimed?'disabled':''}>${a.claimed?'✅ Đã nhận thưởng tuần':('🎁 Thưởng tuần (hạng '+rank.name+'): +'+wr+' 💎')}</button>
    <p class="dr-hab-intro">Đấu với <b>đội của người chơi khác</b> (không cần họ online). Thắng lên điểm hạng; cuối tuần nhận thưởng theo hạng. Reset thắng mỗi tuần.</p>`;
  const bd=drModal('🏅 Đấu Hạng', body, true);
  const f=$('drRankFight'); if(f) f.onclick=drRankedFight;
  const rb=$('drRankReward'); if(rb) rb.onclick=()=>{ drArenaSync(); if(drState.arena.claimed){ toast('Tuần này đã nhận rồi'); return; }
    drState.arena.claimed=true; drState.gems+=wr; drRenderHud(); drSave(); if(typeof confetti==='function') confetti(); drShowRanked(); toast('🎁 Nhận +'+wr+' 💎 thưởng hạng '+rank.name); };
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
    title:'🗼 Tháp · Tầng '+(floor+1),
    onWin:()=>{ const r=drTowerReward(floor); drTower().floor=floor+1; drReward(r);
      if(typeof drQC==='function') drQC('win');
      if(typeof drEventGain==='function') drEventGain(Math.round(power/40));
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
