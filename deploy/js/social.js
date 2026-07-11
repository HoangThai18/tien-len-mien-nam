/* =========================================================================
   CHAT — chỉ hoạt động khi online (host & guest), đồng bộ qua Firebase
   ========================================================================= */
const QUICK_MSGS=['Nhanh lên ⏰','Hihi 😆','Bài đẹp ghê 👀','Chặt nè! ✂️','May quá 🍀','Khoan đã ✋','GG 👍','Huhu 😭','Ăn gian à? 🤨','❤️'];
let chatMsgs=[], chatOpen=false, chatUnread=0, unsubChat=null, chatStartAt=0;
function chatAvailable(){ return mode!=='solo' && !!roomRef; }
function updateChatUI(){
  $('chatFab').style.display=chatAvailable()?'flex':'none';
  if(!chatAvailable()&&chatOpen) toggleChat(false);
}
function listenChat(){
  if(unsubChat){unsubChat.off(); unsubChat=null;}
  if(!roomRef) return;
  chatStartAt=Date.now();
  unsubChat=roomRef.child('chat');
  unsubChat.limitToLast(50).on('child_added',snap=>{
    const m=snap.val();
    if(!m||typeof m.text!=='string'||typeof m.seat!=='number') return;
    // tin cũ trước khi vào phòng: nạp vào log nhưng không nổi bong bóng / báo chưa đọc
    const backfill=typeof m.t==='number' && m.t<chatStartAt;
    addChat({seat:m.seat, name:String(m.name||'Bạn chơi').slice(0,12), text:m.text.slice(0,100)}, backfill);
  });
}
function addChat(m,quiet){
  chatMsgs.push(m); if(chatMsgs.length>60) chatMsgs.shift();
  if(chatOpen) renderChatLog();
  else if(!quiet && m.seat!==myIdx){ chatUnread++; setChatBadge(); }
  if(!quiet) showChatBubble(m.seat,m.text);
}
function sendChat(text){
  text=(text||'').trim();
  if(!text||!chatAvailable()) return;
  roomRef.child('chat').push({seat:myIdx, name:myName, text:text.slice(0,100), t:Date.now()});
}
function setChatBadge(){
  const b=$('chatBadge');
  if(chatUnread>0){ b.style.display='flex'; b.textContent=chatUnread>9?'9+':chatUnread; }
  else b.style.display='none';
}
function toggleChat(open){
  chatOpen=open===undefined?!chatOpen:open;
  $('chatPanel').classList.toggle('open',chatOpen);
  if(chatOpen){ chatUnread=0; setChatBadge(); renderChatLog(); }
}
function renderChatLog(){
  const log=$('chatLog'); log.innerHTML='';
  chatMsgs.forEach(m=>{
    const d=document.createElement('div');
    d.className='cmsg'+(m.seat===myIdx?' me':'');
    if(m.seat!==myIdx){
      const n=document.createElement('span'); n.className='cn';
      n.textContent=m.name; d.appendChild(n);
    }
    d.appendChild(document.createTextNode(m.text));
    log.appendChild(d);
  });
  log.scrollTop=log.scrollHeight;
}
function showChatBubble(seat,text){
  let x,y;
  if(seat===myIdx){
    const r=$('hand').getBoundingClientRect();
    x=r.left+r.width/2; y=r.top+8;
  }else{
    const rel=(seat-myIdx+4)%4;
    const el=document.querySelector('.seat.'+({1:'left',2:'top',3:'right'}[rel])+' .avatar');
    if(!el) return;
    const r=el.getBoundingClientRect();
    x=r.left+r.width/2; y=r.top;
  }
  const b=document.createElement('div');
  b.className='chat-pop'; b.textContent=text;   // textContent = an toàn, không cần escape
  b.style.left=x+'px'; b.style.top=y+'px';
  document.body.appendChild(b);
  setTimeout(()=>{ b.style.transition='opacity .3s'; b.style.opacity='0'; },2800);
  setTimeout(()=>b.remove(),3200);
}
// gắn UI chat
$('chatFab').onclick=()=>toggleChat();
$('chatClose').onclick=()=>toggleChat(false);
$('chatSend').onclick=()=>{ sendChat($('chatText').value); $('chatText').value=''; };
$('chatText').onkeydown=e=>{ if(e.key==='Enter'){ sendChat($('chatText').value); $('chatText').value=''; } };
QUICK_MSGS.forEach(q=>{
  const c=document.createElement('button');
  c.className='chip'; c.textContent=q;
  c.onclick=()=>sendChat(q);
  $('chatChips').appendChild(c);
});

