/* =========================================================================
   SESSION — solo | host | guest
   ========================================================================= */
let mode='solo';        // 'solo' | 'host' | 'guest'
let myIdx=0;            // 0 solo/host; online guest được cấp ghế 1..3
let S=null;             // state hiện tại (host/solo: bản gốc; guest: bản sync)
let selected=new Set(); // card ids đang chọn
let sortByRank=true;
let botTimer=null, botToken=0;
let myName=(()=>{ try{ return localStorage.getItem('tienlen-name')||'Bạn'; }catch(_){ return 'Bạn'; } })();
let myClass=localStorage.getItem('tienlen-character')||'captain';
let gameType='tienlen';   // loại bài đang chọn ở sảnh (chỉ 'tienlen' chơi được)

const CHARACTER_CLASSES={
  captain:{name:'Đội trưởng',asset:'assets/characters/captain.webp',accent:'#26a269'},
  mage:{name:'Pháp sư',asset:'assets/characters/mage.webp',accent:'#f59e42'},
  guardian:{name:'Hộ vệ',asset:'assets/characters/guardian.webp',accent:'#4c9fe8'},
  trickster:{name:'Ảo thuật gia',asset:'assets/characters/trickster.webp',accent:'#e95d55'},
};
const BOT_INFO={
  1:{name:'An',emoji:'🐱',classId:'mage'},
  3:{name:'Cường',emoji:'🦊',classId:'trickster'},
};
// Sảnh chọn loại bài. Chỉ 'tienlen' đã chơi được; còn lại hiện thẻ "Sắp ra mắt".
// pips = vài lá minh hoạ vẽ thành hình quạt nhỏ trên thẻ.
const GAME_TYPES=[
  {id:'tienlen', name:'Tiến Lên Miền Nam', accent:'#26a269', ready:true,
   tag:'Đang mở', desc:'Đánh hết bài trước là Tới · đếm lá ăn xu.',
   pips:[{r:'3',s:'♠'},{r:'A',s:'♥',red:true},{r:'2',s:'♦',red:true}]},
  {id:'daorong', name:'Đảo Rồng', accent:'#2f8fce', ready:true, icon:'🐉',
   tag:'Mới', desc:'Nuôi rồng trên đảo · rồng sinh vàng, chạm để thu. Lưu theo tài khoản.'},
  {id:'maubinh', name:'Mậu Binh', accent:'#7a4fd0', ready:true, icon:'🀄',
   tag:'Mới', desc:'Binh Xập Xám 13 lá · xếp 3 chi, so từng chi ăn xu. Chơi với 3 máy.',
   pips:[{r:'A',s:'♠'},{r:'K',s:'♦',red:true},{r:'Q',s:'♣'}]},
  {id:'bacay', name:'Ba Cây', accent:'#e0663a', ready:false,
   tag:'Sắp ra mắt', desc:'Bài cào 3 lá · cộng nút, ai to hơn ăn.',
   pips:[{r:'9',s:'♣'},{r:'K',s:'♦',red:true},{r:'8',s:'♠'}]},
  {id:'xidach', name:'Xì Dách', accent:'#3f7fd0', ready:false,
   tag:'Sắp ra mắt', desc:'Blackjack kiểu Việt · rút gần 21 nút nhất.',
   pips:[{r:'A',s:'♠'},{r:'10',s:'♥',red:true}]},
];
// câu thoại vui của bot — chọn theo S.ver nên host & guest thấy giống nhau
const QUIPS=['Hihi chặn nè!','Đỡ được không? 😏','Bài đẹp ghê ta~','Ăn miếng này!','Tới công chuyện!',
  'Ai sợ chưa? 😆','Nhẹ nhàng thôi mà','Bài này khét đó','Đừng giận nha 🤭','Xin lỗi trước nè!'];
function quipFor(S){
  if(!S || S.lastPlayedBy<0 || S.lastPlayedBy===myIdx) return null;
  if(!isBotSeat(S.lastPlayedBy)) return null;
  if(S.ver%3!==0) return null;           // thỉnh thoảng mới nói cho đỡ ồn
  return QUIPS[S.ver%QUIPS.length];
}
const isBotSeat=p=>mode==='solo'&&p!==0;
const seatClass=p=>{
  if(S&&S.classes&&S.classes[p]&&CHARACTER_CLASSES[S.classes[p]]) return S.classes[p];
  if(p===myIdx) return myClass;
  if(mode==='solo') return ['captain','mage','guardian','trickster'][p];
  return 'guardian';
};
const seatAvatar=p=>{
  const id=seatClass(p), cls=CHARACTER_CLASSES[id]||CHARACTER_CLASSES.captain;
  return `<img class="avatar-img" src="${cls.asset}" alt="">`;
};

