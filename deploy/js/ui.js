/* =========================================================================
   INPUT người chơi
   ========================================================================= */
function myTurn(){ return S && S.status==='playing' && S.turn===myIdx; }
function selCards(){
  return S.hands[myIdx].filter(c=>selected.has(cid(c)));
}
function onPlay(){
  if(!myTurn()) return;
  const cards=selCards();
  if(!cards.length){ toast('Chọn lá bài trước đã'); return; }
  if(mode==='guest'){
    // kiểm tra tại chỗ cho phản hồi nhanh, host vẫn xác thực lại
    const m=classify(cards);
    if(!m){ toast('Bộ bài không hợp lệ'); shakeHand(); return; }
    if(S.firstPlay && !cards.some(c=>c.rank===3&&c.suit===0)){ toast('Ván mới phải đánh kèm 3♠'); shakeHand(); return; }
    if(!beats(m,S.current)){ toast(S.current?'Không chặn được bài trên bàn':'Không hợp lệ'); shakeHand(); return; }
    selected.clear();
    syncSelection();
    guestSend('play',cards.map(cid));
    return;
  }
  const res=applyPlay(S,myIdx,cards);
  if(!res.ok){ toast(res.err); shakeHand(); return; }
  selected.clear();
  postApply();
}
function onPass(){
  if(!myTurn()) return;
  if(!S.current){ toast('Bạn đang mở bài, phải đánh'); return; }
  selected.clear();
  if(mode==='guest'){ syncSelection(); guestSend('pass'); return; }
  const res=applyPass(S,myIdx);
  if(res.ok) postApply();
}
function onHint(){
  if(!myTurn()) return;
  const moves=legalMoves(S.hands[myIdx],S.current);
  if(!moves.length){ toast(S.current?'Không có bài để đè — bỏ lượt đi':'Hết nước'); return; }
  const nb=moves.filter(x=>!isBomb(x.m));
  let pick;
  if(S.firstPlay){
    const w=moves.filter(x=>x.cards.some(c=>c.rank===3&&c.suit===0));
    pick=(w.length?w:moves).sort((a,b)=>a.m.top-b.m.top)[0];
  }else{
    pick=(nb.length?nb:moves).sort((a,b)=>a.m.top-b.m.top)[0];
  }
  selected=new Set(pick.cards.map(cid));
  syncSelection();
}
function onBombHint(){
  if(!myTurn()) return;
  const bombs=legalMoves(S.hands[myIdx],S.current)
    .filter(x=>isBomb(x.m))
    .sort((a,b)=>bombStrength(a.m)-bombStrength(b.m));
  if(!bombs.length){ toast('Chưa có bộ chặt phù hợp'); return; }
  selected=new Set(bombs[0].cards.map(cid));
  syncSelection();
  flash('SẴN SÀNG!');
}
function toggleCard(id){
  if(!S||S.status!=='playing'||S.turn!==myIdx) return;
  if(selected.has(id)) selected.delete(id); else selected.add(id);
  syncSelection();                       // chỉ bật/tắt class, không vẽ lại gì
}
function syncSelection(){
  const kids=$('hand').children;
  for(const el of kids) el.classList.toggle('sel',selected.has(+el.dataset.id));
  updatePlayLabel();
}
function updatePlayLabel(){
  const n=selected.size;
  $('btnPlay').textContent=n?`Đánh (${n})`:'Đánh';
}

/* =========================================================================
   RENDER — vẽ theo phần, phần nào đổi mới đụng DOM (chống giật)
   ========================================================================= */