/* =========================================================================
   NÉM VẬT PHẨM ĐỂ TRÊU — kênh realtime phụ (rooms/<code>/throws)
   Payload chỉ gồm SỐ {from,to,item,t}; item = chỉ số trong THROW_ITEMS (an toàn XSS)
   ========================================================================= */
const THROW_ITEMS=[
  {e:'🍅',label:'Cà chua',kind:'splat',stain:'🟥',say:'Ăn cà chua nè! 🍅'},
  {e:'🥚',label:'Trứng',kind:'splat',stain:'🍳',say:'Trứng thối đây! 🥚'},
  {e:'👞',label:'Dép',kind:'splat',stain:'💢',say:'Bốp! Dính dép rồi 👞'},
  {e:'💩',label:'Bom thối',kind:'splat',stain:'💩',say:'Hôi quá đi 💩'},
  {e:'🌹',label:'Hoa hồng',kind:'nice',say:'Tặng bạn nè 🌹'},
  {e:'💐',label:'Bó hoa',kind:'nice',say:'Chúc mừng nha 💐'},
  {e:'🎉',label:'Pháo giấy',kind:'nice',say:'Quẩy lên! 🎉'},
  {e:'🍺',label:'Bia',kind:'nice',say:'Dzô dzô! 🍺'},
  {e:'👏',label:'Vỗ tay',kind:'nice',say:'Hay lắm 👏'},
  {e:'💋',label:'Nụ hôn',kind:'nice',say:'Muah 💋'},
];
const THROW_COOLDOWN=1800;
let unsubThrows=null, lastThrowAt=0, throwStartAt=0, seenThrows=new Set();
let throwBackTimer=null, pickerEl=null, pickerSeat=-1;
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

