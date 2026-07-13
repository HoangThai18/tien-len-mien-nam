/* =========================================================================
   MẬU BINH — Binh Xập Xám (13 lá), chơi với 3 máy. Ăn xu theo điểm × mệnh giá.
   Mỗi người 13 lá → xếp 3 chi: Đầu(3) · Giữa(5) · Cuối(5), chi dưới ≥ chi trên.
   So từng chi ăn ±1 điểm; thắng cả 3 chi (Sập Hầm) ăn đôi (±6). Vài bộ Mậu Binh
   (báo bài) thắng trắng cả bàn. Tính điểm ghế 0 (Bạn) × mệnh giá → cộng/trừ ví.
   File CHỈ khai báo; mọi wiring nằm trong hàm (KHÔNG chạy code top-level).
   Dùng chung: newDeck/cid/rlabel/SUITS/RED/cardHTML/$/esc/toast/fmtCoin/addCoins.
   ========================================================================= */
let mbState=null, mbActive=false, mbBuilt=false;
let mbMode='solo';          // 'solo' | 'online'
let mbNet=null;             // (dành cho bàn online — làm sau)
let mbSuppressClick=false;  // chặn click ảo ngay sau khi kéo-thả

// key = mã tài khoản máy DÙNG CHUNG toàn hệ thống (BXH cardbots) — cố định, không đổi.
const MB_BOTS=[ null, {name:'An',emoji:'🐱',key:'mb-an'}, {name:'Bo',emoji:'🐼',key:'mb-bo'}, {name:'Cường',emoji:'🦊',key:'mb-cuong'} ];
const MB_CAP={front:3, mid:5, back:5};

/* Rank kiểu poker chuẩn: 2 nhỏ nhất … A(14) lớn nhất. Lá "2" trong engine mang
   rank 15 → quy về 2. A=14, K=13… giữ nguyên. */
function mbRank(c){ return c.rank===15?2:c.rank; }
function mbLbl(r){ return ({14:'A',13:'K',12:'Q',11:'J',2:'2'})[r]||String(r); }
function mbColor(s){ return s>=2?'red':'black'; }   // ♦♥ đỏ · ♠♣ đen

/* ---------- Đánh giá 1 chi (3 hoặc 5 lá) ---------- */
// cat: 0 Mậu thầu·1 Đôi·2 Thú·3 Sám·4 Sảnh·5 Thùng·6 Cù lũ·7 Tứ quý·8 Thùng phá sảnh
function mbEval(cards){
  const n=cards.length;
  const rs=cards.map(mbRank).sort((a,b)=>b-a);
  const cnt={}; rs.forEach(r=>cnt[r]=(cnt[r]||0)+1);
  const groups=Object.keys(cnt).map(Number).sort((a,b)=>cnt[b]-cnt[a]||b-a);
  const suits=cards.map(c=>c.suit);
  const flush = n===5 && suits.every(s=>s===suits[0]);
  let straight=false, sHigh=0;
  if(n===5){
    const u=[...new Set(rs)];
    if(u.length===5){
      if(u[0]-u[4]===4){ straight=true; sHigh=u[0]; }
      else if(u[0]===14&&u[1]===5&&u[2]===4&&u[3]===3&&u[4]===2){ straight=true; sHigh=5; } // A-2-3-4-5
    }
  }
  const maxc=cnt[groups[0]], sec=groups.length>1?cnt[groups[1]]:0;
  let cat,tie;
  if(n===5){
    if(straight&&flush){ cat=8; tie=[sHigh]; }
    else if(maxc===4){ cat=7; tie=groups; }
    else if(maxc===3&&sec===2){ cat=6; tie=groups; }
    else if(flush){ cat=5; tie=rs; }
    else if(straight){ cat=4; tie=[sHigh]; }
    else if(maxc===3){ cat=3; tie=groups; }
    else if(maxc===2&&sec===2){ cat=2; tie=groups; }
    else if(maxc===2){ cat=1; tie=groups; }
    else{ cat=0; tie=rs; }
  }else{ // chi đầu 3 lá: chỉ Sám / Đôi / Mậu thầu
    if(maxc===3){ cat=3; tie=groups; }
    else if(maxc===2){ cat=1; tie=groups; }
    else{ cat=0; tie=rs; }
  }
  let s=cat; for(let i=0;i<5;i++) s=s*16+(tie[i]||0);   // scalar so sánh nhanh
  let top=0; cards.forEach(c=>{ const v=mbRank(c)*4+c.suit; if(v>top) top=v; });
  return {cat,tie,s,top,name:mbEvalName(cat,tie)};
}
function mbEvalName(cat,tie){
  switch(cat){
    case 0: return 'Mậu thầu '+mbLbl(tie[0]);
    case 1: return 'Đôi '+mbLbl(tie[0]);
    case 2: return 'Thú '+mbLbl(tie[0]);
    case 3: return 'Sám '+mbLbl(tie[0]);
    case 4: return 'Sảnh '+mbLbl(tie[0]);
    case 5: return 'Thùng';
    case 6: return 'Cù lũ '+mbLbl(tie[0]);
    case 7: return 'Tứ quý '+mbLbl(tie[0]);
    case 8: return 'Thùng phá sảnh';
  }
  return '';
}
// A>B: >0 ; luôn quyết (không hòa) nhờ so lá cao nhất (top cid) khi bằng điểm.
function mbCmp(A,B){ if(A.s!==B.s) return A.s<B.s?-1:1; return A.top-B.top; }
function mbFoul(ef,em,eb){ return mbCmp(eb,em)<0 || mbCmp(em,ef)<0; }

/* ---------- Bộ 3 lá thùng / sảnh (chỉ dùng cho báo Ba Thùng / Ba Sảnh) ---------- */
function mb3Flush(c){ return c.length===3 && c[0].suit===c[1].suit && c[1].suit===c[2].suit; }
function mb3Straight(c){
  const u=[...new Set(c.map(mbRank))].sort((a,b)=>a-b);
  if(u.length!==3) return false;
  return u[2]-u[0]===2 || (u[0]===2&&u[1]===3&&u[2]===14); // gồm A-2-3
}

/* ---------- Xếp bài tối ưu 13 lá (quét mọi cách chia hợp lệ) ---------- */
// Biểu diễn mỗi lá bằng 1 bit; chấm điểm sẵn mọi bộ 5 & 3 lá → vòng lặp trong
// chỉ tra bảng, không cấp phát/đánh giá lại → nhanh vài ms thay vì ~250ms.
function mbMasks(n,k){
  const res=[], idx=[];
  (function rec(start,depth){
    if(depth===k){ let m=0; for(const i of idx) m|=1<<i; res.push(m); return; }
    for(let i=start;i<=n-(k-depth);i++){ idx[depth]=i; rec(i+1,depth+1); }
  })(0,0);
  return res;
}
function mbPick(cards,mask){ const r=[]; for(let i=0;i<cards.length;i++) if(mask&(1<<i)) r.push(cards[i]); return r; }
// Trả {front,mid,back,val, f3, s3}: f3/s3 = cách chia Ba Thùng / Ba Sảnh (nếu có).
function mbBestArrange(cards13){
  const five=mbMasks(13,5), three=mbMasks(13,3);
  const eval5={}, eval3={}, fl3={}, st3={};
  for(const m of five) eval5[m]=mbEval(mbPick(cards13,m));
  for(const m of three){ const cs=mbPick(cards13,m); eval3[m]=mbEval(cs); fl3[m]=mb3Flush(cs); st3[m]=mb3Straight(cs); }
  let bestB=0,bestM=0,bestF=0, bestVal=-1, f3=null, s3=null;
  for(const back of five){
    const rem=back^0x1FFF, eb=eval5[back];              // 0x1FFF = 13 bit
    for(const front of three){
      if((front&rem)!==front) continue;                 // front phải nằm trong phần còn lại
      const mid=rem^front, em=eval5[mid], ef=eval3[front];
      if(mbCmp(eb,em)<0||mbCmp(em,ef)<0) continue;       // binh lủng → bỏ
      if(!f3 && eb.cat===5&&em.cat===5&&fl3[front]) f3={back,mid,front};
      if(!s3 && eb.cat===4&&em.cat===4&&st3[front]) s3={back,mid,front};
      const val=eb.s+em.s+ef.s;
      if(val>bestVal){ bestVal=val; bestB=back; bestM=mid; bestF=front; }
    }
  }
  const wrap=w=>({ front:mbPick(cards13,w.front), mid:mbPick(cards13,w.mid), back:mbPick(cards13,w.back) });
  let best;
  if(bestVal<0) best={back:cards13.slice(0,5),mid:cards13.slice(5,10),front:cards13.slice(10,13)}; // gần như không xảy ra
  else best={ front:mbPick(cards13,bestF), mid:mbPick(cards13,bestM), back:mbPick(cards13,bestB) };
  best.val=bestVal; best.f3=f3?wrap(f3):null; best.s3=s3?wrap(s3):null;
  return best;
}

