/* =========================================================================
   GAME STATE (serializable) + reducer — chạy ở host & solo
   ========================================================================= */
function freshState(names,opts){
  opts=opts||{};
  const d=newDeck();
  const hands=[[],[],[],[]];
  const activeSeats=(opts.activeSeats&&opts.activeSeats.length?opts.activeSeats:[0,1,2,3]).slice();
  const deal=d.slice(0,activeSeats.length*13); // mỗi người luôn 13 lá; phần dư không dùng ở bàn 2/3 người
  const threeSpade=d.find(c=>c.rank===3&&c.suit===0);
  if(threeSpade&&!deal.includes(threeSpade)) deal[deal.length-1]=threeSpade;
  deal.forEach((c,i)=>hands[activeSeats[i%activeSeats.length]].push(c));
  hands.forEach(h=>h.sort((a,b)=>a.rank-b.rank||a.suit-b.suit));
  const threeSpadeTurn=hands.findIndex(h=>h.some(c=>c.rank===3&&c.suit===0));
  const previousWinner=Number.isInteger(opts.openingSeat)&&activeSeats.includes(opts.openingSeat)
    ? opts.openingSeat : null;
  const turn=previousWinner===null?threeSpadeTurn:previousWinner;
  return {
    hands, names, activeSeats,
    classes:opts.classes||['captain','mage','guardian','trickster'],
    turn, lastPlayer:turn,
    current:null, lastPlayedCards:[], lastPlayedBy:-1,
    passed:[false,false,false,false],
    finished:[], firstPlay:previousWinner===null,
    status:'playing',
    bet:opts.bet||0, gameId:opts.gameId||null,   // tiền đánh ăn
    coins:[0,0,0,0], settle:null,                // xu hiển thị + kết quả tính tiền
    fx:null, note:null, ver:1,
  };
}
function nextActive(S,from){
  const active=S.activeSeats||[0,1,2,3];
  let at=active.indexOf(from);
  for(let n=0;n<active.length;n++){
    at=(at+1)%active.length;
    const seat=active[at];
    if(!S.finished.includes(seat)) return seat;
  }
  return from;
}
// Trả về {ok, err} — mutate S
function applyPlay(S,p,cards){
  if(S.status!=='playing'||S.turn!==p) return {ok:false,err:'Chưa tới lượt'};
  const m=classify(cards);
  if(!m) return {ok:false,err:'Bộ bài không hợp lệ'};
  const ids=new Set(cards.map(cid));
  if(S.hands[p].filter(c=>ids.has(cid(c))).length!==cards.length)
    return {ok:false,err:'Lá bài không có trong tay'};
  if(S.firstPlay && !cards.some(c=>c.rank===3&&c.suit===0))
    return {ok:false,err:'Ván mới phải đánh kèm 3♠'};
  if(!beats(m,S.current))
    return {ok:false,err:S.current?'Không chặn được bài trên bàn':'Không hợp lệ'};

  const wasChat=S.current && isBomb(m) && (S.current.rank===15||isBomb(S.current));
  S.hands[p]=S.hands[p].filter(c=>!ids.has(cid(c)));
  S.current=m;
  S.lastPlayedCards=[...cards].sort((a,b)=>a.rank-b.rank||a.suit-b.suit);
  S.lastPlayedBy=p;
  S.passed=[false,false,false,false];
  S.lastPlayer=p; S.firstPlay=false;
  S.fx=wasChat?(m.type==='four'?'TỨ QUÝ!':'CHẶT!'):null;
  S.note=null;

  if(S.hands[p].length===0){
    settleGame(S,p);          // "đếm lá miền Nam": có người TỚI là kết ván ngay
  }else{
    S.turn=nextActive(S,p);
  }
  S.ver++;
  return {ok:true};
}
// Kết ván khi người đầu tiên hết bài: người còn bài trả (số lá × mệnh giá), người TỚI ăn cả pot
function settleGame(S,winner){
  const bet=S.bet||0;
  const losers=(S.activeSeats||[0,1,2,3]).filter(i=>i!==winner)
    .sort((a,b)=> S.hands[a].length - S.hands[b].length || a-b);   // ít lá hơn xếp trên
  let pot=0;
  const rows=[{seat:winner,cardsLeft:0,delta:0}];
  for(const l of losers){
    const cardsLeft=S.hands[l].length;
    const pay=cardsLeft*bet; pot+=pay;
    rows.push({seat:l,cardsLeft,delta:-pay});
  }
  rows[0].delta=pot;
  S.settle={bet, gameId:S.gameId, winner, pot, rows};
  S.finished=[winner,...losers];           // để renderSeats/badge cũ vẫn chạy
  S.status='over';
  S.note=`${S.names[winner]} TỚI! 🎉 Ăn ${pot} 🪙`;
  rows.forEach(r=>{                          // dồn xu hiển thị (cả người thật lẫn bot)
    S.coins[r.seat]=(S.coins[r.seat]||0)+r.delta;
    if(isBotSeat(r.seat)) botCoins[r.seat]=(botCoins[r.seat]||1000)+r.delta;
  });
}
function applyPass(S,p){
  if(S.status!=='playing'||S.turn!==p) return {ok:false,err:'Chưa tới lượt'};
  if(!S.current) return {ok:false,err:'Đang mở bài, phải đánh'};
  S.passed[p]=true;
  S.fx=null; S.note=`${S.names[p]} bỏ lượt`;
  const stillIn=(S.activeSeats||[0,1,2,3]).filter(i=>!S.finished.includes(i));
  const allPassed=stillIn.filter(i=>i!==S.lastPlayer).every(i=>S.passed[i]);
  if(allPassed){
    S.current=null; S.lastPlayedCards=[]; S.lastPlayedBy=-1;
    S.passed=[false,false,false,false];
    S.turn=S.finished.includes(S.lastPlayer)?nextActive(S,S.lastPlayer):S.lastPlayer;
    S.note='Vòng mới';
  }else{
    S.turn=nextActive(S,p);
  }
  S.ver++;
  return {ok:true};
}
