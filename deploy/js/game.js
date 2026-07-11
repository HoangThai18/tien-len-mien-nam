/* =========================================================================
   SESSION — solo | host | guest
   ========================================================================= */
let mode='solo';        // 'solo' | 'host' | 'guest'
let myIdx=0;            // 0 solo/host, 2 guest
let S=null;             // state hiện tại (host/solo: bản gốc; guest: bản sync)
let selected=new Set(); // card ids đang chọn
let sortByRank=true;
let botTimer=null, botToken=0;
let myName='Bạn';
let myClass=localStorage.getItem('tienlen-character')||'captain';

const BOT_SEATS=[1,3];
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
// câu thoại vui của bot — chọn theo S.ver nên host & guest thấy giống nhau
const QUIPS=['Hihi chặn nè!','Đỡ được không? 😏','Bài đẹp ghê ta~','Ăn miếng này!','Tới công chuyện!',
  'Ai sợ chưa? 😆','Nhẹ nhàng thôi mà','Bài này khét đó','Đừng giận nha 🤭','Xin lỗi trước nè!'];
function quipFor(S){
  if(!S || S.lastPlayedBy<0 || S.lastPlayedBy===myIdx) return null;
  if(!isBotSeat(S.lastPlayedBy)) return null;
  if(S.ver%3!==0) return null;           // thỉnh thoảng mới nói cho đỡ ồn
  return QUIPS[S.ver%QUIPS.length];
}
const isBotSeat=p=>mode!=='solo'?BOT_SEATS.includes(p):(p!==0);
const seatClass=p=>{
  if(S&&S.classes&&S.classes[p]&&CHARACTER_CLASSES[S.classes[p]]) return S.classes[p];
  if(p===myIdx) return myClass;
  if(mode==='solo') return ['captain','mage','guardian','trickster'][p];
  if(BOT_SEATS.includes(p)) return BOT_INFO[p].classId;
  return 'guardian';
};
const seatAvatar=p=>{
  const id=seatClass(p), cls=CHARACTER_CLASSES[id]||CHARACTER_CLASSES.captain;
  return `<img class="avatar-img" src="${cls.asset}" alt="">`;
};

/* ---------- Firebase ---------- */
let db=null, auth=null, roomCode=null, roomRef=null;
let unsubState=null, unsubActions=null, unsubGuest=null, unsubRoom=null, unsubPresence=null;
// Tài khoản + ví (cloud): nguồn sự thật của tiền ở users/<uid>
let profile=null, unsubProfile=null, settledGameId=null;
let gameBet=10, soloGameCounter=0, throwHintShown=false;
let botCoins={1:1000,2:1000,3:1000};   // xu hiển thị của bot (không lưu cloud)
let guestCoins=1000;                    // host: xu guest tự báo, chỉ để hiển thị
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
      createdAt:Date.now(), lastSettled:null
    };
  });
}
function attachProfile(uid){
  detachProfile();
  unsubProfile=db.ref('users/'+uid);
  unsubProfile.on('value',snap=>{
    profile=snap.val();
    if(profile){
      if(profile.name) myName=profile.name;
      renderCoinBar();
      if(mode==='guest'&&roomRef) roomRef.child('guest').update({coins:profile.coins||0});
    }
  });
}
function detachProfile(){ if(unsubProfile){ unsubProfile.off(); unsubProfile=null; } }
// Cộng/trừ xu vào ví CỦA MÌNH, đúng 1 lần cho mỗi ván (chốt bằng lastSettled)
function addCoins(delta,gameId,isWinner){
  if(!auth||!auth.currentUser||!db) return;
  db.ref('users/'+auth.currentUser.uid).transaction(u=>{
    if(u===null) return u;
    if(u.lastSettled===gameId) return;           // ván này đã trả tiền -> bỏ qua
    u.coins=(u.coins||0)+delta;
    u.games=(u.games||0)+1;
    if(isWinner) u.wins=(u.wins||0)+1;
    u.lastSettled=gameId;
    return u;
  }).catch(e=>console.error('addCoins',e));
}
// Áp kết quả tiền của ván vào ví mình (host=seat0, guest=seat2); bot không lưu
function settleMyWallet(S){
  if(!S||!S.settle) return;
  if(settledGameId===S.settle.gameId) return;
  settledGameId=S.settle.gameId;
  const row=(S.settle.rows||[]).find(r=>r.seat===myIdx);
  if(!row) return;
  addCoins(row.delta, S.settle.gameId, S.settle.winner===myIdx);
}
function fmtCoin(n){ n=Number(n); if(!isFinite(n)) return '--'; return n.toLocaleString('vi-VN'); }
function renderCoinBar(){
  const bar=$('coinBar'); if(!bar) return;
  if(profile){ $('coinVal').textContent=(profile.coins!=null?fmtCoin(profile.coins):'--'); bar.style.display='inline-flex'; }
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
  if(auth&&auth.currentUser&&db&&profile&&profile.name!==n)
    db.ref('users/'+auth.currentUser.uid+'/name').set(n);
}
function throwHint(){
  if(throwHintShown) return; throwHintShown=true;
  setTimeout(()=>{ if(S&&S.status==='playing') toast('Chạm đối thủ để ném đồ trêu 😜'); },2600);
}
/* ---------- Màn đăng nhập ---------- */
function showAuthLoading(){
  $('panel').innerHTML=`
    <div class="logo">Tiến Lên</div>
    <h1 style="font-size:24px">Đang tải…</h1>
    <div class="spinner"></div>
    <p class="sub">Đang kiểm tra đăng nhập</p>`;
  $('overlay').style.display='flex';
}
function showLogin(){
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
      }catch(e){ console.error(e); }
      attachProfile(user.uid);
      showMenu();
    }else{
      if(mode!=='solo'||S){ cleanupRoom(); render(); }   // đăng xuất giữa chừng -> dọn phòng
      detachProfile(); profile=null; renderCoinBar();
      showLogin();
    }
  });
}