/* ---------- Bộ Mậu Binh (báo bài thắng trắng) ---------- */
const MB_SP={
  rong:    {rank:6,pts:12,name:'Sảnh Rồng 🐉'},
  dongmau: {rank:5,pts:10,name:'Đồng Màu'},
  bathung: {rank:4,pts:6, name:'Ba Thùng'},
  basanh:  {rank:3,pts:6, name:'Ba Sảnh'},
  nam1sam: {rank:2,pts:4, name:'5 Đôi 1 Sám'},
  saudoi:  {rank:1,pts:3, name:'Sáu Đôi'},
};
// flags = {has3F,has3S} lấy từ cách chia THỰC TẾ của người/bot.
function mbSpecial(all13,flags){
  const rset=new Set(all13.map(mbRank));
  if(rset.size===13) return MB_SP.rong;                          // 13 lá liền → Sảnh Rồng
  const col=mbColor(all13[0].suit);
  if(all13.every(c=>mbColor(c.suit)===col)) return MB_SP.dongmau;
  if(flags&&flags.has3F) return MB_SP.bathung;
  if(flags&&flags.has3S) return MB_SP.basanh;
  const cnt={}; all13.forEach(c=>{ const r=mbRank(c); cnt[r]=(cnt[r]||0)+1; });
  const cv=Object.values(cnt).sort((a,b)=>b-a);
  if(cv.length===6 && cv[0]===3 && cv.slice(1).every(v=>v===2)) return MB_SP.nam1sam;
  const maxPairs=Object.values(cnt).reduce((a,v)=>a+Math.floor(v/2),0);
  if(maxPairs>=6) return MB_SP.saudoi;
  return null;
}

/* ---------- Tính điểm cả bàn (2–4 người) ---------- */
// Thưởng khi THẮNG 1 chi bằng bài mạnh (cộng ngoài +1 cơ bản): Tứ Quý & Thùng Phá Sảnh ăn đậm.
const MB_CHI_BONUS={6:1, 7:4, 8:6};   // 6 Cù lũ +1 · 7 Tứ quý +4 · 8 Thùng phá sảnh +6
// Điểm A lấy của B ở 1 chi = (1 + thưởng của bài THẮNG). Dương nếu A thắng.
function mbChiPoint(A,B){
  const c=mbCmp(A,B); const win=c>0?A:B; const base=1+(MB_CHI_BONUS[win.cat]||0);
  return c>0? base : -base;
}
// arrs[p] = {ef,em,eb,foul,special}. Trả mảng điểm (tổng đại số) theo số người thực tế.
function mbScoreAll(arrs){
  const n=arrs.length, pts=new Array(n).fill(0);
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){
    const A=arrs[i], B=arrs[j], si=A.special, sj=B.special;
    let di=0;                                                    // điểm i lấy của j
    if(si||sj){
      if(si&&sj) di = si.rank>sj.rank? si.pts : sj.rank>si.rank? -sj.pts : 0;
      else if(si) di=si.pts; else di=-sj.pts;
    }else if(A.foul&&B.foul){ di=0; }
    else if(A.foul){ di=-3; }
    else if(B.foul){ di=3; }
    else{
      const pb=mbChiPoint(A.eb,B.eb), pm=mbChiPoint(A.em,B.em), pf=mbChiPoint(A.ef,B.ef);
      const sum=pb+pm+pf;
      // Sập Hầm: thắng/thua CẢ 3 chi -> nhân đôi tổng (gồm cả thưởng)
      const scoop = (pb>0&&pm>0&&pf>0) || (pb<0&&pm<0&&pf<0);
      di = scoop ? sum*2 : sum;
    }
    pts[i]+=di; pts[j]-=di;
  }
  return pts;
}

/* =========================================================================
   MÀN CHƠI
   ========================================================================= */
function mbBuild(){
  if(mbBuilt) return;
  const app=document.createElement('div'); app.id='mbApp'; app.className='mb-screen'; app.style.display='none';
  app.innerHTML=`
    <div class="mb-top">
      <button class="mb-back" id="mbBack" type="button" aria-label="Về sảnh">←</button>
      <div class="mb-title">🀄 Mậu Binh</div>
      <button class="mb-help" id="mbHelp" type="button" aria-label="Luật chơi">?</button>
      <button class="mb-help" id="mbProfBtn" type="button" aria-label="Hồ sơ">👤</button>
      <button class="mb-help" id="mbSfx" type="button" aria-label="Bật/tắt âm thanh"></button>
      <span class="mb-bet" id="mbBet"></span>
      <span class="mb-coin"><span aria-hidden="true">🪙</span> <b id="mbCoin">--</b></span>
    </div>
    <div class="mb-oppo" id="mbOppo">
      ${[1,2,3].map(p=>`<div class="mb-opp"><span class="mb-opp-ava">${MB_BOTS[p].emoji}</span>
        <span class="mb-opp-col"><b>${MB_BOTS[p].name}</b><small id="mbOppS${p}">Đang binh…</small></span></div>`).join('')}
    </div>
    <div class="mb-board" id="mbBoard">
      <div class="mb-row" data-slot="front">
        <div class="mb-rowhead"><span class="mb-rowname">Chi Đầu</span><span class="mb-rowcap">0/3</span><span class="mb-roweval"></span></div>
        <div class="mb-cards" data-slot="front"></div>
      </div>
      <div class="mb-row" data-slot="mid">
        <div class="mb-rowhead"><span class="mb-rowname">Chi Giữa</span><span class="mb-rowcap">0/5</span><span class="mb-roweval"></span></div>
        <div class="mb-cards" data-slot="mid"></div>
      </div>
      <div class="mb-row" data-slot="back">
        <div class="mb-rowhead"><span class="mb-rowname">Chi Cuối</span><span class="mb-rowcap">0/5</span><span class="mb-roweval"></span></div>
        <div class="mb-cards" data-slot="back"></div>
      </div>
    </div>
    <div class="mb-foul" id="mbFoul"></div>
    <div class="mb-tray-wrap"><div class="mb-tray" id="mbTray" data-slot="tray"></div></div>
    <div class="mb-actions">
      <button class="btn ghost sm" id="mbAuto" type="button">✨ Tối ưu</button>
      <button class="btn ghost sm" id="mbClear" type="button">↺ Xếp tay</button>
      <button class="btn" id="mbGo" type="button">Binh xong 🎴</button>
    </div>
    <div class="mb-hint"><b>Kéo</b> lá từ khay vào 3 chi (hoặc thả lên 1 lá để đổi chỗ) · bấm <b>✨ Tối ưu</b> nếu muốn máy xếp giúp.</div>
    <div class="mb-modal" id="mbResult" aria-hidden="true"></div>
    <div class="mb-modal" id="mbRules" aria-hidden="true"></div>
    <div class="mb-modal" id="mbProf" aria-hidden="true"></div>`;
  document.body.appendChild(app);
  mbBuilt=true;

  $('mbBack').onclick=()=>leaveMauBinh();
  $('mbHelp').onclick=mbShowRules;
  $('mbProfBtn').onclick=mbShowProfile;
  const setSfxIc=()=>{ const b=$('mbSfx'); if(b) b.textContent=(typeof sfxOn==='function'&&sfxOn())?'🔊':'🔇'; };
  setSfxIc();
  $('mbSfx').onclick=()=>{ if(typeof sfxToggle==='function') sfxToggle(); setSfxIc(); };
  $('mbAuto').onclick=mbAutoArrange;
  $('mbClear').onclick=mbClearArrange;
  $('mbGo').onclick=mbConfirm;
  // Chạm lá / chạm chi (giữ lại cho cách chạm; KÉO-THẢ xử lý ở mbInitDrag)
  app.addEventListener('click',e=>{
    if(mbSuppressClick) return;                                       // vừa kéo-thả xong -> bỏ qua click ảo
    if($('mbResult').getAttribute('aria-hidden')==='false') return;
    if($('mbRules').getAttribute('aria-hidden')==='false') return;
    if($('mbProf').getAttribute('aria-hidden')==='false') return;
    const cardEl=e.target.closest('.card');
    if(cardEl && cardEl.closest('#mbBoard, #mbTray')){
      const id=+cardEl.dataset.id;
      if(mbState.sel==null){ mbState.sel=id; mbRenderMe(); if(typeof sfx==='function') sfx('tap'); }  // chọn lá đầu
      else if(mbState.sel===id){ mbState.sel=null; mbRenderMe(); }    // chạm lại -> bỏ chọn
      else { mbSwap(mbState.sel, id); mbState.sel=null; }             // chạm lá 2 -> ĐỔI CHỖ 2 lá
      return;
    }
    const zoneEl=e.target.closest('[data-slot]');
    if(zoneEl && mbState.sel!=null){ mbMove(mbState.sel, zoneEl.dataset.slot); }
  });
  mbInitDrag(app);
}