/* ---------- Firebase ---------- */
let db=null, auth=null, roomCode=null, roomRef=null;
let unsubState=null, unsubActions=null, unsubGuest=null, unsubLegacyGuest=null, unsubRoom=null, unsubPresence=null;
// Tài khoản + ví (cloud): nguồn sự thật của tiền ở users/<uid>
let profile=null, unsubProfile=null, settledGameId=null;
let gameBet=10, roomMaxPlayers=2, roomPlayers={}, soloGameCounter=0, throwHintShown=false;
let botCoins={1:1000,2:1000,3:1000};   // xu hiển thị của bot (không lưu cloud)
const roomSeatOrder=max=>max===2?[0,2]:(max===3?[0,1,3]:[0,1,2,3]);
const roomPlayer=(players,seat)=>players&&players[seat]?players[seat]:null;
function allocateRoomSeat(players,seatOrder,uid,data){
  const next=Array.isArray(players)?players.slice():Object.assign({},players||{});
  let seat=seatOrder.find(s=>s!==0&&roomPlayer(next,s)&&roomPlayer(next,s).uid===uid);
  if(seat===undefined) seat=seatOrder.find(s=>s!==0&&!roomPlayer(next,s));
  if(seat===undefined) return null;
  next[seat]=Object.assign({},data,{uid});
  return {players:next,seat};
}
function configReady(){ return FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.includes('DÁN'); }
function initFirebase(){
  if(db) return true;
  if(!configReady()) return false;
  try{
    firebase.initializeApp(FIREBASE_CONFIG);
    db=firebase.database();
    auth=firebase.auth();
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
    return true;
  }catch(e){ console.error(e); return false; }
}
function makeCode(){
  const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s=''; for(let i=0;i<5;i++) s+=A[Math.floor(Math.random()*A.length)];
  return s;
}
function detachAll(){
  if(unsubState){unsubState.off(); unsubState=null;}
  if(unsubActions){unsubActions.off(); unsubActions=null;}
  if(unsubGuest){unsubGuest.off(); unsubGuest=null;}
  if(unsubLegacyGuest){unsubLegacyGuest.off(); unsubLegacyGuest=null;}
  if(unsubRoom){unsubRoom.off(); unsubRoom=null;}
  if(unsubPresence){unsubPresence.off(); unsubPresence=null;}
  if(typeof unsubChat!=='undefined'&&unsubChat){unsubChat.off(); unsubChat=null;}
  if(typeof unsubThrows!=='undefined'&&unsubThrows){unsubThrows.off(); unsubThrows=null;}
}
function pushState(){
  if(mode==='host'&&roomRef) roomRef.child('state').set(JSON.stringify(S));
}

/* =========================================================================
   ĐĂNG NHẬP + VÍ XU (Firebase Auth email/mật khẩu · users/<uid>)
   ========================================================================= */
