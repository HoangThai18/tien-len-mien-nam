/* =========================================================================
   MẬU BINH — Binh Xập Xám (13 lá), chơi với 3 máy. Ăn xu theo điểm × mệnh giá.
   Mỗi người 13 lá → xếp 3 chi: Đầu(3) · Giữa(5) · Cuối(5), chi dưới ≥ chi trên.
   So từng chi ăn ±1 điểm; thắng cả 3 chi (Sập Hầm) ăn đôi (±6). Vài bộ Mậu Binh
   (báo bài) thắng trắng cả bàn. Tính điểm ghế 0 (Bạn) × mệnh giá → cộng/trừ ví.
   File CHỈ khai báo; mọi wiring nằm trong hàm (KHÔNG chạy code top-level).
   Dùng chung: newDeck/cid/rlabel/SUITS/RED/cardHTML/$/esc/toast/fmtCoin/addCoins.
   ========================================================================= */
let mbState=null, mbActive=false, mbBuilt=false;

const MB_BOTS=[ null, {name:'An',emoji:'🐱'}, {name:'Bo',emoji:'🐼'}, {name:'Cường',emoji:'🦊'} ];
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

/* ---------- Tính điểm cả bàn (4 người) ---------- */
// arrs[p] = {ef,em,eb,foul,special}. Trả mảng điểm 4 người (tổng đại số).
function mbScoreAll(arrs){
  const pts=[0,0,0,0];
  for(let i=0;i<4;i++) for(let j=i+1;j<4;j++){
    const A=arrs[i], B=arrs[j], si=A.special, sj=B.special;
    let di=0;                                                    // điểm i lấy của j
    if(si||sj){
      if(si&&sj) di = si.rank>sj.rank? si.pts : sj.rank>si.rank? -sj.pts : 0;
      else if(si) di=si.pts; else di=-sj.pts;
    }else if(A.foul&&B.foul){ di=0; }
    else if(A.foul){ di=-3; }
    else if(B.foul){ di=3; }
    else{
      let w=0;
      w += mbCmp(A.eb,B.eb)>0?1:-1;
      w += mbCmp(A.em,B.em)>0?1:-1;
      w += mbCmp(A.ef,B.ef)>0?1:-1;
      di = w===3?6 : w===-3?-6 : w;                              // Sập Hầm ×2
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
      <button class="btn ghost sm" id="mbAuto" type="button">✨ Xếp tự động</button>
      <button class="btn ghost sm" id="mbClear" type="button">↺ Xếp lại</button>
      <button class="btn" id="mbGo" type="button">Binh xong 🎴</button>
    </div>
    <div class="mb-hint">Chạm 1 lá để chọn · chạm vào một CHI hoặc khay để đặt lá vào đó. Chi dưới phải mạnh hơn chi trên.</div>
    <div class="mb-modal" id="mbResult" aria-hidden="true"></div>
    <div class="mb-modal" id="mbRules" aria-hidden="true"></div>`;
  document.body.appendChild(app);
  mbBuilt=true;

  $('mbBack').onclick=()=>leaveMauBinh();
  $('mbHelp').onclick=mbShowRules;
  $('mbAuto').onclick=mbAutoArrange;
  $('mbClear').onclick=mbClearArrange;
  $('mbGo').onclick=mbConfirm;
  // Chạm lá / chạm chi
  app.addEventListener('click',e=>{
    if($('mbResult').getAttribute('aria-hidden')==='false') return;
    if($('mbRules').getAttribute('aria-hidden')==='false') return;
    const cardEl=e.target.closest('.card');
    if(cardEl && cardEl.closest('#mbBoard, #mbTray')){
      const id=+cardEl.dataset.id;
      if(mbState.sel==null){ mbState.sel=id; mbRenderMe(); }          // chọn lá đầu
      else if(mbState.sel===id){ mbState.sel=null; mbRenderMe(); }    // chạm lại -> bỏ chọn
      else { mbSwap(mbState.sel, id); mbState.sel=null; }             // chạm lá 2 -> ĐỔI CHỖ 2 lá
      return;
    }
    const zoneEl=e.target.closest('[data-slot]');
    if(zoneEl && mbState.sel!=null){ mbMove(mbState.sel, zoneEl.dataset.slot); }
  });
}

/* ---------- Vào / ra màn ---------- */
function showMauBinh(){
  mbBuild(); hideOverlay();
  const cb=$('coinBar'); if(cb) cb.style.display='none';
  $('mbApp').style.display='flex';
  mbActive=true;
  mbDeal();
}
function leaveMauBinh(silent){
  mbActive=false;
  if($('mbApp')) $('mbApp').style.display='none';
  const cb=$('coinBar'); if(cb&&profile) cb.style.display='inline-flex';
  if(!silent) showGameSelect();
}

/* ---------- Chia bài ván mới ---------- */
function mbDeal(){
  const deck=newDeck();
  const hands=[[],[],[],[]];
  for(let i=0;i<52;i++) hands[i%4].push(deck[i]);
  // UX: chia xong XẾP SẴN 3 chi hợp lệ (như app khác) — người chơi chỉ chạm 2 lá để đổi chỗ,
  // hoặc bấm Binh xong luôn. Đỡ phải kéo từng lá.
  const a=mbBestArrange(hands[0]);
  mbState={ bet:gameBet, hands, zones:{tray:[], front:a.front.slice(), mid:a.mid.slice(), back:a.back.slice()},
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
  if(target!=='tray' && mbState.zones[target].length>=MB_CAP[target]){ toast('Chi này đã đủ lá'); return; }
  mbState.zones[cur.z].splice(cur.i,1);
  mbState.zones[target].push(cur.card);
  mbState.sel=null;
  mbRenderMe();
}
function mbAutoArrange(){
  const all=[...mbState.zones.tray,...mbState.zones.front,...mbState.zones.mid,...mbState.zones.back];
  const a=mbBestArrange(all);
  mbState.zones={ tray:[], front:a.front.slice(), mid:a.mid.slice(), back:a.back.slice() };
  mbState.sel=null; mbRenderMe();
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
  // 3 chi
  ['front','mid','back'].forEach(slot=>{
    const wrap=$('mbBoard').querySelector(`.mb-cards[data-slot="${slot}"]`);
    wrap.innerHTML=z[slot].map(c=>cardHTML(c, cid(c)===mbState.sel?'sel':'')).join('');
    const row=$('mbBoard').querySelector(`.mb-row[data-slot="${slot}"]`);
    row.querySelector('.mb-rowcap').textContent=`${z[slot].length}/${MB_CAP[slot]}`;
    const evalEl=row.querySelector('.mb-roweval');
    evalEl.textContent = z[slot].length===MB_CAP[slot] ? mbEval(z[slot]).name : '';
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
  addCoins(delta, gameId, delta>0, {game:'maubinh'});   // luôn ghi ván (kể cả hoà) -> tính ELO + nhiệm vụ
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
    return `<div class="mb-resrow${p===0?' me':''} mb-fade" style="--d:${pStart}ms">
      <div class="mb-reshead"><span class="mb-resava">${avas[p]}</span><b>${esc(names[p])}</b>${sp}
        <span class="mb-respts ${pc} mb-pop" style="--d:${pStart+500}ms">${pts[p]>0?'+':''}${pts[p]}</span></div>
      <div class="mb-reschis">${chis}</div>
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
  // Cập nhật dải đối thủ theo nhịp lật (mỗi người tới lượt mới hiện điểm)
  const topPts=Math.max(...pts);
  for(let p=1;p<=3;p++){
    setTimeout(()=>{ if(tok!==mbRevealToken) return;
      const s=$('mbOppS'+p); if(!s) return;
      s.textContent=(pts[p]>0?'+':'')+pts[p]+' điểm'; s.className=pts[p]>0?'pos':pts[p]<0?'neg':'';
      const opp=s.closest('.mb-opp'); if(opp) opp.classList.toggle('win', pts[p]===topPts && topPts>0);
    }, BASE + p*PGAP + 520);
  }
  // Ăn mừng khi tất cả đã lật xong
  setTimeout(()=>{ if(tok!==mbRevealToken) return;
    if(delta>0){ if(typeof confetti==='function') confetti(); if(typeof flash==='function') flash('THẮNG! 🎉'); }
    else if(delta<0 && typeof flash==='function') flash('Thua rồi 😅');
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
        <p><b>Tính điểm:</b> so từng chi với từng đối thủ — thắng chi <b>+1</b>, thua <b>−1</b>. Thắng <b>cả 3 chi</b> (Sập Hầm) ăn <b>gấp đôi</b> (±6).</p>
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