/* ---------- Kéo-thả lá bài (nhanh hơn chạm từng lá) — pointer events, chạy cả mobile & PC ---------- */
function mbInitDrag(app){
  let d=null;
  const rowEls=()=>['front','mid','back'].map(s=>$('mbBoard').querySelector(`.mb-row[data-slot="${s}"]`));
  const clearHints=()=>{ rowEls().forEach(r=>r&&r.classList.remove('mb-can','mb-over')); const tw=$('mbTray'); if(tw) tw.classList.remove('mb-over'); };
  const zoneUnder=(x,y)=>{ const el=document.elementFromPoint(x,y); return el&&el.closest('[data-slot]'); };
  const cardUnder=(x,y)=>{ const el=document.elementFromPoint(x,y); const c=el&&el.closest('.card'); return (c&&c.closest('#mbBoard,#mbTray'))?c:null; };
  app.addEventListener('pointerdown',e=>{
    if(e.button&&e.button!==0) return;
    if($('mbResult').getAttribute('aria-hidden')==='false') return;
    if($('mbRules').getAttribute('aria-hidden')==='false') return;
    if($('mbProf').getAttribute('aria-hidden')==='false') return;
    const card=e.target.closest('.card'); if(!card||!card.closest('#mbBoard,#mbTray')) return;
    const fz=mbFindZone(+card.dataset.id); if(!fz) return;
    d={ id:+card.dataset.id, fromZone:fz.z, el:card, x0:e.clientX, y0:e.clientY, moved:false, clone:null, offx:0, offy:0 };
  });
  app.addEventListener('pointermove',e=>{
    if(!d) return;
    if(!d.moved){
      if(Math.hypot(e.clientX-d.x0, e.clientY-d.y0)<7) return;        // chưa quá ngưỡng -> vẫn là "chạm"
      d.moved=true;
      try{ app.setPointerCapture(e.pointerId); }catch(_){}
      const r=d.el.getBoundingClientRect();
      const cl=d.el.cloneNode(true); cl.classList.add('mb-drag'); cl.classList.remove('sel');
      cl.style.width=r.width+'px'; cl.style.height=r.height+'px';
      document.body.appendChild(cl);
      d.clone=cl; d.offx=d.x0-r.left; d.offy=d.y0-r.top;
      d.el.classList.add('mb-ghost');
      rowEls().forEach(r2=>{ const slot=r2.dataset.slot; r2.classList.toggle('mb-can', slot!==d.fromZone && mbState.zones[slot].length<MB_CAP[slot]); });
      if(typeof sfx==='function') sfx('tap');
    }
    d.clone.style.left=(e.clientX-d.offx)+'px'; d.clone.style.top=(e.clientY-d.offy)+'px';
    rowEls().forEach(r=>r&&r.classList.remove('mb-over')); const tw=$('mbTray'); if(tw) tw.classList.remove('mb-over');
    const z=zoneUnder(e.clientX,e.clientY);
    if(z){ if(z.dataset.slot==='tray'){ tw&&tw.classList.add('mb-over'); }
      else { const row=$('mbBoard').querySelector(`.mb-row[data-slot="${z.dataset.slot}"]`); row&&row.classList.add('mb-over'); } }
  });
  const finish=e=>{
    if(!d) return;
    if(d.moved){
      if(d.clone) d.clone.remove();
      const tgt=cardUnder(e.clientX,e.clientY), z=zoneUnder(e.clientX,e.clientY);
      if(tgt && +tgt.dataset.id!==d.id){ mbSwap(d.id, +tgt.dataset.id); }        // thả lên 1 lá -> đổi chỗ
      else if(z && z.dataset.slot!==d.fromZone){ mbMove(d.id, z.dataset.slot); } // thả vào chi/khay khác -> chuyển
      else { mbState.sel=null; mbRenderMe(); }                                   // thả chỗ cũ -> huỷ
      clearHints();
      mbSuppressClick=true; setTimeout(()=>{ mbSuppressClick=false; },60);
    }
    d=null;
  };
  app.addEventListener('pointerup',finish);
  app.addEventListener('pointercancel',()=>{ if(!d) return; if(d.clone) d.clone.remove();
    if(d.el) d.el.classList.remove('mb-ghost'); clearHints(); mbState.sel=null; if(mbState) mbRenderMe(); d=null; });
}
/* ---------- Vào / ra màn ---------- */
function showMauBinh(){
  mbMode='solo';
  mbBuild(); hideOverlay();
  const cb=$('coinBar'); if(cb) cb.style.display='none';
  $('mbApp').style.display='flex';
  mbActive=true;
  mbApplyCosmetics();
  mbDeal();
  if(typeof announceGameUpdate==='function') announceGameUpdate('maubinh');   // bảng "Có gì mới" của Mậu Binh
}
function leaveMauBinh(silent){
  mbActive=false;
  mbRevealToken++;
  mbMode='solo';
  if($('mbApp')) $('mbApp').style.display='none';
  const cb=$('coinBar'); if(cb&&profile) cb.style.display='inline-flex';
  if(!silent) showGameSelect();
}