/* ---------- HOST ---------- */
async function createRoom(name){
  if(!initFirebase()){ showFirebaseSetup(); return; }
  myName=name||myName||'Chủ phòng'; mode='host'; myIdx=0;
  roomCode=makeCode();
  roomRef=db.ref('rooms/'+roomCode);
  try{
    await roomRef.set({created:Date.now(), hostName:myName, hostClass:myClass, hostOnline:true, bet:gameBet, state:null});
    // Trên điện thoại, đổi app để gửi mã có thể ngắt socket vài giây. Giữ phòng lại và chỉ đánh dấu offline.
    const hostRoom=roomRef;
    unsubPresence=db.ref('.info/connected');
    unsubPresence.on('value',snap=>{
      if(!snap.val()||mode!=='host'||roomRef!==hostRoom) return;
      hostRoom.update({hostOnline:true,hostDisconnectedAt:null}).catch(()=>{});
      hostRoom.onDisconnect().update({hostOnline:false,hostDisconnectedAt:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});
    });
  }catch(e){
    toast('Không kết nối được Firebase — kiểm tra config & rules'); console.error(e);
    mode='solo'; return;
  }
  showWaiting();
  listenChat(); listenThrows(); updateChatUI();
  // chờ khách vào
  unsubGuest=roomRef.child('guest');
  unsubGuest.on('value',snap=>{
    const g=snap.val();
    if(!g||!g.name) return;
    if(typeof g.coins==='number') guestCoins=g.coins;
    if(!S) hostStartGame(g.name,g.classId);      // khách vào lần đầu → chia bài
    else{
      S.names[2]=g.name;               // khách reconnect → cập nhật tên
      S.classes[2]=CHARACTER_CLASSES[g.classId]?g.classId:'guardian';
      if(typeof g.coins==='number'){ S.coins[2]=g.coins; pushState(); }
    }
  });
}
function hostStartGame(guestName,guestClass){
  const names=[myName,BOT_INFO[1].name,guestName||'Khách',BOT_INFO[3].name];
  const classes=[myClass,'mage',CHARACTER_CLASSES[guestClass]?guestClass:'guardian','trickster'];
  S=freshState(names,{bet:gameBet, gameId:newGameId(), classes});
  S.coins=[ (profile?profile.coins||0:0), botCoins[1], guestCoins, botCoins[3] ];
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
    if(!a||a.seat!==2||!S) return;
    let res;
    if(a.kind==='pass') res=applyPass(S,2);
    else{
      const ids=new Set(a.ids||[]);
      const cards=S.hands[2].filter(c=>ids.has(cid(c)));
      res=(cards.length===(a.ids||[]).length)?applyPlay(S,2,cards):{ok:false};
    }
    if(res.ok){ postApply(); }
    else pushState(); // đồng bộ lại cho guest thấy state chuẩn
  });
}
function driveBots(){
  clearTimeout(botTimer);
  if(!S||S.status!=='playing') return;
  if(mode==='guest') return;
  const p=S.turn;
  const isBot = mode==='solo' ? p!==0 : BOT_SEATS.includes(p);
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
  if(room.guest&&room.guest.name&&room.guest.online!==false){
    setJoinError('Phòng đã đủ người');
    if(joinBtn) joinBtn.disabled=false;
    return;
  }
  mode='guest'; myIdx=2; roomCode=code; roomRef=ref;
  const guestRef=ref.child('guest');
  try{
    await guestRef.set({name:myName, classId:myClass, joined:Date.now(), online:true, coins:(profile?profile.coins||0:0)});
  }catch(e){
    console.error(e); mode='solo'; myIdx=0; roomCode=null; roomRef=null;
    setJoinError('Không thể vào phòng — kiểm tra quyền Firebase');
    if(joinBtn) joinBtn.disabled=false;
    return;
  }
  unsubPresence=db.ref('.info/connected');
  unsubPresence.on('value',connected=>{
    if(!connected.val()||mode!=='guest'||roomRef!==ref) return;
    guestRef.update({online:true,disconnectedAt:null}).catch(()=>{});
    guestRef.onDisconnect().update({online:false,disconnectedAt:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});
  });
  showWaiting(true);
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
  roomRef.child('actions').push({seat:2, kind, ids:ids||null, t:Date.now()});
}

/* ---------- SOLO ---------- */
function startSolo(name){
  mode='solo'; myIdx=0; myName=name||myName||'Bạn';
  S=freshState([myName,'An','Bình','Cường'],{
    bet:gameBet,
    gameId:newGameId(),
    classes:[myClass,'mage','guardian','trickster'],
  });
  S.coins=[ (profile?profile.coins||0:0), botCoins[1], botCoins[2], botCoins[3] ];
  settledGameId=null;
  clearTimeout(throwBackTimer);   // huỷ cú "ném lại" còn treo từ ván trước
  selected.clear();
  hideOverlay(); render();
  toast(S.turn===0?'Bạn có 3♠ — mở bài đi!':`${S.names[S.turn]} có 3♠, đi trước`);
  driveBots();
  throwHint();
}