function newGameId(){
  return (mode==='solo'?'solo-'+(++soloGameCounter):(roomCode||'r'))+'-'+Date.now();
}
// Tạo hồ sơ lần đầu (idempotent — không reset xu tài khoản đã có)
async function ensureProfile(user,name){
  const uref=db.ref('users/'+user.uid);
  await uref.transaction(u=>{
    if(u!==null) return u;
    return {
      name:(name||'').trim() || (user.email||'').split('@')[0] || 'Bạn',
      email:user.email||'',
      coins:1000000, wins:0, games:0,   // tặng 1 triệu xu khi tạo tài khoản
      elo:1000,                          // điểm trình độ khởi điểm
      createdAt:Date.now(), lastSettled:null
    };
  });
  // Tên người dùng gõ khi tạo tài khoản luôn được ghi (thắng mọi race với onAuthStateChanged)
  const nm=(name||'').trim();
  if(nm) await uref.child('name').set(nm);
}
function attachProfile(uid){
  detachProfile();
  unsubProfile=db.ref('users/'+uid);
  unsubProfile.on('value',snap=>{
    profile=snap.val();
    if(profile){
      if(profile.name) myName=profile.name;
      renderCoinBar();
      if(mode!=='solo'&&roomRef) roomRef.child('players/'+myIdx).update({coins:profile.coins||0,name:myName});
      // Danh hiệu Mậu Binh đang đeo (nếu có) -> hiện kèm tên trên BXH
      let titleStr='';
      if(profile.mbTitle && typeof MB_ACHS!=='undefined'){ const a=MB_ACHS.find(x=>x.id===profile.mbTitle);
        if(a&&a.title && profile.achievements&&profile.achievements[profile.mbTitle]) titleStr=a.icon+' '+a.title; }
      // Gương thông tin CÔNG KHAI cho BXH bài (node RIÊNG 'cardrank' — KHÔNG đụng 'leaderboard' của Đảo Rồng)
      db.ref('cardrank/'+uid).set({name:profile.name||'Bạn', elo:profile.elo||1000,
        coins:profile.coins||0, wins:profile.wins||0, games:profile.games||0, title:titleStr}).catch(()=>{});
    }
  });
}
function detachProfile(){ if(unsubProfile){ unsubProfile.off(); unsubProfile=null; } }
// Cộng/trừ xu vào ví CỦA MÌNH, đúng 1 lần cho mỗi ván (chốt bằng lastSettled)
// meta (tuỳ chọn): {game:'tienlen'|'maubinh'} — dùng để cộng ELO + tiến độ nhiệm vụ ngày.
function addCoins(delta,gameId,isWinner,meta){
  if(!auth||!auth.currentUser||!db) return;
  const email=auth.currentUser.email||'';
  db.ref('users/'+auth.currentUser.uid).transaction(u=>{
    if(u===null){                                // hồ sơ chưa có (hiếm) -> tạo kèm tiền thưởng gốc để không mất xu
      u={name:email.split('@')[0]||'Bạn', email, coins:1000000, wins:0, games:0, elo:1000,
        createdAt:Date.now(), lastSettled:null};
    }
    if(u.lastSettled===gameId) return;           // ván này đã trả tiền -> bỏ qua
    u.coins=(u.coins||0)+delta;
    u.games=(u.games||0)+1;
    if(isWinner) u.wins=(u.wins||0)+1;
    u.lastSettled=gameId;
    if(meta&&meta.game){                          // ván bài thật -> cập nhật ELO + nhiệm vụ + chuỗi thắng
      u.elo=eloAfter(u.elo||1000, !!isWinner, meta.bet);
      u.quests=questTick(u.quests, !!isWinner, meta.game);
      if(isWinner){ u.streak=(u.streak||0)+1;
        u.coins += Math.min(Math.max(u.streak-1,0),6)*30;   // chuỗi thắng: thưởng tăng dần (x2→+30 … x7+→+180)
        u.bestStreak=Math.max(u.bestStreak||0, u.streak);
      } else u.streak=0;
    }
    return u;
  }).catch(e=>{ console.error('addCoins',e);
    toast('⚠️ Chưa lưu được xu — kiểm tra mạng hoặc Rules Firebase (mục users)'); });
}
/* ---------- ELO ---------- */
// Cược càng cao → ăn/thua ELO càng nhiều (K co giãn 16→56 theo mệnh giá bàn).
function eloK(bet){ bet=Math.max(0, Math.floor(bet||0)); return Math.round(16 + Math.min(bet,60)/60*40); }
// Đấu với "bàn" mốc 1000 (bot/đối thủ trung bình). Thắng +, thua −, co giãn theo chênh lệch & mức cược.
function eloAfter(cur,won,bet){
  const K=eloK(bet), base=1000, E=1/(1+Math.pow(10,(base-cur)/400));
  return Math.max(100, Math.round(cur + K*((won?1:0)-E)));
}
// Cập nhật ELO cho 1 "tài khoản máy" DÙNG CHUNG toàn hệ thống (node cardbots).
// Máy binh tối ưu nên leo hạng nhanh — thành cột mốc trên BXH để người chơi vượt.
function updateBotElo(key,name,emoji,won,bet){
  if(!db||!auth||!auth.currentUser) return;
  db.ref('cardbots/'+key).transaction(b=>{
    b=b||{elo:1000,wins:0,games:0};
    b.name=name; b.emoji=emoji||''; b.bot=true;
    b.games=(b.games||0)+1;
    if(won) b.wins=(b.wins||0)+1;
    b.elo=eloAfter(b.elo||1000, !!won, bet);
    return b;
  }).catch(()=>{});
}
// Hạng đấu theo ELO — mốc mục tiêu để leo, mỗi hạng 1 màu + huy hiệu.
const ELO_TIERS=[
  {min:1700, name:'Cao Thủ',   icon:'👑', color:'#e05a8a'},
  {min:1500, name:'Kim Cương', icon:'💠', color:'#4c9fe8'},
  {min:1350, name:'Bạch Kim',  icon:'💎', color:'#3fc9c0'},
  {min:1200, name:'Vàng',      icon:'🥇', color:'#e0a52a'},
  {min:1050, name:'Bạc',       icon:'🥈', color:'#9aa7b3'},
  {min:900,  name:'Đồng',      icon:'🥉', color:'#c8823c'},
  {min:0,    name:'Tân Thủ',   icon:'🌱', color:'#6faf6f'},
];
function eloTier(elo){ elo=(elo==null?1000:elo); return ELO_TIERS.find(t=>elo>=t.min); }
function eloNext(elo){ elo=(elo==null?1000:elo); const above=ELO_TIERS.filter(t=>t.min>elo); return above.length?above[above.length-1]:null; }
/* ---------- Mùa giải (theo tháng, tự chạy — không cần server) ---------- */
function currentSeason(){ return new Date().toISOString().slice(0,7); }    // 'YYYY-MM'
function seasonDaysLeft(){ const n=new Date(); const end=Date.UTC(n.getUTCFullYear(), n.getUTCMonth()+1, 1); return Math.max(1, Math.ceil((end-Date.now())/86400000)); }
// Thưởng cuối mùa theo HẠNG đạt được (hạng cao = ít người = thưởng lớn ~ "thưởng top").
const SEASON_REWARDS={'Cao Thủ':50000,'Kim Cương':20000,'Bạch Kim':10000,'Vàng':5000,'Bạc':2500,'Đồng':1000,'Tân Thủ':0};
function seasonRewardFor(elo){ return SEASON_REWARDS[eloTier(elo).name]||0; }
// Kiểm tra sang mùa mới: phát thưởng theo hạng mùa cũ + reset MỀM ELO (kéo về 1000, giữ 40% chênh lệch).
function processSeason(){
  const cs=currentSeason();
  if(!auth||!auth.currentUser||!db||!profile) return Promise.resolve(null);
  if(profile.seasonId===cs) return Promise.resolve(null);
  const first=!profile.seasonId;                       // lần đầu có mùa -> chỉ đóng dấu, không thưởng/không reset
  return db.ref('users/'+auth.currentUser.uid).transaction(u=>{
    if(!u) return u;
    if(u.seasonId===cs) return;                        // đã xử lý (chống trùng)
    if(!u.seasonId){ u.seasonId=cs; return u; }        // lần đầu
    const oldElo=u.elo||1000;
    u.coins=(u.coins||0)+seasonRewardFor(oldElo);
    u.elo=Math.round(1000+(oldElo-1000)*0.4);
    u.lastSeasonElo=oldElo; u.lastSeasonReward=seasonRewardFor(oldElo); u.lastSeason=u.seasonId;
    u.seasonId=cs; return u;
  }).then(r=>{ const v=r.snapshot&&r.snapshot.val(); if(v) profile=v;
    if(first||!r.committed||!v) return null;
    return {reward:v.lastSeasonReward||0, oldElo:v.lastSeasonElo||1000, newElo:v.elo||1000, season:v.lastSeason||''};
  }).catch(()=>null);
}
/* ---------- Nhiệm vụ ngày ---------- */
const QUESTS=[
  {id:'play', ic:'🎴', name:'Chơi 3 ván bài',        target:3, reward:300, prog:q=>q.play||0},
  {id:'win',  ic:'🏆', name:'Thắng 1 ván',           target:1, reward:500, prog:q=>q.win||0},
  {id:'mb',   ic:'🀄', name:'Chơi 1 ván Mậu Binh',   target:1, reward:200, prog:q=>q.mb||0},
];
function todayKey(){ return new Date().toISOString().slice(0,10); }
function questFresh(){ return {day:todayKey(), play:0, win:0, mb:0, claimed:{}}; }
// Cộng tiến độ 1 ván vào object quests (tự reset khi sang ngày mới). Trả object mới.
function questTick(q, won, game){
  if(!q || q.day!==todayKey()) q=questFresh();
  q.play=(q.play||0)+1;
  if(won) q.win=(q.win||0)+1;
  if(game==='maubinh') q.mb=(q.mb||0)+1;
  if(!q.claimed) q.claimed={};
  return q;
}
// Nhận thưởng 1 nhiệm vụ (giao dịch riêng, chống nhận trùng bằng cờ claimed).
function claimQuest(qid){
  const def=QUESTS.find(x=>x.id===qid); if(!def||!auth||!auth.currentUser||!db) return Promise.resolve({ok:false});
  return db.ref('users/'+auth.currentUser.uid).transaction(u=>{
    if(!u) return u;
    const q=(u.quests&&u.quests.day===todayKey())?u.quests:questFresh();
    if(!q.claimed) q.claimed={};
    if(q.claimed[qid]) return;                    // đã nhận
    if(def.prog(q) < def.target) return;          // chưa đủ
    q.claimed[qid]=true; u.quests=q;
    u.coins=(u.coins||0)+def.reward;
    return u;
  }).then(r=>({ok:r.committed, val:r.snapshot&&r.snapshot.val()})).catch(e=>{ console.error('claimQuest',e); return {ok:false}; });
}
/* ---------- Quà đăng nhập (điểm danh 7 ngày) ---------- */
const DAILY_REWARDS=[500,800,1200,2000,3000,5000,10000];   // ngày 1→7, sau đó lặp ở mức ngày 7
function _ydayKey(){ const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); }
function dailyClaimable(){ return !!(profile && profile.dailyDay!==todayKey()); }
// Ngày điểm danh sắp tới (1..7) để hiện thưởng trước khi nhận
function dailyNextIndex(){
  if(!profile) return 1;
  if(profile.dailyDay===todayKey()) return Math.min(profile.dailyStreak||1,7);
  return Math.min((profile.dailyDay===_ydayKey()?(profile.dailyStreak||0):0)+1,7);
}
function claimDaily(){
  if(!auth||!auth.currentUser||!db) return Promise.resolve({ok:false});
  const today=todayKey(), yday=_ydayKey();
  return db.ref('users/'+auth.currentUser.uid).transaction(u=>{
    if(!u) return u;
    if(u.dailyDay===today) return;                 // đã điểm danh hôm nay
    const streak = (u.dailyDay===yday) ? Math.min((u.dailyStreak||0)+1,7) : 1;
    const reward = DAILY_REWARDS[Math.min(streak,7)-1];
    u.coins=(u.coins||0)+reward; u.dailyDay=today; u.dailyStreak=streak; u.dailyLast=reward;
    return u;
  }).then(r=>({ok:r.committed, val:r.snapshot&&r.snapshot.val(),
                reward:(r.snapshot&&r.snapshot.val()||{}).dailyLast})).catch(()=>({ok:false}));
}
// Áp kết quả tiền của ván vào ví mình (host=seat0, khách online=ghế được cấp); bot không lưu
function settleMyWallet(S){
  if(!S||!S.settle) return;
  if(settledGameId===S.settle.gameId) return;
  settledGameId=S.settle.gameId;
  const row=(S.settle.rows||[]).find(r=>r.seat===myIdx);
  if(!row) return;
  addCoins(row.delta, S.settle.gameId, S.settle.winner===myIdx, {game:'tienlen', bet:S.bet});
}
function fmtCoin(n){ n=Number(n); if(!isFinite(n)) return '--'; return n.toLocaleString('vi-VN'); }
function renderCoinBar(){
  // Ví xu dùng CHUNG cho các game bài (Tiến Lên, Mậu Binh) — cùng users/<uid>/coins.
  // Cập nhật cả ô xu riêng của Mậu Binh để luôn khớp số dư thật, cho thấy tiền là một.
  const mb=$('mbCoin'); if(mb) mb.textContent=(profile&&profile.coins!=null)?fmtCoin(profile.coins):'--';
  const bar=$('coinBar'); if(!bar) return;
  // Đảo Rồng & Mậu Binh có ví xu riêng ngay trên HUD của chúng -> KHÔNG hiện ví xu chung
  // ở góc màn (nếu không sẽ đè lên đảo/bàn, gây 2 số 🪙 trùng lặp khó hiểu).
  const inOtherGame=(typeof drActive!=='undefined'&&drActive)||(typeof mbActive!=='undefined'&&mbActive);
  if(profile && !inOtherGame){ $('coinVal').textContent=(profile.coins!=null?fmtCoin(profile.coins):'--'); bar.style.display='inline-flex'; }
  else bar.style.display='none';
}
/* ---------- Admin: cộng/đặt xu cho mọi tài khoản (rules chặn phía server) ---------- */
function isAdmin(){
  return !!(profile && profile.email && typeof ADMIN_EMAILS!=='undefined'
    && ADMIN_EMAILS.some(e=>String(e).toLowerCase()===String(profile.email).toLowerCase()));
}
function adminLoadUsers(){
  return db.ref('users').once('value').then(s=>{
    const v=s.val()||{};
    return Object.keys(v).map(uid=>({uid, name:v[uid].name, email:v[uid].email, coins:v[uid].coins||0}));
  });
}
function adminGrant(uid,amount){           // cộng/trừ xu (transaction, an toàn tranh chấp)
  return db.ref('users/'+uid+'/coins').transaction(c=>(c||0)+amount);
}
function adminSet(uid,amount){             // đặt số xu chính xác
  return db.ref('users/'+uid+'/coins').set(amount);
}
function syncName(n){
  n=(n||'').trim(); if(!n) return;
  myName=n;
  try{ localStorage.setItem('tienlen-name',n); }catch(_){}   // nhớ tên cho phiên sau (kể cả offline)
  if(auth&&auth.currentUser&&db&&profile&&profile.name!==n)
    db.ref('users/'+auth.currentUser.uid+'/name').set(n);
}
// Lưu tên hiển thị vào tài khoản (màn "Chỉnh sửa tài khoản") — trả kết quả để UI báo thành công/lỗi
async function saveProfileName(n){
  n=(n||'').trim();
  if(!n) return {ok:false,err:'Tên không được để trống'};
  if(n.length>12) return {ok:false,err:'Tên tối đa 12 ký tự'};
  myName=n;
  try{ localStorage.setItem('tienlen-name',n); }catch(_){}
  if(!(auth&&auth.currentUser&&db)) return {ok:false,err:'Chưa đăng nhập'};
  try{
    await db.ref('users/'+auth.currentUser.uid+'/name').set(n);
    return {ok:true};
  }catch(e){ console.error('saveProfileName',e); return {ok:false,err:'Không lưu được — kiểm tra mạng / Rules Firebase'}; }
}
function throwHint(){
  if(throwHintShown) return; throwHintShown=true;
  setTimeout(()=>{ if(S&&S.status==='playing') toast('Chạm đối thủ để ném đồ trêu 😜'); },2600);
}
/* ---------- Màn đăng nhập ---------- */
function showAuthLoading(){
  let resume=null; try{ resume=localStorage.getItem('lastGame'); }catch(_){}
  const ov=$('overlay');
  if(resume==='daorong'){                               // reload khi đang ở Đảo Rồng -> màn chờ chủ đề đảo, không lộ giao diện Tiến Lên
    ov.classList.add('dr-boot');
    $('panel').innerHTML=`
      <div class="dr-boot-emblem">🐉</div>
      <div class="logo">Đảo Rồng</div>
      <h1 style="font-size:24px">Đang vào đảo…</h1>
      <div class="spinner"></div>
      <p class="sub">Đang tải hòn đảo của bạn</p>`;
  }else{
    ov.classList.remove('dr-boot');
    $('panel').innerHTML=`
      <div class="logo">Tiến Lên</div>
      <h1 style="font-size:24px">Đang tải…</h1>
      <div class="spinner"></div>
      <p class="sub">Đang kiểm tra đăng nhập</p>`;
  }
  ov.style.display='flex';
}
function showLogin(){
  $('overlay').classList.remove('dr-boot');
  $('panel').innerHTML=`
    <div class="menu-fan" aria-hidden="true">
      <div class="card"><span class="r">3</span><span class="big">♠</span><span class="s">♠</span></div>
      <div class="card red"><span class="r">A</span><span class="big">♥</span><span class="s">♥</span></div>
      <div class="card red"><span class="r">2</span><span class="big">♦</span><span class="s">♦</span></div>
    </div>
    <div class="logo">Miền Nam</div>
    <h1>Tiến Lên</h1>
    <p class="sub">Đăng nhập để chơi và giữ ví xu của bạn.</p>
    <input class="field" id="inEmail" type="email" inputmode="email" autocomplete="email" placeholder="Email">
    <input class="field pw" id="inPass" type="password" autocomplete="current-password" placeholder="Mật khẩu (≥ 6 ký tự)">
    <div class="menu-gap"><button class="btn block" id="btnLogin">Đăng nhập</button></div>
    <button class="linkish" id="toSignup">Chưa có tài khoản? Đăng ký</button>
    <p class="field-err" id="authMsg"></p>
    ${navigator.onLine?'':'<p class="field-err">Cần kết nối mạng để đăng nhập.</p>'}`;
  $('overlay').style.display='flex';
  $('btnLogin').onclick=()=>signIn($('inEmail').value,$('inPass').value);
  $('inPass').onkeydown=e=>{ if(e.key==='Enter') $('btnLogin').click(); };
  $('toSignup').onclick=showSignup;
}
function showSignup(){
  $('panel').innerHTML=`
    <div class="logo">Tài khoản mới</div>
    <h1 style="font-size:26px">Đăng ký</h1>
    <p class="sub">Được tặng <b class="hl">1.000.000 🪙</b> khi tạo tài khoản.</p>
    <input class="field" id="inName" maxlength="12" placeholder="Tên hiển thị">
    <input class="field" id="inEmail" type="email" inputmode="email" autocomplete="email" placeholder="Email">
    <input class="field pw" id="inPass" type="password" autocomplete="new-password" placeholder="Mật khẩu (≥ 6 ký tự)">
    <div class="menu-gap"><button class="btn block" id="btnSignup">Tạo tài khoản</button></div>
    <button class="linkish" id="toLogin">← Đã có tài khoản? Đăng nhập</button>
    <p class="field-err" id="authMsg"></p>`;
  $('overlay').style.display='flex';
  $('btnSignup').onclick=()=>signUp($('inName').value,$('inEmail').value,$('inPass').value);
  $('inPass').onkeydown=e=>{ if(e.key==='Enter') $('btnSignup').click(); };
  $('toLogin').onclick=showLogin;
}
function authErrText(code){
  return ({
    'auth/invalid-email':'Email không hợp lệ',
    'auth/missing-password':'Chưa nhập mật khẩu',
    'auth/weak-password':'Mật khẩu quá yếu (tối thiểu 6 ký tự)',
    'auth/email-already-in-use':'Email đã được đăng ký',
    'auth/wrong-password':'Sai mật khẩu',
    'auth/invalid-credential':'Email hoặc mật khẩu không đúng',
    'auth/user-not-found':'Không tìm thấy tài khoản',
    'auth/network-request-failed':'Mất kết nối mạng — thử lại',
    'auth/too-many-requests':'Thử quá nhiều lần — chờ chút rồi thử lại',
    'auth/operation-not-allowed':'Chưa bật Email/Password: Firebase Console → Authentication → Sign-in method → bật Email/Password',
    'auth/configuration-not-found':'Chưa bật Authentication trong Firebase Console (Authentication → Get started)',
    'auth/admin-restricted-operation':'Đăng ký đang bị chặn — kiểm tra cài đặt Authentication',
  })[code] || ('Có lỗi'+(code?' ('+code+')':'')+' — thử lại');
}
function authError(e){ const m=$('authMsg'); if(m) m.textContent=authErrText(e&&e.code); }
function setAuthBusy(b){ const el=$('btnLogin')||$('btnSignup'); if(el) el.disabled=b; }
async function signIn(email,pass){
  email=(email||'').trim();
  if(!email){ authError({code:'auth/invalid-email'}); return; }
  if(!pass){ authError({code:'auth/missing-password'}); return; }
  setAuthBusy(true);
  try{ await auth.signInWithEmailAndPassword(email,pass); }
  catch(e){ authError(e); setAuthBusy(false); }
}
async function signUp(name,email,pass){
  email=(email||'').trim(); name=(name||'').trim();
  if(!email){ authError({code:'auth/invalid-email'}); return; }
  if((pass||'').length<6){ authError({code:'auth/weak-password'}); return; }
  setAuthBusy(true);
  try{
    const cred=await auth.createUserWithEmailAndPassword(email,pass);
    await ensureProfile(cred.user,name);
    if(name) await db.ref('users/'+cred.user.uid+'/name').set(name);  // tên gõ tay thắng mọi race
  }catch(e){ authError(e); setAuthBusy(false); }
}
async function signOut(){
  cleanupRoom(); detachProfile(); profile=null; renderCoinBar();
  try{ await auth.signOut(); }catch(e){ console.error(e); }
}
// Boot: gate mọi thứ sau đăng nhập (kể cả solo)
function boot(){
  if(!configReady()||!initFirebase()){ showFirebaseSetup(); return; }
  showAuthLoading();
  auth.onAuthStateChanged(async user=>{
    if(user){
      try{
        await ensureProfile(user);
        const snap=await db.ref('users/'+user.uid).get();   // nạp 1 lần để menu có sẵn tên/xu
        profile=snap.val(); if(profile&&profile.name) myName=profile.name;
      }catch(e){ console.error(e);
        // Không đọc/ghi được users/<uid> gần như luôn là do Rules Firebase chưa mở mục "users"
        toast('⚠️ Không lưu được tên/xu — kiểm tra Rules Firebase (mục "users"). Xem HUONG-DAN.txt mục 0c'); }
      attachProfile(user.uid);
      let resume=null; try{ resume=localStorage.getItem('lastGame'); }catch(_){}
      if(resume==='daorong' && typeof showDragonIsland==='function') showDragonIsland();  // reload -> vào lại đảo
      else{
        showGameSelect();
        // Sang mùa mới -> phát thưởng cuối mùa + reset mềm ELO, rồi hiện bảng "Mùa mới"
        try{ processSeason().then(s=>{ if(s && typeof showSeasonReward==='function') showSeasonReward(s); }); }catch(_){}
      }
    }else{
      if(typeof drActive!=='undefined'&&drActive) leaveDragonIsland(true);   // đang ở đảo -> thoát
      if(typeof mbActive!=='undefined'&&mbActive) leaveMauBinh(true);        // đang binh -> thoát
      if(mode!=='solo'||S){ cleanupRoom(); render(); }   // đăng xuất giữa chừng -> dọn phòng
      detachProfile(); profile=null; renderCoinBar();
      showLogin();
    }
  });
}