/* ---------- Chia bài ván mới ---------- */
function mbDeal(){
  const deck=newDeck();
  const hands=[[],[],[],[]];
  for(let i=0;i<52;i++) hands[i%4].push(deck[i]);
  // Chia xong để nguyên bài ở KHAY (xếp giảm dần cho dễ nhìn) — người chơi tự kéo-thả vào 3 chi,
  // hoặc bấm ✨ Tối ưu để máy xếp giúp. KHÔNG tự sắp sẵn nữa.
  const tray=hands[0].slice().sort((a,b)=> mbRank(b)-mbRank(a) || b.suit-a.suit);
  mbState={ bet:gameBet, hands, zones:{tray, front:[], mid:[], back:[]},
    sel:null, bots:[null,null,null,null], done:false };
  $('mbResult').setAttribute('aria-hidden','true');
  $('mbBet').textContent=`Mệnh giá ${gameBet} 🪙/điểm`;
  $('mbCoin').textContent = profile&&profile.coins!=null? fmtCoin(profile.coins) : '--';
  for(let p=1;p<=3;p++){ const s=$('mbOppS'+p); if(s){ s.textContent='Đang binh…'; s.className=''; }
    const opp=s&&s.closest('.mb-opp'); if(opp) opp.classList.remove('win'); }
  mbRenderMe();
  // Tính sẵn cách binh của 3 máy trong nền để lật bài mượt
  setTimeout(()=>{ for(let p=1;p<=3;p++) if(mbActive&&mbState&&!mbState.bots[p]) mbState.bots[p]=mbBotPlan(hands[p]); }, 30);
}
// Máy: ưu tiên báo Ba Thùng/Ba Sảnh nếu có, còn lại xếp mạnh nhất hợp lệ.
function mbBotPlan(hand){
  const best=mbBestArrange(hand);
  let use=best, flags={};
  if(best.f3){ use=best.f3; flags.has3F=true; }
  else if(best.s3){ use=best.s3; flags.has3S=true; }
  const front=use.front, mid=use.mid, back=use.back;
  const ef=mbEval(front), em=mbEval(mid), eb=mbEval(back);
  return { front, mid, back, ef, em, eb, foul:false, special:mbSpecial(hand,flags) };
}

/* ---------- Di chuyển lá giữa các vùng ---------- */
function mbFindZone(id){
  for(const z of ['tray','front','mid','back']){
    const i=mbState.zones[z].findIndex(c=>cid(c)===id);
    if(i>=0) return {z,i,card:mbState.zones[z][i]};
  }
  return null;
}
function mbMove(id,target){
  const cur=mbFindZone(id); if(!cur) return;
  if(cur.z===target){ mbState.sel=null; mbRenderMe(); return; }
  if(target!=='tray' && mbState.zones[target].length>=MB_CAP[target]){ toast('Chi này đã đủ lá — chạm 1 lá trong chi đó để ĐỔI CHỖ'); return; }
  mbState.zones[cur.z].splice(cur.i,1);
  mbState.zones[target].push(cur.card);
  mbState.sel=null;
  mbRenderMe();
  if(typeof sfx==='function') sfx('place');
}
// Đổi chỗ 2 lá (cùng chi hoặc khác chi) — giữ nguyên số lá mỗi chi, chỉnh binh cực nhanh.
function mbSwap(idA,idB){
  const a=mbFindZone(idA), b=mbFindZone(idB); if(!a||!b) return;
  mbState.zones[a.z][a.i]=b.card;
  mbState.zones[b.z][b.i]=a.card;
  mbState.sel=null;
  mbRenderMe();
  if(typeof sfx==='function') sfx('swap');
}
function mbAutoArrange(){
  const all=[...mbState.zones.tray,...mbState.zones.front,...mbState.zones.mid,...mbState.zones.back];
  const a=mbBestArrange(all);
  mbState.zones={ tray:[], front:a.front.slice(), mid:a.mid.slice(), back:a.back.slice() };
  mbState.sel=null; mbRenderMe();
  if(typeof sfx==='function') sfx('deal');
  toast('Đã xếp tự động — chỉnh lại nếu muốn ✨');
}
function mbClearArrange(){
  const all=[...mbState.zones.tray,...mbState.zones.front,...mbState.zones.mid,...mbState.zones.back];
  all.sort((a,b)=> mbRank(b)-mbRank(a) || b.suit-a.suit);
  mbState.zones={ tray:all, front:[], mid:[], back:[] };
  mbState.sel=null; mbRenderMe();
}

/* ---------- Vẽ bài của Bạn ---------- */
function mbRenderMe(){
  const z=mbState.zones;
  // Khay
  $('mbTray').innerHTML = z.tray.map(c=>cardHTML(c, cid(c)===mbState.sel?'sel':'')).join('')
    || '<span class="mb-empty">— Đã đặt hết lá vào các chi —</span>';
  // Lá đang chọn nằm ở chi nào (để không tự tô "đặt được" chính chi đó)
  const selZone = mbState.sel!=null ? (mbFindZone(mbState.sel)||{}).z : null;
  // 3 chi
  ['front','mid','back'].forEach(slot=>{
    const wrap=$('mbBoard').querySelector(`.mb-cards[data-slot="${slot}"]`);
    wrap.innerHTML=z[slot].map(c=>cardHTML(c, cid(c)===mbState.sel?'sel':'')).join('');
    const row=$('mbBoard').querySelector(`.mb-row[data-slot="${slot}"]`);
    row.querySelector('.mb-rowcap').textContent=`${z[slot].length}/${MB_CAP[slot]}`;
    const evalEl=row.querySelector('.mb-roweval');
    evalEl.textContent = z[slot].length===MB_CAP[slot] ? mbEval(z[slot]).name : '';
    // Gợi ý chi CÒN CHỖ để đặt khi đang chọn 1 lá (giúp xếp tay dễ nhắm)
    row.classList.toggle('mb-can', mbState.sel!=null && slot!==selZone && z[slot].length<MB_CAP[slot]);
  });
  mbUpdateFoul();
}
function mbUpdateFoul(){
  const z=mbState.zones, full = z.front.length===3&&z.mid.length===5&&z.back.length===5;
  const foulEl=$('mbFoul'), go=$('mbGo');
  ['front','mid','back'].forEach(s=>$('mbBoard').querySelector(`.mb-row[data-slot="${s}"]`).classList.remove('bad'));
  if(!full){ foulEl.textContent=''; foulEl.className='mb-foul'; go.disabled=true; return; }
  const ef=mbEval(z.front), em=mbEval(z.mid), eb=mbEval(z.back);
  if(mbFoul(ef,em,eb)){
    foulEl.textContent='⚠️ Binh lủng! Chi dưới phải mạnh hơn (Cuối ≥ Giữa ≥ Đầu).';
    foulEl.className='mb-foul bad'; go.disabled=true;
    if(mbCmp(eb,em)<0){ $('mbBoard').querySelector('.mb-row[data-slot="back"]').classList.add('bad'); $('mbBoard').querySelector('.mb-row[data-slot="mid"]').classList.add('bad'); }
    if(mbCmp(em,ef)<0){ $('mbBoard').querySelector('.mb-row[data-slot="mid"]').classList.add('bad'); $('mbBoard').querySelector('.mb-row[data-slot="front"]').classList.add('bad'); }
  }else{
    const sp=mbSpecial([...z.front,...z.mid,...z.back], {
      has3F: eb.cat===5&&em.cat===5&&mb3Flush(z.front),
      has3S: eb.cat===4&&em.cat===4&&mb3Straight(z.front) });
    foulEl.textContent = sp? `🌟 Bài đẹp: ${sp.name} — báo thắng trắng!` : '✅ Binh hợp lệ — sẵn sàng!';
    foulEl.className='mb-foul ok'; go.disabled=false;
  }
}