const $=id=>document.getElementById(id);
function cardHTML(c,extra='',delay=-1){
  const red=RED.has(c.suit)?'red':'';
  const style=delay>=0?` style="--d:${delay}ms"`:'';
  return `<div class="card ${red} ${extra}" data-id="${cid(c)}"${style}><span class="r">${rlabel(c.rank)}</span>`
       + `<span class="big">${SUITS[c.suit]}</span><span class="s">${SUITS[c.suit]}</span></div>`;
}
let ui={seats:'',pile:'',hand:'',handN:0};
function render(){
  if(!S){
    $('seatNodes').innerHTML=''; $('pile').innerHTML='';
    $('playedBy').textContent=''; $('roundNote').textContent='';
    $('hand').innerHTML=''; $('handCount').textContent=''; $('myHero').innerHTML='';
    ui={seats:'',pile:'',hand:'',handN:0};
    return;
  }
  renderSeats(); renderPile(); renderHand(); renderControls();
}
function renderSeats(){
  const sig=[S.ver,S.turn,S.status,S.passed.join(''),S.finished.join(','),
    S.hands.map(h=>h.length).join(','),S.names.join('|'),(S.classes||[]).join(','),(S.coins||[]).join(','),mode].join('~');
  if(sig===ui.seats) return;
  ui.seats=sig;
  const relPos={1:'left',2:'top',3:'right'};
  const quip=quipFor(S);
  let html='';
  for(let rel=1;rel<=3;rel++){
    const p=(myIdx+rel)%4;
    const finRank=S.finished.indexOf(p);
    const badge=finRank>=0?`<div class="place-badge">${['🥇','🥈','🥉','🎈'][finRank]}</div>`:'';
    const humanDot=(mode!=='solo'&&!BOT_SEATS.includes(p)&&p!==myIdx)?'<span class="net-dot"></span>':'';
    const say=(quip&&S.lastPlayedBy===p)?`<div class="bubble">${quip}</div>`:'';
    const n=S.hands[p].length;
    let mini=''; const show=Math.min(n,7);
    for(let k=0;k<show;k++){
      const off=(k-(show-1)/2)*11;
      mini+=`<i style="left:calc(50% + ${off}px); transform:translateX(-50%) rotate(${off*0.3}deg)"></i>`;
    }
    const coinPill=S.coins?`<span class="coin-pill"><span class="ic" aria-hidden="true">🪙</span>${fmtCoin(S.coins[p])}</span>`:'';
    html+=`<div class="seat ${relPos[rel]} ${S.turn===p&&S.status==='playing'?'turn':''} ${S.passed[p]?'passed':''}">
      ${say}
      <div class="avatar" style="--class-accent:${CHARACTER_CLASSES[seatClass(p)].accent}">${seatAvatar(p)}${badge}${humanDot}<span class="pass-tag">BỎ</span></div>
      <div class="nm"><b>${esc(S.names[p])}</b> <span class="cnt">${n}</span></div>
      ${coinPill}
      <div class="mini">${mini}</div>
    </div>`;
  }
  $('seatNodes').innerHTML=html;
}
function renderPile(){
  const has=S.current&&S.lastPlayedCards.length;
  const sig=has?S.lastPlayedCards.map(cid).join(',')+'@'+S.lastPlayedBy:'empty';
  if(sig===ui.pile) return;
  ui.pile=sig;
  if(has){
    $('pile').innerHTML=S.lastPlayedCards.map(c=>cardHTML(c)).join('');
    $('playedBy').textContent=S.lastPlayedBy>=0?`${S.names[S.lastPlayedBy]} vừa đánh`:'';
    $('roundNote').textContent='';
  }else{
    $('pile').innerHTML=''; $('playedBy').textContent='';
    $('roundNote').textContent='· vòng mới ·';
  }
}
function renderHand(){
  const mine=[...S.hands[myIdx]];
  mine.sort(sortByRank?(a,b)=>a.rank-b.rank||a.suit-b.suit:(a,b)=>a.suit-b.suit||a.rank-b.rank);
  const sig=mine.map(cid).join(',')+(sortByRank?'|r':'|s');
  const handEl=$('hand');
  if(sig!==ui.hand){
    const fresh=mine.length>ui.handN||mine.length===13; // ván mới chia -> mới chạy animation
    handEl.classList.toggle('dealing',fresh);
    handEl.innerHTML=mine.map((c,i)=>cardHTML(c,selected.has(cid(c))?'sel':'',fresh?i*22:-1)).join('');
    ui.hand=sig; ui.handN=mine.length;
  }else{
    syncSelection();
  }
  $('handCount').textContent=`Bài: ${mine.length}`;
}
function renderControls(){
  const mt=myTurn();
  const classId=seatClass(myIdx), cls=CHARACTER_CLASSES[classId];
  $('myHero').innerHTML=`<img src="${cls.asset}" alt=""><span><b>${esc(S.names[myIdx])}</b><small>${cls.name}</small></span>`;
  $('myHero').style.setProperty('--class-accent',cls.accent);
  $('btnPlay').disabled=!mt;
  $('btnPlay').classList.toggle('pulse',mt);   // tới lượt -> nút Đánh phát sáng nhắc
  $('btnPass').disabled=!mt||!S.current;
  $('btnHint').disabled=!mt;
  $('btnBomb').disabled=!mt||!legalMoves(S.hands[myIdx],S.current).some(x=>isBomb(x.m));
  updatePlayLabel();
}
function esc(s){ return String(s||'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }

/* ---------- FX ---------- */
let toastT;
function toast(msg){
  const t=$('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),1700);
}
function flash(text){
  const f=$('flash'); $('flashText').textContent=text;
  f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}
function shakeHand(){
  $('hand').animate(
    [{transform:'translateX(0)'},{transform:'translateX(-7px)'},{transform:'translateX(7px)'},{transform:'translateX(0)'}],
    {duration:240});
}
function confetti(){
  const EMO=['🎉','⭐','🎊','💛','🍀','✨'];
  for(let i=0;i<26;i++){
    const s=document.createElement('span');
    s.className='confetti';
    s.textContent=EMO[Math.floor(Math.random()*EMO.length)];
    s.style.left=Math.random()*100+'vw';
    s.style.animationDuration=(1.6+Math.random()*1.6)+'s';
    s.style.animationDelay=(Math.random()*0.7)+'s';
    s.style.fontSize=(16+Math.random()*16)+'px';
    document.body.appendChild(s);
    setTimeout(()=>s.remove(),4200);
  }
}

/* =========================================================================
   MÀN HÌNH
   ========================================================================= */
function showMenu(){
  const classCards=Object.entries(CHARACTER_CLASSES).map(([id,c])=>`
    <button class="class-card ${id===myClass?'sel':''}" data-class="${id}" style="--class-accent:${c.accent}" aria-label="Chọn ${c.name}">
      <img src="${c.asset}" alt=""><span>${c.name}</span>
    </button>`).join('');
  $('panel').innerHTML=`
    <div class="menu-fan" aria-hidden="true">
      <div class="card"><span class="r">3</span><span class="big">♠</span><span class="s">♠</span></div>
      <div class="card red"><span class="r">A</span><span class="big">♥</span><span class="s">♥</span></div>
      <div class="card red"><span class="r">2</span><span class="big">♦</span><span class="s">♦</span></div>
    </div>
    <div class="logo">Miền Nam</div>
    <h1>Tiến Lên</h1>
    <p class="sub">Chạm lá để chọn · <span class="hl">Đánh</span> để ra bài · hết bài trước là thắng.</p>
    <div class="class-title">Chọn lớp nhân vật</div>
    <div class="class-picker">${classCards}</div>
    <input class="field" id="inName" maxlength="12" placeholder="Tên của bạn" value="${esc((profile&&profile.name)?profile.name:(myName==='Bạn'?'':myName))}">
    <div class="menu-gap">
      <button class="btn block" id="mSolo">🎮 Chơi với máy</button>
      <button class="btn block blue" id="mHost">🌐 Tạo phòng online</button>
      <button class="btn block pink" id="mJoin">🔑 Vào phòng bằng mã</button>
      ${isAdmin()?'<button class="btn block ghost" id="mAdmin">🛠️ Quản lý (admin)</button>':''}
    </div>
    <p class="sub" style="margin:16px 0 0; font-size:11px">Đặt mệnh giá mỗi ván · ai TỚI trước ăn cả pot 🪙</p>
    <button class="linkish" id="mSignOut">Đăng xuất${profile&&profile.email?` (${esc(profile.email)})`:''}</button>`;
  $('overlay').style.display='flex';
  renderCoinBar();
  document.querySelectorAll('.class-card').forEach(card=>card.onclick=()=>{
    myClass=card.dataset.class;
    localStorage.setItem('tienlen-character',myClass);
    document.querySelectorAll('.class-card').forEach(x=>x.classList.toggle('sel',x===card));
  });
  const nm=()=>$('inName').value.trim()||null;
  $('mSolo').onclick=()=>{ syncName(nm()); showBetSetup(()=>startSolo(myName)); };
  $('mHost').onclick=()=>{ syncName(nm()); showBetSetup(()=>createRoom(myName)); };
  $('mJoin').onclick=()=>{ syncName(nm()); showJoin(myName); };
  if($('mAdmin')) $('mAdmin').onclick=showAdminPanel;
  $('mSignOut').onclick=signOut;
}
function showAdminPanel(){
  $('panel').innerHTML=`
    <div class="logo">Quản lý</div>
    <h1 style="font-size:24px">Bảng admin</h1>
    <p class="sub">Cộng/đặt xu cho tài khoản. Nhập số (âm để trừ) rồi bấm <b>Cộng</b>, hoặc <b>Đặt</b> để gán số xu chính xác.</p>
    <input class="field" id="admSearch" placeholder="🔎 Tìm theo tên / email">
    <div class="adm-list" id="admList">Đang tải…</div>
    <button class="linkish" id="admBack">← Về menu</button>`;
  $('overlay').style.display='flex';
  $('admBack').onclick=showMenu;
  let users=[];
  const myUid=auth&&auth.currentUser?auth.currentUser.uid:null;
  const draw=()=>{
    const q=($('admSearch').value||'').toLowerCase().trim();
    const rows=users
      .filter(u=>!q || (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q))
      .sort((a,b)=>(b.coins||0)-(a.coins||0))
      .map(u=>`<div class="adm-row" data-uid="${u.uid}">
        <div class="adm-who"><b>${esc(u.name||'—')}${u.uid===myUid?' (bạn)':''}</b><span>${esc(u.email||'')}</span></div>
        <div class="adm-line">
          <span class="adm-bal">🪙 <b class="adm-coins">${fmtCoin(u.coins||0)}</b></span>
          <input class="field adm-amt" type="number" inputmode="numeric" value="100" aria-label="Số xu">
          <button class="btn sm adm-add">Cộng</button>
          <button class="btn sm ghost adm-set">Đặt</button>
        </div>
      </div>`).join('');
    $('admList').innerHTML=rows||'<p class="sub">Không có tài khoản khớp.</p>';
  };
  adminLoadUsers()
    .then(list=>{ users=list; draw(); })
    .catch(()=>{ $('admList').innerHTML='<p class="sub" style="color:var(--red)">Không tải được danh sách — kiểm tra email admin trong Rules & config.js.</p>'; });
  $('admSearch').oninput=draw;
  $('admList').onclick=e=>{
    const btn=e.target.closest('.adm-add,.adm-set'); if(!btn) return;
    const row=btn.closest('.adm-row'); const uid=row.dataset.uid;
    const amt=Math.floor(+row.querySelector('.adm-amt').value||0);
    const isSet=btn.classList.contains('adm-set');
    if(!isSet && !amt){ toast('Nhập số xu'); return; }
    btn.disabled=true;
    const done=(newCoins)=>{
      const u=users.find(x=>x.uid===uid); if(u) u.coins=newCoins;
      row.querySelector('.adm-coins').textContent=fmtCoin(newCoins);
      toast(isSet?`Đã đặt ${fmtCoin(newCoins)} 🪙`:`Đã ${amt>=0?'cộng':'trừ'} ${fmtCoin(Math.abs(amt))} 🪙`);
      btn.disabled=false;
    };
    const p=isSet?adminSet(uid,amt).then(()=>amt)
                 :adminGrant(uid,amt).then(r=>(r&&r.snapshot?r.snapshot.val():((users.find(x=>x.uid===uid)||{}).coins||0)+amt));
    p.then(done).catch(()=>{ toast('Lỗi: không đủ quyền (kiểm tra Rules)'); btn.disabled=false; });
  };
}
const BET_PRESETS=[5,10,20,50];
function showBetSetup(next){
  const chips=BET_PRESETS.map(v=>`<button class="bet-chip${v===gameBet?' sel':''}" data-v="${v}">${v} 🪙/lá</button>`).join('');
  $('panel').innerHTML=`
    <div class="logo">Mệnh giá</div>
    <h1 style="font-size:24px">Đặt cược mỗi lá</h1>
    <p class="sub">Người thua trả <b>số lá còn lại × mệnh giá</b>. Người TỚI ăn cả pot.</p>
    <div class="bet-chips">${chips}</div>
    <input class="field" id="inBet" type="number" min="0" inputmode="numeric" value="${gameBet}">
    <div class="menu-gap"><button class="btn block" id="betGo">Bắt đầu 🎴</button></div>
    <button class="linkish" id="betBack">← Quay lại</button>`;
  $('overlay').style.display='flex';
  document.querySelectorAll('.bet-chip').forEach(c=>c.onclick=()=>{
    $('inBet').value=c.dataset.v;
    document.querySelectorAll('.bet-chip').forEach(x=>x.classList.remove('sel'));
    c.classList.add('sel');
  });
  $('betGo').onclick=()=>{ gameBet=Math.max(0,Math.floor(+$('inBet').value||0)); next(); };
  $('betBack').onclick=showMenu;
}
function showJoin(name){
  $('panel').innerHTML=`
    <div class="logo">Vào phòng</div>
    <h1 style="font-size:24px">Nhập mã phòng</h1>
    <p class="sub">Hỏi chủ phòng mã 5 ký tự rồi nhập vào đây.</p>
    <input class="field code" id="inCode" type="text" inputmode="text" maxlength="5" pattern="[A-Za-z0-9]{5}"
      placeholder="ABCDE" autocapitalize="characters" autocomplete="off" enterkeyhint="go" spellcheck="false">
    <p class="field-err join-msg" id="joinMsg" aria-live="polite"></p>
    <div class="menu-gap">
      <button class="btn block" id="jGo">Vào phòng</button>
    </div>
    <button class="linkish" id="jBack">← Quay lại</button>`;
  $('overlay').style.display='flex';
  $('inCode').focus();
  $('inCode').oninput=e=>{
    const pos=e.target.selectionStart;
    e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
    try{ e.target.setSelectionRange(Math.min(pos,e.target.value.length),Math.min(pos,e.target.value.length)); }catch(err){}
    $('joinMsg').textContent='';
  };
  $('jGo').onclick=()=>joinRoom($('inCode').value,name);
  $('inCode').onkeydown=e=>{ if(e.key==='Enter') $('jGo').click(); };
  $('jBack').onclick=showMenu;
}
function showWaiting(asGuest=false){
  $('panel').innerHTML= asGuest ? `
    <div class="logo">Online</div>
    <h1 style="font-size:24px">Đã vào phòng ${roomCode}</h1>
    <div class="spinner"></div>
    <p class="sub">Chờ chủ phòng chia bài…</p>
    <button class="linkish" id="wLeave">Thoát phòng</button>`
  : `
    <div class="logo">Phòng của bạn</div>
    <h1 style="font-size:24px">Gửi mã này cho bạn bè</h1>
    <div class="room-code-big">${roomCode}</div>
    <div class="menu-gap">
      <button class="btn block ghost sm" id="wCopy">📋 Chép mã phòng</button>
    </div>
    <div class="spinner"></div>
    <p class="sub">Ván sẽ tự bắt đầu khi bạn của bạn vào phòng…</p>
    <button class="linkish" id="wLeave">Huỷ phòng</button>`;
  $('overlay').style.display='flex';
  const c=$('wCopy');
  if(c) c.onclick=()=>{ navigator.clipboard?.writeText(roomCode).then(()=>toast('Đã chép: '+roomCode)).catch(()=>toast(roomCode)); };
  $('wLeave').onclick=leaveToMenu;
}
function showResult(){
  if(!S || S.status!=='over') return;   // timer 700ms có thể bắn trễ khi ván mới đã bắt đầu
  closeThrowPicker();
  const st=S.settle;
  const list=st?st.rows:S.finished.map((p,i)=>({seat:p,cardsLeft:0,delta:0}));
  const rows=list.map((r,idx)=>{
    const you=r.seat===myIdx?'you':'';
    const medal=['🥇','🥈','🥉','🎈'][idx]||'🎈';
    const dcls=r.delta>0?'coin-up':(r.delta<0?'coin-down':'');
    const sign=r.delta>0?'+':'';
    const left=r.cardsLeft>0?` · còn ${r.cardsLeft} lá`:'';
    return `<div class="rank-row ${you}"><div class="pos">${medal}</div>
      <div class="who">${esc(S.names[r.seat])}<span class="sub" style="display:block;margin:0;font-weight:600">${left}</span></div>
      <div class="hl ${dcls}">${sign}${fmtCoin(r.delta)} 🪙</div></div>`;
  }).join('');
  const meWin=st&&st.winner===myIdx;
  const meRow=st&&st.rows.find(r=>r.seat===myIdx);
  if(meWin) confetti();
  const head=meWin?'TỚI! Nhất rồi 🎉':(meRow?`Bạn ${meRow.delta>=0?'+':''}${fmtCoin(meRow.delta)} 🪙`:'Kết thúc');
  const potLine=st?`<p class="sub">Mệnh giá ${fmtCoin(st.bet)} 🪙/lá · Pot ${fmtCoin(st.pot)} 🪙</p>`:'';
  const again = mode==='guest'
    ? `<p class="sub" style="margin-top:14px">Chờ chủ phòng bắt đầu ván mới…</p>`
    : `<button class="btn block" id="rAgain" style="margin-top:8px">Ván mới (${gameBet} 🪙/lá)</button>`;
  $('panel').innerHTML=`
    <div class="logo">Kết quả</div>
    <h1 style="font-size:26px">${head}</h1>
    ${potLine}
    <div style="margin:14px 0 8px">${rows}</div>
    ${again}
    <button class="linkish" id="rMenu">← Về menu</button>`;
  $('overlay').style.display='flex';
  const a=$('rAgain');
  if(a) a.onclick=()=>{
    if(mode==='host'){ hostStartGame(S.names[2],S.classes&&S.classes[2]); }
    else startSolo(myName);
  };
  $('rMenu').onclick=leaveToMenu;
}
function showFirebaseSetup(){
  $('panel').innerHTML=`
    <div class="logo">Cần cài đặt</div>
    <h1 style="font-size:22px">Kết nối Firebase</h1>
    <p class="sub">Chơi online cần một "phòng chờ" trên mạng — Firebase free là đủ. Làm 1 lần, ~5 phút:</p>
    <div class="steps">
      1. Vào <b>console.firebase.google.com</b> → Add project (đặt tên gì cũng được)<br>
      2. Menu <b>Build → Realtime Database</b> → Create database → chọn <b>Start in test mode</b><br>
      3. <b>Project settings ⚙ → Your apps → &lt;/&gt; Web</b> → đăng ký app → chép đoạn <b>firebaseConfig</b><br>
      4. Dán config vào ô dưới, hoặc sửa trực tiếp đầu file HTML này
    </div>
    <textarea class="field" id="cfgBox" placeholder='{"apiKey":"...", "databaseURL":"https://...firebasedatabase.app", ...}'></textarea>
    <div class="menu-gap">
      <button class="btn block" id="cfgSave">Kết nối</button>
    </div>
    <button class="linkish" id="cfgBack">← Quay lại</button>`;
  $('overlay').style.display='flex';
  $('cfgSave').onclick=()=>{
    let txt=$('cfgBox').value.trim();
    try{
      // cho phép dán cả đoạn "const firebaseConfig = {...};"
      const m=txt.match(/\{[\s\S]*\}/);
      const obj=JSON.parse(m?m[0].replace(/(\w+)\s*:/g,'"$1":').replace(/'/g,'"').replace(/,\s*}/,'}'):txt);
      if(!obj.apiKey||!obj.databaseURL) throw 0;
      Object.assign(FIREBASE_CONFIG,obj);
      if(initFirebase()){ toast('Đã kết nối Firebase ✓'); boot(); }
      else toast('Config chưa đúng, thử lại');
    }catch(e){ toast('Không đọc được config — dán nguyên khối {...}'); }
  };
  $('cfgBack').onclick=showMenu;
}
function hideOverlay(){ $('overlay').style.display='none'; }
// Dọn phòng/ván nhưng KHÔNG động tới đăng nhập (dùng cho cả leaveToMenu & signOut)
function cleanupRoom(){
  clearTimeout(botTimer); botToken++;
  detachAll();
  if(roomRef){
    if(mode==='host'){
      roomRef.onDisconnect().cancel().catch(()=>{});
      roomRef.remove().catch(()=>{});
    }
    if(mode==='guest'){
      roomRef.child('guest').onDisconnect().cancel().catch(()=>{});
      roomRef.child('guest').remove().catch(()=>{});
    }
  }
  roomRef=null; roomCode=null; S=null; selected.clear(); mode='solo'; myIdx=0;
  settledGameId=null;
  chatMsgs=[]; chatUnread=0; setChatBadge(); toggleChat(false); updateChatUI();
  closeThrowPicker();
  if(typeof throwBackTimer!=='undefined') clearTimeout(throwBackTimer);
  if(typeof seenThrows!=='undefined'&&seenThrows) seenThrows.clear();
  lastThrowAt=0;
}
function leaveToMenu(){
  cleanupRoom();
  render(); showMenu();
}