/* ---------- HOST ---------- */
async function createRoom(name,maxPlayers){
  if(!initFirebase()){ showFirebaseSetup(); return; }
  myName=name||myName||'Chủ phòng'; mode='host'; myIdx=0;
  S=null; selected.clear();
  roomMaxPlayers=[2,3,4].includes(+maxPlayers)?+maxPlayers:2;
  const hostPlayer={uid:auth.currentUser.uid,name:myName,classId:myClass,coins:(profile?profile.coins||0:0),online:true,joined:Date.now()};
  roomPlayers={0:hostPlayer};
  roomCode=makeCode();
  roomRef=db.ref('rooms/'+roomCode);
  try{
    await roomRef.set({created:Date.now(), protocol:2, maxPlayers:roomMaxPlayers, hostName:myName, hostClass:myClass,
      hostOnline:true, bet:gameBet, players:roomPlayers, state:null});
    // Trên điện thoại, đổi app để gửi mã có thể ngắt socket vài giây. Giữ phòng lại và chỉ đánh dấu offline.
    const hostRoom=roomRef;
    unsubPresence=db.ref('.info/connected');
    unsubPresence.on('value',snap=>{
      if(!snap.val()||mode!=='host'||roomRef!==hostRoom) return;
      hostRoom.update({hostOnline:true,hostDisconnectedAt:null,'players/0/online':true,'players/0/disconnectedAt':null}).catch(()=>{});
      hostRoom.onDisconnect().update({hostOnline:false,hostDisconnectedAt:firebase.database.ServerValue.TIMESTAMP,
        'players/0/online':false,'players/0/disconnectedAt':firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});
    });
  }catch(e){
    toast('Không kết nối được Firebase — kiểm tra config & rules'); console.error(e);
    mode='solo'; return;
  }
  showWaiting();
  listenChat(); listenThrows(); updateChatUI();
  // chờ đủ số người thật đã chọn, không tự thêm bot
  unsubGuest=roomRef.child('players');
  unsubGuest.on('value',snap=>{
    roomPlayers=snap.val()||{};
    const seats=roomSeatOrder(roomMaxPlayers);
    const ready=seats.filter(seat=>{ const p=roomPlayer(roomPlayers,seat); return p&&p.name&&p.online!==false; });
    if(!S){
      showWaiting(false,roomPlayers,roomMaxPlayers);
      if(ready.length===roomMaxPlayers) hostStartGame(roomPlayers);
      return;
    }
    seats.forEach(seat=>{
      const p=roomPlayer(roomPlayers,seat); if(!p) return;
      S.names[seat]=p.name||S.names[seat];
      S.classes[seat]=CHARACTER_CLASSES[p.classId]?p.classId:S.classes[seat];
      if(typeof p.coins==='number') S.coins[seat]=p.coins;
    });
    pushState();
  });
  // Tương thích app cache cũ: bản trước ghi khách 2 người ở rooms/<code>/guest.
  // Chuyển khách đó sang players/2 để host mới vẫn tự chia bài, không quay chờ mãi.
  if(roomMaxPlayers===2){
    unsubLegacyGuest=roomRef.child('guest');
    unsubLegacyGuest.on('value',snap=>{
      const g=snap.val();
      if(!g||!g.name||mode!=='host') return;
      const legacyUid='legacy-'+String(g.joined||'guest');
      const mapped={uid:legacyUid,name:String(g.name).slice(0,12),
        classId:CHARACTER_CLASSES[g.classId]?g.classId:'guardian',
        coins:typeof g.coins==='number'?g.coins:0, online:g.online!==false,
        joined:g.joined||Date.now(), legacy:true};
      roomRef.child('players/2').transaction(current=>{
        if(current&&current.uid&&current.uid!==legacyUid) return current;
        return mapped;
      }).catch(e=>{ console.error(e); toast('Không đồng bộ được người chơi thứ 2'); });
    });
  }
}
function hostStartGame(players,openingSeat){
  players=players||roomPlayers||{};
  const activeSeats=roomSeatOrder(roomMaxPlayers);
  const names=['Ghế trống','Ghế trống','Ghế trống','Ghế trống'];
  const classes=['captain','mage','guardian','trickster'];
  const coins=[0,0,0,0];
  activeSeats.forEach(seat=>{
    const p=roomPlayer(players,seat)||{};
    names[seat]=p.name||(seat===0?myName:'Người chơi');
    classes[seat]=CHARACTER_CLASSES[p.classId]?p.classId:(seat===0?myClass:'guardian');
    coins[seat]=p.coins||0;
  });
  S=freshState(names,{bet:gameBet, gameId:newGameId(), classes, activeSeats, openingSeat});
  S.coins=coins;
  settledGameId=null;
  selected.clear();
  hideOverlay(); render();
  announceTurn();
  pushState();
  listenActions();
  driveBots();
  throwHint();
}
function listenActions(){
  if(unsubActions) unsubActions.off();
  unsubActions=roomRef.child('actions');
  unsubActions.on('child_added',snap=>{
    const a=snap.val(); snap.ref.remove();
    if(!a||!S||a.seat===0||!S.activeSeats.includes(a.seat)) return;
    let res;
    if(a.kind==='pass') res=applyPass(S,a.seat);
    else{
      const ids=new Set(a.ids||[]);
      const cards=S.hands[a.seat].filter(c=>ids.has(cid(c)));
      res=(cards.length===(a.ids||[]).length)?applyPlay(S,a.seat,cards):{ok:false};
    }
    if(res.ok){ postApply(); }
    else pushState(); // đồng bộ lại cho guest thấy state chuẩn
  });
}
function driveBots(){
  clearTimeout(botTimer);
  if(!S||S.status!=='playing'||mode!=='solo') return;
  const p=S.turn;
  const isBot=p!==0;
  if(!isBot) return;
  const token=++botToken;
  botTimer=setTimeout(()=>{
    if(token!==botToken||!S||S.status!=='playing'||S.turn!==p) return;
    const mv=botMove(S,p);
    const res=mv?applyPlay(S,p,mv.cards):applyPass(S,p);
    if(res.ok) postApply();
  }, 750+Math.random()*400);
}
function postApply(){
  render();
  if(S.fx) flash(S.fx);
  if(S.note) toast(S.note);
  pushState();
  if(S.status==='over'){ settleMyWallet(S); setTimeout(showResult,700); return; }
  announceTurn();
  driveBots();
}
function announceTurn(){
  if(S.turn===myIdx && S.status==='playing') toast(S.firstPlay?'Bạn có 3♠ — mở bài đi!':'Tới lượt bạn');
}