/* ---------- Binh xong → lật bài, tính điểm ---------- */
function mbConfirm(){
  const z=mbState.zones;
  if(z.front.length!==3||z.mid.length!==5||z.back.length!==5){ toast('Chưa đặt đủ lá vào 3 chi'); return; }
  const ef=mbEval(z.front), em=mbEval(z.mid), eb=mbEval(z.back);
  if(mbFoul(ef,em,eb)){ toast('Binh lủng — sửa lại đi nào'); return; }
  if(typeof sfx==='function') sfx('confirm');
  // Bảo đảm 3 máy đã có kế hoạch
  for(let p=1;p<=3;p++) if(!mbState.bots[p]) mbState.bots[p]=mbBotPlan(mbState.hands[p]);
  const me={ front:z.front, mid:z.mid, back:z.back, ef, em, eb, foul:false,
    special:mbSpecial([...z.front,...z.mid,...z.back], {
      has3F: eb.cat===5&&em.cat===5&&mb3Flush(z.front),
      has3S: eb.cat===4&&em.cat===4&&mb3Straight(z.front) }) };
  const arrs=[me, mbState.bots[1], mbState.bots[2], mbState.bots[3]];
  const pts=mbScoreAll(arrs);
  mbState.done=true;
  // Ăn xu theo điểm ghế 0
  const gameId='mb-'+Date.now()+'-'+Math.floor(Math.random()*1e6);
  const delta=pts[0]*mbState.bet;
  addCoins(delta, gameId, delta>0, {game:'maubinh', bet:mbState.bet});   // ELO co giãn theo mức cược + nhiệm vụ
  // 3 máy cũng tính ELO chung: ai ăn điểm (>0) thì +ELO, thua thì −ELO — leo BXH như tài khoản thật.
  if(typeof updateBotElo==='function') for(let p=1;p<=3;p++){
    const b=MB_BOTS[p]; updateBotElo(b.key, b.name, b.emoji, pts[p]>0, mbState.bet);
  }
  mbApplyProgress(gameId, mbGameEvents(me, arrs, pts, delta));   // thống kê + thành tựu + mở cosmetic
  mbShowResult(arrs, pts, delta);
}

/* ---------- Bảng kết quả ---------- */
let mbRevealToken=0;   // huỷ hiệu ứng cũ khi qua ván mới / thoát
function mbShowResult(arrs, pts, delta){
  const tok=++mbRevealToken;
  const names=['Bạn', MB_BOTS[1].name, MB_BOTS[2].name, MB_BOTS[3].name];
  const avas=['🙂', MB_BOTS[1].emoji, MB_BOTS[2].emoji, MB_BOTS[3].emoji];
  const PGAP=680, CDLY=30, BASE=160;              // nhịp lật: mỗi người 0.68s, mỗi lá 30ms
  const rows=arrs.map((a,p)=>{
    const pStart=BASE + p*PGAP; let k=0;           // k = thứ tự lá trong người này (lật lần lượt)
    const chi=(cards,ev,cd)=>{
      const cs=cards.map(c=>cardHTML(c,'mb-mini mb-flip', pStart + (k++)*CDLY)).join('');
      return `<div class="mb-rescol"><span class="mb-reseval mb-fade" style="--d:${cd}ms">${ev.name}</span><div class="mb-rescards">${cs}</div></div>`;
    };
    const chis=chi(a.back,a.eb,pStart+180)+chi(a.mid,a.em,pStart+330)+chi(a.front,a.ef,pStart+470);
    const sp=a.special?`<span class="mb-badge mb-pop" style="--d:${pStart+500}ms">${a.special.name}</span>`:'';
    const pc=pts[p]>0?'pos':pts[p]<0?'neg':'zero';
    const fr=p===0?` data-frame="${mbCosGet('frame')}"`:'';                 // khung avatar của Bạn
    const ti=p===0?mbTitleChip():'';                                        // danh hiệu đang đeo
    return `<div class="mb-resrow${p===0?' me':''} mb-fade" style="--d:${pStart}ms">
      <div class="mb-reshead"><span class="mb-resava"${fr}>${avas[p]}</span><b>${esc(names[p])}</b>${ti}${sp}</div>
      <div class="mb-reschis">${chis}</div>
      <span class="mb-respts ${pc} mb-pop" style="--d:${pStart+500}ms">${pts[p]>0?'+':''}${pts[p]}</span>
    </div>`;
  }).join('');
  const endT=BASE + 4*PGAP;                        // lúc tất cả đã lật xong -> hiện tổng kết
  const dCls=delta>0?'pos':delta<0?'neg':'zero';
  const dTxt=delta>0?`Bạn ăn +${fmtCoin(delta)} 🪙`:delta<0?`Bạn chung ${fmtCoin(-delta)} 🪙`:'Hòa vốn';
  $('mbResult').innerHTML=`
    <div class="mb-modal-card">
      <div class="mb-modal-h">🏁 Kết quả ván</div>
      <div class="mb-reslist">${rows}</div>
      <div class="mb-modal-sum ${dCls} mb-pop" style="--d:${endT}ms">${dTxt}</div>
      <div class="mb-modal-act mb-fade" style="--d:${endT}ms">
        <button class="btn ghost sm" id="mbLeave" type="button">← Về sảnh</button>
        <button class="btn" id="mbAgain" type="button">Ván mới 🎴</button>
      </div>
    </div>`;
  $('mbResult').setAttribute('aria-hidden','false');
  $('mbCoin').textContent = profile&&profile.coins!=null? fmtCoin(profile.coins) : '--';
  $('mbAgain').onclick=()=>{ mbRevealToken++; $('mbResult').setAttribute('aria-hidden','true'); mbDeal(); };
  $('mbLeave').onclick=()=>{ mbRevealToken++; leaveMauBinh(); };
  // Tiếng lật bài theo nhịp mỗi người (0..3)
  for(let p=0;p<4;p++) setTimeout(()=>{ if(tok===mbRevealToken && typeof sfx==='function') sfx('flip'); }, BASE + p*PGAP);
  // Cập nhật dải đối thủ theo nhịp lật (mỗi người tới lượt mới hiện điểm)
  const topPts=Math.max(...pts);
  for(let p=1;p<=3;p++){
    setTimeout(()=>{ if(tok!==mbRevealToken) return;
      const s=$('mbOppS'+p); if(!s) return;
      s.textContent=(pts[p]>0?'+':'')+pts[p]+' điểm'; s.className=pts[p]>0?'pos':pts[p]<0?'neg':'';
      const opp=s.closest('.mb-opp'); if(opp) opp.classList.toggle('win', pts[p]===topPts && topPts>0);
    }, BASE + p*PGAP + 520);
  }
  // Ăn mừng khi tất cả đã lật xong (dùng profile.streak — lúc này giao dịch xu đã xong)
  setTimeout(()=>{ if(tok!==mbRevealToken) return;
    if(delta>0){ mbWinCelebrate(delta); }
    else if(delta<0){ if(typeof sfx==='function') sfx('lose'); if(typeof flash==='function') flash('Thua rồi 😅'); }
  }, endT+60);
}
/* ---------- Luật chơi (nút ?) ---------- */
function mbShowRules(){
  const rank='Mậu thầu → Đôi → Thú (2 đôi) → Sám → Sảnh → Thùng → Cù lũ → Tứ quý → Thùng phá sảnh';
  $('mbRules').innerHTML=`
    <div class="mb-modal-card mb-rules">
      <div class="mb-modal-h">📖 Luật Mậu Binh</div>
      <div class="mb-rules-body">
        <p><b>Mục tiêu:</b> chia 13 lá thành <b>3 chi</b> — Chi Đầu (3 lá) · Chi Giữa (5 lá) · Chi Cuối (5 lá).</p>
        <p><b>Luật xếp:</b> sức mạnh phải <b>tăng dần xuống dưới</b>: Chi Cuối ≥ Chi Giữa ≥ Chi Đầu. Xếp sai = <span class="mb-r-bad">Binh Lủng</span>, thua cả 3 chi.</p>
        <p><b>Thứ hạng bài (yếu → mạnh):</b><br>${rank}.</p>
        <p><b>Tính điểm:</b> so từng chi với từng đối thủ — thắng chi <b>+1</b>, thua <b>−1</b>. Thắng <b>cả 3 chi</b> (Sập Hầm) ăn <b>gấp đôi</b>.</p>
        <p><b>Thưởng bài mạnh</b> (khi thắng chi): Cù lũ <b>+1</b> · <b>Tứ Quý +4</b> · <b>Thùng Phá Sảnh +6</b>.</p>
        <p><b>Bộ Mậu Binh</b> (báo — thắng trắng cả bàn): Sảnh Rồng 🐉 · Đồng Màu · Ba Thùng · Ba Sảnh · 5 Đôi 1 Sám · Sáu Đôi.</p>
        <p><b>Ăn xu:</b> tổng điểm × mệnh giá mỗi ván.</p>
        <p class="mb-r-tip">💡 Bấm <b>✨ Xếp tự động</b> để máy xếp hộ, rồi chỉnh lại nếu muốn.</p>
      </div>
      <div class="mb-modal-act"><button class="btn" id="mbRulesClose" type="button">Hiểu rồi 👍</button></div>
    </div>`;
  $('mbRules').setAttribute('aria-hidden','false');
  $('mbRulesClose').onclick=()=>$('mbRules').setAttribute('aria-hidden','true');
  $('mbRules').onclick=e=>{ if(e.target===$('mbRules')) $('mbRules').setAttribute('aria-hidden','true'); };
}