function seatAvatarEl(p){
  if(p===myIdx) return $('hand');
  const rel=(p-myIdx+4)%4;
  return document.querySelector('.seat.'+({1:'left',2:'top',3:'right'}[rel])+' .avatar');
}
function canThrowNow(){ return Date.now()-lastThrowAt>=THROW_COOLDOWN; }
function throwItem(targetSeat,itemIdx){
  const it=THROW_ITEMS[itemIdx];
  if(!it||targetSeat===myIdx) return;
  if(!canThrowNow()){ toast('Từ từ thôi nào 😅'); return; }
  lastThrowAt=Date.now();
  closeThrowPicker();
  const payload={from:myIdx,to:targetSeat,item:itemIdx,t:Date.now()};
  if(chatAvailable()){ roomRef.child('throws').push(payload); } // echo child_added -> animate cả 2 máy
  else{ playThrow(payload); maybeBotThrowBack(targetSeat); }    // solo: animate tại chỗ
}
function listenThrows(){
  if(unsubThrows){ unsubThrows.off(); unsubThrows=null; }
  if(!roomRef) return;
  throwStartAt=Date.now(); seenThrows.clear();
  unsubThrows=roomRef.child('throws');
  unsubThrows.limitToLast(20).on('child_added',snap=>onThrowMsg(snap.key,snap.val()));
}
function onThrowMsg(key,m){
  if(!m||seenThrows.has(key)) return;
  seenThrows.add(key);
  if(seenThrows.size>200) seenThrows=new Set([key]);
  if(typeof m.t==='number'&&m.t<throwStartAt-3000) return;       // bỏ lịch sử cũ (lệch đồng hồ ~3s)
  const from=+m.from,to=+m.to,item=+m.item;
  if(!(from>=0&&from<4)||!(to>=0&&to<4)||from===to||!THROW_ITEMS[item]) return;
  playThrow({from,to,item});
}
function playThrow(o){
  const it=THROW_ITEMS[o.item]; if(!it) return;
  const fromEl=seatAvatarEl(o.from), toEl=seatAvatarEl(o.to);
  if(!toEl) return;                                              // đích chưa render -> bỏ qua
  flyItem(fromEl,toEl,it,()=>{
    splatAt(o.to,it);
    if(Math.random()<0.7) showChatBubble(o.from,it.say);         // bong bóng trêu ở người ném
    if(navigator.vibrate&&it.kind==='splat'){ try{navigator.vibrate(30);}catch(e){} }
    if(o.to===myIdx) toast(it.kind==='splat'?`Bạn bị ném ${it.label.toLowerCase()}! ${it.e}`:`${it.e} ${it.label} cho bạn nè`);
  });
}
function flyItem(fromEl,toEl,item,onImpact){
  const tr=toEl.getBoundingClientRect();
  const fr=fromEl?fromEl.getBoundingClientRect():null;
  const x1=fr?fr.left+fr.width/2:tr.left+tr.width/2;
  const y1=fr?fr.top+fr.height/2:tr.top-140;
  const x2=tr.left+tr.width/2, y2=tr.top+tr.height/2;
  const el=document.createElement('span');
  el.className='fly-item'; el.textContent=item.e;
  el.style.transform=`translate(${x1}px,${y1}px)`;
  document.body.appendChild(el);
  let done=false; const finish=()=>{ if(done) return; done=true; el.remove(); onImpact&&onImpact(); };
  if(reduceMotion()){ setTimeout(finish,160); return; }
  const dx=x2-x1, dy=y2-y1, dist=Math.hypot(dx,dy);
  const dur=Math.min(720,Math.max(420,dist*0.9));
  const arc=Math.min(120,40+dist*0.18);
  const dir=x2>=x1?1:-1, spin=item.kind==='splat'?720:360;
  const a=el.animate([
    {transform:`translate(${x1}px,${y1}px) rotate(0deg) scale(.6)`,opacity:1,offset:0},
    {transform:`translate(${x1+dx*0.5}px,${y1+dy*0.5-arc}px) rotate(${dir*spin*0.5}deg) scale(1.15)`,offset:.5},
    {transform:`translate(${x2}px,${y2}px) rotate(${dir*spin}deg) scale(1)`,opacity:1,offset:1},
  ],{duration:dur,easing:'cubic-bezier(.4,.05,.6,1)',fill:'forwards'});
  a.onfinish=finish; setTimeout(finish,dur+400);
}
function splatAt(seat,item){
  const el=seatAvatarEl(seat); if(!el) return;                   // re-query lúc trúng -> bền với rebuild
  const r=el.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  if(!reduceMotion()) el.animate([
    {transform:'translate(0,0) rotate(0)'},{transform:'translate(-5px,1px) rotate(-6deg)'},
    {transform:'translate(5px,-1px) rotate(6deg)'},{transform:'translate(-3px,0) rotate(-3deg)'},
    {transform:'translate(0,0) rotate(0)'}],{duration:360,easing:'ease-in-out'});
  const s=document.createElement('span');
  s.className='splat '+(item.kind==='splat'?'messy':'nice');
  s.textContent=item.kind==='splat'?(item.stain||'💥'):item.e;
  s.style.left=cx+'px'; s.style.top=cy+'px';
  document.body.appendChild(s); setTimeout(()=>s.remove(),700);
  if(item.kind==='splat'){
    const st=document.createElement('span'); st.className='stain'; st.textContent=item.stain||'🟤';
    st.style.left=cx+'px'; st.style.top=(cy+4)+'px';
    document.body.appendChild(st);
    setTimeout(()=>{ st.style.opacity='0'; },1400); setTimeout(()=>st.remove(),2100);
  }else{
    ['❤️','✨','💕','⭐','💖'].forEach((c,i)=>{
      const h=document.createElement('span'); h.className='nice-heart'; h.textContent=c;
      h.style.left=(cx+(Math.random()*40-20))+'px'; h.style.top=cy+'px'; h.style.animationDelay=(i*60)+'ms';
      document.body.appendChild(h); setTimeout(()=>h.remove(),1200);
    });
  }
}
function maybeBotThrowBack(targetSeat){
  if(mode!=='solo'||Math.random()>0.5) return;
  clearTimeout(throwBackTimer);
  throwBackTimer=setTimeout(()=>{
    if(mode!=='solo'||!S) return;
    if(seatAvatarEl(targetSeat)&&seatAvatarEl(myIdx))
      playThrow({from:targetSeat,to:myIdx,item:Math.floor(Math.random()*THROW_ITEMS.length)});
  },900+Math.random()*700);
}
function showThrowPicker(seat,anchorEl){
  closeThrowPicker();
  if(seat===myIdx||!anchorEl||!S) return;
  pickerSeat=seat;
  const pop=document.createElement('div'); pop.className='throw-pop';
  pop.innerHTML=`<div class="throw-pop-title">Ném ${esc(S.names[seat])}</div>`
    +`<div class="throw-pop-grid">`
    +THROW_ITEMS.map((it,i)=>`<button class="throw-btn" data-idx="${i}" aria-label="${esc(it.label)}">${it.e}</button>`).join('')
    +`</div>`;
  document.body.appendChild(pop); pickerEl=pop;
  positionPicker(pop,anchorEl);
  pop.addEventListener('click',e=>{ const b=e.target.closest('.throw-btn'); if(b) throwItem(seat,+b.dataset.idx); });
  setTimeout(()=>document.addEventListener('pointerdown',outsidePickerClose,true),0);
}
function positionPicker(pop,anchorEl){
  const r=anchorEl.getBoundingClientRect(), pw=pop.offsetWidth, ph=pop.offsetHeight;
  let x=r.left+r.width/2, y=r.bottom+8;
  x=Math.max(8+pw/2,Math.min(innerWidth-8-pw/2,x));
  if(y+ph>innerHeight-8) y=r.top-ph-8;
  pop.style.left=x+'px'; pop.style.top=Math.max(8,y)+'px';
}
function outsidePickerClose(e){ if(pickerEl&&!pickerEl.contains(e.target)) closeThrowPicker(); }
function closeThrowPicker(){
  if(pickerEl){ pickerEl.remove(); pickerEl=null; pickerSeat=-1; }
  document.removeEventListener('pointerdown',outsidePickerClose,true);
}
function onSeatTap(e){
  const seatEl=e.target.closest('.seat'); if(!seatEl) return;
  const rel=seatEl.classList.contains('left')?1:seatEl.classList.contains('top')?2:seatEl.classList.contains('right')?3:0;
  if(!rel) return;
  const p=(myIdx+rel)%4;
  if(p===myIdx) return;
  showThrowPicker(p,seatEl.querySelector('.avatar'));
}

/* ---------- Nút ---------- */
$('hand').onclick=e=>{
  const el=e.target.closest('.card');
  if(el) toggleCard(+el.dataset.id);
};
$('seats').addEventListener('click',onSeatTap);   // chạm ghế đối thủ -> mở bảng ném đồ
$('btnPlay').onclick=onPlay;
$('btnPass').onclick=onPass;
$('btnHint').onclick=onHint;
$('btnBomb').onclick=onBombHint;
$('btnSort').onclick=()=>{ sortByRank=!sortByRank; toast(sortByRank?'Xếp theo số':'Xếp theo chất'); render(); };
$('btnLeave').onclick=()=>{
  if(mode==='solo'&&(!S||S.status==='over')){ leaveToMenu(); return; }
  if(confirm('Thoát ván hiện tại?')) leaveToMenu();
};

boot();   // đăng nhập trước, rồi mới vào menu

// PWA: cho phep cai nhu app + chay offline (bo qua em neu mo file truc tiep)
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