/* ---------- GUEST ---------- */
function setJoinError(message){
  const el=$('joinMsg');
  if(el) el.textContent=message||'';
  if(message) toast(message);
}
async function joinRoom(code,name){
  if(!initFirebase()){ showFirebaseSetup(); return; }
  code=(code||'').trim().toUpperCase();
  if(code.length!==5){ setJoinError('Mã phòng gồm đúng 5 ký tự'); return; }
  const joinBtn=$('jGo');
  if(joinBtn) joinBtn.disabled=true;
  setJoinError('Đang tìm phòng '+code+'…');
  myName=name||'Khách'; 
  const ref=db.ref('rooms/'+code);
  let snap;
  try{ snap=await ref.get(); }
  catch(e){ console.error(e); setJoinError('Không đọc được phòng — kiểm tra mạng rồi thử lại'); if(joinBtn) joinBtn.disabled=false; return; }
  if(!snap.exists()){
    setJoinError('Không tìm thấy phòng '+code+'. Nhờ chủ phòng tạo mã mới.');
    if(joinBtn) joinBtn.disabled=false;
    return;
  }
  const room=snap.val()||{};
  roomMaxPlayers=[2,3,4].includes(+room.maxPlayers)?+room.maxPlayers:2;
  if(room.created&&Date.now()-room.created>2*60*60*1000){
    setJoinError('Mã phòng đã hết hạn — nhờ chủ phòng tạo mã mới');
    if(joinBtn) joinBtn.disabled=false;
    return;
  }
  if(room.hostOnline===false){
    setJoinError('Chủ phòng đang mất kết nối — chờ chủ phòng mở lại game');
    if(joinBtn) joinBtn.disabled=false;
    return;
  }
  const seatOrder=roomSeatOrder(roomMaxPlayers);
  const uid=auth.currentUser.uid;
  if(roomPlayer(room.players,0)&&roomPlayer(room.players,0).uid===uid){
    setJoinError('Tài khoản này đang là chủ phòng — dùng tài khoản khác để tham gia');
    if(joinBtn) joinBtn.disabled=false;
    return;
  }
  const playersRef=ref.child('players');
  let claim;
  try{
    claim=await playersRef.transaction(players=>{
      const allocated=allocateRoomSeat(players,seatOrder,uid,{name:myName,classId:myClass,joined:Date.now(),online:true,coins:(profile?profile.coins||0:0)});
      return allocated?allocated.players:undefined;
    });
  }catch(e){
    console.error(e);
    setJoinError('Không thể vào phòng — kiểm tra quyền Firebase');
    if(joinBtn) joinBtn.disabled=false;
    return;
  }
  if(!claim||!claim.committed){
    setJoinError('Phòng đã đủ '+roomMaxPlayers+' người');
    if(joinBtn) joinBtn.disabled=false;
    return;
  }
  roomPlayers=claim.snapshot.val()||{};
  myIdx=seatOrder.find(s=>{ const p=roomPlayer(roomPlayers,s); return p&&p.uid===uid; });
  if(myIdx===undefined||myIdx===0){
    setJoinError('Không cấp được ghế trong phòng');
    if(joinBtn) joinBtn.disabled=false;
    return;
  }
  mode='guest'; roomCode=code; roomRef=ref;
  const guestRef=playersRef.child(String(myIdx));
  unsubPresence=db.ref('.info/connected');
  unsubPresence.on('value',connected=>{
    if(!connected.val()||mode!=='guest'||roomRef!==ref) return;
    guestRef.update({online:true,disconnectedAt:null}).catch(()=>{});
    guestRef.onDisconnect().update({online:false,disconnectedAt:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});
  });
  showWaiting(true,roomPlayers,roomMaxPlayers);
  unsubGuest=playersRef;
  unsubGuest.on('value',playersSnap=>{
    roomPlayers=playersSnap.val()||{};
    if(!S) showWaiting(true,roomPlayers,roomMaxPlayers);
  });
  listenChat(); listenThrows(); updateChatUI();
  unsubState=ref.child('state');
  let lastVer=0, lastFx=null;
  unsubState.on('value',snap=>{
    const raw=snap.val();
    if(!raw) return;
    const ns=JSON.parse(raw);
    // Firebase làm rơi mảng rỗng -> vá lại (state là chuỗi JSON nên chủ yếu phòng thủ)
    ns.hands=(ns.hands||[[],[],[],[]]).map(h=>h||[]);
    ns.lastPlayedCards=ns.lastPlayedCards||[];
    ns.finished=ns.finished||[];
    ns.passed=ns.passed||[false,false,false,false];
    ns.coins=ns.coins||[0,0,0,0];
    ns.activeSeats=ns.activeSeats||[0,1,2,3];
    ns.classes=ns.classes||['captain','mage',myClass,'trickster'];
    ns.settle=ns.settle||null;
    const isNew=!S;
    const wasOver=S&&S.status==='over';
    S=ns;
    // ván mới do host bắt đầu (over -> playing): phải gỡ overlay kết quả, nếu không guest kẹt sau modal
    if(isNew || (wasOver&&ns.status==='playing')){ hideOverlay(); selected.clear(); throwHint(); }
    render();
    if(S.ver!==lastVer){
      if(S.fx&&S.fx!==lastFx) flash(S.fx);
      if(S.note) toast(S.note);
      lastFx=S.fx; lastVer=S.ver;
      if(S.turn===myIdx&&S.status==='playing') toast('Tới lượt bạn');
    }
    if(S.status==='over'){ settleMyWallet(S); setTimeout(showResult,700); }
  });
  // host xoá phòng -> thoát (lưu để detachAll gỡ được, tránh rò rỉ & đá nhầm phòng khác)
  unsubRoom=ref;
  unsubRoom.on('value',s=>{ if(!s.exists()&&mode==='guest'&&roomCode===code){ toast('Chủ phòng đã thoát'); leaveToMenu(); } });
}
function guestSend(kind,ids){
  roomRef.child('actions').push({seat:myIdx, kind, ids:ids||null, t:Date.now()});
}

/* ---------- SOLO ---------- */
function startSolo(name,openingSeat){
  mode='solo'; myIdx=0; myName=name||myName||'Bạn';
  S=freshState([myName,'An','Bình','Cường'],{
    bet:gameBet,
    gameId:newGameId(),
    classes:[myClass,'mage','guardian','trickster'],
    openingSeat,
  });
  S.coins=[ (profile?profile.coins||0:0), botCoins[1], botCoins[2], botCoins[3] ];
  settledGameId=null;
  clearTimeout(throwBackTimer);   // huỷ cú "ném lại" còn treo từ ván trước
  selected.clear();
  hideOverlay(); render();
  const winnerOpens=Number.isInteger(openingSeat);
  toast(winnerOpens
    ? (S.turn===0?'Bạn TỚI ván trước — đi trước!':`${S.names[S.turn]} TỚI ván trước — đi trước`)
    : (S.turn===0?'Bạn có 3♠ — mở bài đi!':`${S.names[S.turn]} có 3♠, đi trước`));
  driveBots();
  throwHint();
}