/* =========================================================================
   CHIỀU SÂU: Thống kê · Thành tựu/Danh hiệu · Cosmetic (khung/bàn/hiệu ứng)
   Tất cả lưu trong users/<uid> (không cần thêm node/luật Firebase).
   ========================================================================= */
// --- Thành tựu (mở khoá theo cột mốc; vài cái tặng DANH HIỆU + mở COSMETIC) ---
const MB_ACHS=[
  {id:'first_win', icon:'🎴', name:'Mở Hàng',       desc:'Thắng ván Mậu Binh đầu tiên', cond:s=>s.w>=1,   reward:1000},
  {id:'win_10',    icon:'🃏', name:'Quen Tay',      desc:'Thắng 10 ván',                cond:s=>s.w>=10,  reward:3000},
  {id:'win_50',    icon:'♠️', name:'Con Bạc',       desc:'Thắng 50 ván',                cond:s=>s.w>=50,  reward:8000,  title:'Con Bạc'},
  {id:'win_200',   icon:'👑', name:'Huyền Thoại',    desc:'Thắng 200 ván',               cond:s=>s.w>=200, reward:30000, title:'Huyền Thoại Binh', cos:'frame_rainbow'},
  {id:'games_100', icon:'🎯', name:'Chuyên Cần',    desc:'Chơi 100 ván',                cond:s=>s.g>=100, reward:5000},
  {id:'scoop_1',   icon:'💥', name:'Sập Hầm!',      desc:'Thắng trọn 3 chi 1 lần',      cond:s=>s.scoopWin>=1,  reward:2000},
  {id:'scoop_20',  icon:'⛏️', name:'Thợ Đào Hầm',   desc:'Sập Hầm 20 lần',              cond:s=>s.scoopWin>=20, reward:12000, title:'Thợ Đào Hầm', cos:'frame_fire'},
  {id:'special_1', icon:'🌟', name:'Báo Nhà',       desc:'Binh được 1 bộ Mậu Binh (báo)', cond:s=>s.special>=1,  reward:3000},
  {id:'special_10',icon:'🀄', name:'Trạng Bài',     desc:'Báo bài 10 lần',              cond:s=>s.special>=10, reward:15000, title:'Trạng Bài', cos:'table_royal'},
  {id:'tuquy_1',   icon:'♣️', name:'Tứ Quý Lâu',    desc:'Binh có Tứ Quý',              cond:s=>s.tuquy>=1,  reward:2000},
  {id:'tps_1',     icon:'🐉', name:'Rồng Cuộn',     desc:'Binh có Thùng Phá Sảnh',      cond:s=>s.tps>=1,    reward:5000,  title:'Rồng Cuộn', cos:'winfx_dragon'},
  {id:'streak_5',  icon:'🔥', name:'Bất Bại',       desc:'Thắng liền 5 ván',            cond:s=>s.streakBest>=5, reward:6000, title:'Bất Bại'},
  {id:'highroller',icon:'💰', name:'Đại Gia',       desc:'Thắng bàn cược ≥ 50 🪙/lá',    cond:s=>s.betWinMax>=50, reward:10000, title:'Đại Gia', cos:'frame_gold'},
  {id:'rich',      icon:'🤑', name:'Tay To',        desc:'Tổng ăn ≥ 200.000 🪙',        cond:s=>s.coinsWon>=200000, reward:20000, cos:'table_emerald'},
];
// --- Cosmetic (khung avatar / nền bàn / hiệu ứng thắng). def/price 0 = có sẵn; ach = mở theo thành tựu ---
const MB_COS=[
  {id:'frame_none',   type:'frame', name:'Mặc định',      icon:'⚪', price:0, def:true},
  {id:'frame_silver', type:'frame', name:'Khung Bạc',     icon:'⬜', price:2000},
  {id:'frame_neon',   type:'frame', name:'Khung Neon',    icon:'🟣', price:8000},
  {id:'frame_gold',   type:'frame', name:'Khung Vàng',    icon:'🟡', ach:'highroller'},
  {id:'frame_fire',   type:'frame', name:'Khung Lửa',     icon:'🔥', ach:'scoop_20'},
  {id:'frame_rainbow',type:'frame', name:'Khung Cầu Vồng',icon:'🌈', ach:'win_200'},
  {id:'table_classic',type:'table', name:'Bàn Cổ Điển',   icon:'🟩', price:0, def:true},
  {id:'table_midnight',type:'table',name:'Bàn Nửa Đêm',   icon:'🌌', price:5000},
  {id:'table_sakura', type:'table', name:'Bàn Anh Đào',   icon:'🌸', price:9000},
  {id:'table_emerald',type:'table', name:'Bàn Ngọc Lục',  icon:'💚', ach:'rich'},
  {id:'table_royal',  type:'table', name:'Bàn Hoàng Gia', icon:'👑', ach:'special_10'},
  {id:'winfx_confetti',type:'winfx',name:'Kim Tuyến',     icon:'🎉', price:0, def:true},
  {id:'winfx_coins',  type:'winfx', name:'Mưa Tiền',      icon:'🪙', price:6000},
  {id:'winfx_fireworks',type:'winfx',name:'Pháo Hoa',     icon:'🎆', price:12000},
  {id:'winfx_dragon', type:'winfx', name:'Rồng Bay',      icon:'🐉', ach:'tps_1'},
];
const MB_COS_GROUPS=[['frame','Khung avatar'],['table','Nền bàn'],['winfx','Hiệu ứng thắng']];

function mbBlankStats(){ return {g:0,w:0,l:0,t:0,points:0,best:0,worst:0,scoopWin:0,scoopLoss:0,special:0,tuquy:0,tps:0,culu:0,coinsWon:0,streakBest:0,betWinMax:0,lastGame:''}; }
function mbStatsOf(){ return Object.assign(mbBlankStats(), (profile&&profile.mbStats)||{}); }
function mbDefCos(type){ return type==='frame'?'frame_none':type==='table'?'table_classic':'winfx_confetti'; }
function mbCosOwned(cos){
  if(!cos) return false;
  if(cos.def || cos.price===0) return true;
  if(cos.ach && profile&&profile.achievements&&profile.achievements[cos.ach]) return true;
  if(profile&&profile.mbOwned&&profile.mbOwned[cos.id]) return true;
  return false;
}
function mbCosGet(type){
  const eq=(profile&&profile.mbCos&&profile.mbCos[type])||mbDefCos(type);
  const c=MB_COS.find(x=>x.id===eq);
  return (c&&mbCosOwned(c))?eq:mbDefCos(type);
}
function mbActiveTitle(){
  const tid=profile&&profile.mbTitle; if(!tid) return null;
  const a=MB_ACHS.find(x=>x.id===tid&&x.title);
  return (a&&profile.achievements&&profile.achievements[tid])?a:null;
}
function mbTitleChip(){ const a=mbActiveTitle(); return a?`<span class="mb-title-chip">${a.icon} ${esc(a.title)}</span>`:''; }
function mbApplyCosmetics(){ const app=$('mbApp'); if(!app) return; app.dataset.table=mbCosGet('table'); app.dataset.frame=mbCosGet('frame'); }

// --- Rút "sự kiện" 1 ván để cộng dồn thống kê ---
function mbGameEvents(me, arrs, pts, delta){
  const ev={won:pts[0]>0, pts0:pts[0], bet:mbState.bet, coinsWon:Math.max(0,delta),
    scoopWin:0, scoopLoss:0, special:me.special?1:0, tuquy:0, tps:0, culu:0};
  [me.ef,me.em,me.eb].forEach(e=>{ if(e.cat===7) ev.tuquy++; else if(e.cat===8) ev.tps++; else if(e.cat===6) ev.culu++; });
  for(let p=1;p<=3;p++){
    const b=arrs[p]; if(!b||me.special||b.special) continue;            // báo bài -> không tính sập hầm chi
    const pb=mbChiPoint(me.eb,b.eb), pm=mbChiPoint(me.em,b.em), pf=mbChiPoint(me.ef,b.ef);
    if(pb>0&&pm>0&&pf>0) ev.scoopWin++; else if(pb<0&&pm<0&&pf<0) ev.scoopLoss++;
  }
  return ev;
}
// --- Ghi thống kê + tự mở thành tựu (1 giao dịch, chống trùng theo gameId) ---
function mbApplyProgress(gameId, ev){
  if(!auth||!auth.currentUser||!db) return;
  const preAch=Object.assign({}, (profile&&profile.achievements)||{});
  const newly=[];
  db.ref('users/'+auth.currentUser.uid).transaction(u=>{
    if(u===null) return u;
    const s=Object.assign(mbBlankStats(), u.mbStats||{});
    if(s.lastGame===gameId) return;                                     // ván này đã ghi -> bỏ
    s.g++; if(ev.won) s.w++; else if(ev.pts0<0) s.l++; else s.t++;
    s.points+=ev.pts0; s.best=Math.max(s.best,ev.pts0); s.worst=Math.min(s.worst,ev.pts0);
    s.scoopWin+=ev.scoopWin; s.scoopLoss+=ev.scoopLoss; s.special+=ev.special;
    s.tuquy+=ev.tuquy; s.tps+=ev.tps; s.culu+=ev.culu; s.coinsWon+=ev.coinsWon;
    s.streakBest=Math.max(s.streakBest, u.streak||0);
    if(ev.won) s.betWinMax=Math.max(s.betWinMax, ev.bet);
    s.lastGame=gameId; u.mbStats=s;
    u.achievements=u.achievements||{};
    for(const a of MB_ACHS){ if(!u.achievements[a.id] && a.cond(s)){ u.achievements[a.id]=Date.now(); u.coins=(u.coins||0)+(a.reward||0); } }
    return u;
  }).then(res=>{
    const v=res&&res.snapshot&&res.snapshot.val(); if(!res.committed||!v) return;
    for(const a of MB_ACHS) if(v.achievements&&v.achievements[a.id]&&!preAch[a.id]) newly.push(a);
    if(!newly.length) return;
    setTimeout(()=>{
      if(typeof flash==='function') flash('🏆 Thành tựu mới!');
      if(typeof sfx==='function') sfx('win');
      newly.forEach((a,i)=> setTimeout(()=>{ if(typeof toast==='function') toast(`${a.icon} ${a.name}${a.reward?` +${fmtCoin(a.reward)}🪙`:''}${a.title?` · danh hiệu "${a.title}"`:''}`); if(typeof sfx==='function') sfx('coin'); }, 400+i*1400));
    }, 1600);
  }).catch(()=>{});
}
// --- Hiệu ứng thắng theo cosmetic đang đeo ---
function mbWinCelebrate(delta){
  const fx=mbCosGet('winfx'), st=(profile&&profile.streak)||0;
  if(typeof sfx==='function'){ sfx('win'); setTimeout(()=>sfx('coin'),320); }
  const base=st>=2?`🔥 THẮNG CHUỖI x${st}!`:'THẮNG! 🎉';
  const boom=()=>{ if(typeof confetti==='function') confetti(); };
  if(fx==='winfx_fireworks'){ boom(); setTimeout(boom,240); setTimeout(boom,480); if(typeof flash==='function') flash('🎆 '+base); }
  else if(fx==='winfx_coins'){ boom(); if(typeof flash==='function') flash('🪙 '+base); }
  else if(fx==='winfx_dragon'){ boom(); setTimeout(boom,220); if(typeof flash==='function') flash('🐉 RỒNG BAY!'+(st>=2?` x${st}`:'')); }
  else { boom(); if(typeof flash==='function') flash(base); }
}

/* ---------- Màn Hồ sơ (3 tab) ---------- */
let mbProfTab='stats';
function mbShowProfile(){
  if(!profile){ if(typeof toast==='function') toast('Đăng nhập để xem hồ sơ'); return; }
  mbProfTab='stats';
  const t=(typeof eloTier==='function')?eloTier(profile.elo):{icon:'',name:'',color:'#888'};
  $('mbProf').innerHTML=`
    <div class="mb-modal-card mb-prof">
      <div class="mb-prof-top">
        <span class="mb-prof-ava" data-frame="${mbCosGet('frame')}">🙂</span>
        <div class="mb-prof-id">
          <b>${esc(myName||'Bạn')}</b> ${mbTitleChip()}
          <span class="rank-badge" style="--rk:${t.color}">${t.icon} ${t.name} · ${profile.elo||1000} ELO</span>
        </div>
        <button class="mb-help" id="mbProfX" type="button" aria-label="Đóng">✕</button>
      </div>
      <div class="mb-prof-tabs">
        <button class="mb-ptab sel" data-t="stats">📊 Thống kê</button>
        <button class="mb-ptab" data-t="ach">🏆 Thành tựu</button>
        <button class="mb-ptab" data-t="shop">🛍️ Cửa hàng</button>
      </div>
      <div class="mb-prof-body" id="mbProfBody"></div>
    </div>`;
  $('mbProf').setAttribute('aria-hidden','false');
  $('mbProfX').onclick=()=>$('mbProf').setAttribute('aria-hidden','true');
  $('mbProf').onclick=e=>{ if(e.target===$('mbProf')) $('mbProf').setAttribute('aria-hidden','true'); };
  $('mbProf').querySelectorAll('.mb-ptab').forEach(b=>b.onclick=()=>mbProfRender(b.dataset.t));
  mbProfRender('stats');
}
function mbProfRender(tab){
  mbProfTab=tab;
  $('mbProf').querySelectorAll('.mb-ptab').forEach(b=>b.classList.toggle('sel', b.dataset.t===tab));
  const body=$('mbProfBody'); if(!body) return;
  if(tab==='stats') body.innerHTML=mbStatsHTML();
  else if(tab==='ach') body.innerHTML=mbAchHTML();
  else body.innerHTML=mbShopHTML();
  mbProfWire(tab);
}
function mbStatsHTML(){
  const s=mbStatsOf(); const wr=s.g?Math.round(s.w/s.g*100):0;
  const cell=(lb,v,cls)=>`<div class="mb-stat ${cls||''}"><b>${v}</b><small>${lb}</small></div>`;
  return `<div class="mb-stats-grid">
    ${cell('Ván đã chơi', s.g)}
    ${cell('Thắng', s.w, 'pos')}
    ${cell('Tỉ lệ thắng', wr+'%')}
    ${cell('Điểm cộng dồn', (s.points>0?'+':'')+s.points, s.points>=0?'pos':'neg')}
    ${cell('Ván đỉnh', '+'+Math.max(0,s.best), 'pos')}
    ${cell('Sập Hầm 💥', s.scoopWin)}
    ${cell('Báo bài 🌟', s.special)}
    ${cell('Tứ Quý ♣️', s.tuquy)}
    ${cell('Thùng Phá Sảnh 🐉', s.tps)}
    ${cell('Chuỗi thắng đỉnh 🔥', s.streakBest)}
    ${cell('Cược thắng cao nhất', s.betWinMax+' 🪙')}
    ${cell('Tổng ăn xu', fmtCoin(s.coinsWon)+' 🪙', 'pos')}
  </div>`;
}
function mbAchHTML(){
  const ach=(profile&&profile.achievements)||{};
  const done=MB_ACHS.filter(a=>ach[a.id]).length;
  // Bộ chọn danh hiệu (chỉ hiện các danh hiệu đã mở)
  const titles=MB_ACHS.filter(a=>a.title&&ach[a.id]);
  const cur=profile&&profile.mbTitle;
  const tchips=titles.length? `<div class="mb-title-pick">
      <button class="mb-tchip${!cur?' sel':''}" data-title="">Không đeo</button>
      ${titles.map(a=>`<button class="mb-tchip${cur===a.id?' sel':''}" data-title="${a.id}">${a.icon} ${esc(a.title)}</button>`).join('')}
    </div>` : `<p class="mb-r-tip">Mở danh hiệu bằng cách hoàn thành thành tựu bên dưới.</p>`;
  const cards=MB_ACHS.map(a=>{
    const on=!!ach[a.id];
    const rw=(a.reward?`+${fmtCoin(a.reward)}🪙`:'')+(a.title?` · 🎖️${a.title}`:'')+(a.cos?' · 🎁 cosmetic':'');
    return `<div class="mb-ach${on?' on':''}"><span class="mb-ach-ic">${a.icon}</span>
      <div class="mb-ach-tx"><b>${a.name}</b><small>${esc(a.desc)}</small><em>${rw}</em></div>
      <span class="mb-ach-st">${on?'✔':'🔒'}</span></div>`;
  }).join('');
  return `<div class="mb-prof-h">Danh hiệu đang đeo</div>${tchips}
    <div class="mb-prof-h">Thành tựu · ${done}/${MB_ACHS.length}</div>
    <div class="mb-ach-list">${cards}</div>`;
}
function mbShopHTML(){
  const eqOf=t=>mbCosGet(t);
  const groups=MB_COS_GROUPS.map(([type,label])=>{
    const items=MB_COS.filter(c=>c.type===type).map(c=>{
      const owned=mbCosOwned(c), equipped=eqOf(type)===c.id;
      let act;
      if(equipped) act=`<span class="mb-shop-eq">Đang dùng</span>`;
      else if(owned) act=`<button class="btn ghost sm mb-buy" data-equip="${c.id}" data-type="${type}">Dùng</button>`;
      else if(c.ach){ const a=MB_ACHS.find(x=>x.id===c.ach); act=`<span class="mb-shop-lock">🔒 ${a?esc(a.name):'thành tựu'}</span>`; }
      else act=`<button class="btn sm mb-buy" data-buy="${c.id}">${fmtCoin(c.price)} 🪙</button>`;
      // Khung avatar: hiện PREVIEW ảnh động thật (avatar tí hon đeo khung); còn lại dùng emoji.
      const ic = (c.type==='frame' && c.id!=='frame_none')
        ? `<span class="mb-shop-ic mb-fpreview" data-frame="${c.id}">🙂</span>`
        : `<span class="mb-shop-ic">${c.icon}</span>`;
      return `<div class="mb-shop-it${equipped?' eq':''}">${ic}
        <b>${esc(c.name)}</b>${act}</div>`;
    }).join('');
    return `<div class="mb-prof-h">${label}</div><div class="mb-shop-grid">${items}</div>`;
  }).join('');
  return `<p class="mb-r-tip">Xu hiện có: <b>${profile&&profile.coins!=null?fmtCoin(profile.coins):'--'} 🪙</b></p>${groups}`;
}
function mbProfWire(tab){
  if(tab==='ach'){
    $('mbProf').querySelectorAll('.mb-tchip').forEach(b=>b.onclick=()=>mbSetTitle(b.dataset.title));
  }else if(tab==='shop'){
    $('mbProf').querySelectorAll('.mb-buy').forEach(b=>b.onclick=()=>{
      if(b.dataset.equip) mbEquip(b.dataset.type, b.dataset.equip);
      else if(b.dataset.buy) mbBuy(b.dataset.buy);
    });
  }
}
function mbEquip(type,id){
  if(!auth||!auth.currentUser||!db) return;
  profile.mbCos=profile.mbCos||{}; profile.mbCos[type]=id;                 // cập nhật lạc quan
  db.ref('users/'+auth.currentUser.uid+'/mbCos/'+type).set(id).catch(()=>{});
  if(typeof sfx==='function') sfx('place'); if(typeof toast==='function') toast('Đã trang bị ✨');
  mbApplyCosmetics(); mbProfRender('shop');
}
function mbSetTitle(id){
  if(!auth||!auth.currentUser||!db) return;
  profile.mbTitle=id||'';
  db.ref('users/'+auth.currentUser.uid+'/mbTitle').set(id||null).catch(()=>{});
  if(typeof sfx==='function') sfx('tap');
  // cập nhật chip danh hiệu ở đầu hồ sơ + vẽ lại tab
  const idbox=$('mbProf').querySelector('.mb-prof-id'); if(idbox){ const old=idbox.querySelector('.mb-title-chip'); if(old) old.remove();
    const b=idbox.querySelector('b'); if(b) b.insertAdjacentHTML('afterend',' '+mbTitleChip()); }
  mbProfRender('ach');
}
function mbBuy(id){
  const c=MB_COS.find(x=>x.id===id); if(!c||!auth||!auth.currentUser||!db) return;
  db.ref('users/'+auth.currentUser.uid).transaction(u=>{
    if(u===null) return u; u.mbOwned=u.mbOwned||{};
    if(u.mbOwned[id]) return;                        // đã có
    if((u.coins||0) < c.price) return;               // không đủ -> huỷ giao dịch
    u.coins=(u.coins||0)-c.price; u.mbOwned[id]=true; return u;
  }).then(res=>{
    const v=res&&res.snapshot&&res.snapshot.val();
    if(res.committed && v){ profile=v; }              // đồng bộ ngay
    const ok=res.committed && v && v.mbOwned && v.mbOwned[id];
    if(ok){ if(typeof toast==='function') toast('Đã mua '+c.name+' ✔'); if(typeof sfx==='function') sfx('coin'); }
    else { if(typeof toast==='function') toast('Không đủ xu 🪙'); }
    mbProfRender('shop');
  }).catch(()=>{ if(typeof toast==='function') toast('Lỗi mạng — thử lại'); });
}
