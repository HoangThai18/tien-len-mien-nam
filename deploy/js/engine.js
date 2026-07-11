/* =========================================================================
   ENGINE — Tiến Lên Miền Nam (thuần hàm, dùng chung host/guest/solo)
   Rank: 3<4<...<A<2(=15)  |  Chất: ♠<♣<♦<♥
   ========================================================================= */
const RANKS=[3,4,5,6,7,8,9,10,11,12,13,14,15];
const SUITS=['♠','♣','♦','♥'];
const RED=new Set([2,3]);
const RANK_LABEL={11:'J',12:'Q',13:'K',14:'A',15:'2'};
const cid=c=>c.rank*4+c.suit;
const val=cid;
const rlabel=r=>RANK_LABEL[r]||String(r);

function newDeck(){
  const d=[];
  for(const r of RANKS) for(let s=0;s<4;s++) d.push({rank:r,suit:s});
  for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
  return d;
}
function classify(cards){
  if(!cards||!cards.length) return null;
  const cs=[...cards].sort((a,b)=>a.rank-b.rank||a.suit-b.suit);
  const n=cs.length, ranks=cs.map(c=>c.rank), same=ranks.every(r=>r===ranks[0]), top=val(cs[n-1]);
  if(n===1) return {type:'single',rank:ranks[0],top};
  if(n===2&&same) return {type:'pair',rank:ranks[0],top};
  if(n===3&&same) return {type:'triple',rank:ranks[0],top};
  if(n===4&&same) return {type:'four',rank:ranks[0],top};
  if(n>=3){
    const uniq=[...new Set(ranks)];
    if(uniq.length===n && !ranks.includes(15) && ranks[n-1]-ranks[0]===n-1)
      return {type:'straight',len:n,top};
  }
  if(n>=6&&n%2===0){
    const b={}; ranks.forEach(r=>b[r]=(b[r]||0)+1);
    const k=Object.keys(b).map(Number).sort((a,b)=>a-b);
    if(k.every(x=>b[x]===2)&&k.length===n/2&&!ranks.includes(15)&&k[k.length-1]-k[0]===k.length-1)
      return {type:'seqpair',pairs:n/2,top};
  }
  return null;
}
const isBomb=m=>m&&(m.type==='four'||m.type==='seqpair');
function bombStrength(m){
  if(m.type==='seqpair'){
    if(m.pairs===3) return 1000+m.top;
    if(m.pairs===4) return 3000+m.top;
    return 4000+m.pairs*100+m.top;
  }
  if(m.type==='four') return 2000+m.top;
  return 0;
}
function canChat(cand,cur){
  const tS=cur.type==='single'&&cur.rank===15, tP=cur.type==='pair'&&cur.rank===15;
  const cS=cand.type==='seqpair'?cand.pairs:0, cF=cand.type==='four';
  if(tS && (cF||cS>=3)) return true;
  if(tP && (cF||cS>=4)) return true;
  if(isBomb(cur)&&(cF||cS>=3)) return bombStrength(cand)>bombStrength(cur);
  return false;
}
function beats(cand,cur){
  if(!cur) return true;
  if(cand.type===cur.type){
    if(cand.type==='straight') return cand.len===cur.len && cand.top>cur.top;
    if(cand.type==='seqpair')  return cand.pairs===cur.pairs?cand.top>cur.top:canChat(cand,cur);
    return cand.top>cur.top;
  }
  return canChat(cand,cur);
}
function groupByRank(h){
  const g={}; h.forEach(c=>{(g[c.rank]=g[c.rank]||[]).push(c);});
  for(const k in g) g[k].sort((a,b)=>a.suit-b.suit);
  return g;
}
function findStraights(h,len){
  const g=groupByRank(h),out=[],rks=RANKS.filter(r=>r!==15&&g[r]);
  for(let i=0;i+len<=rks.length;i++){
    let ok=true;
    for(let k=1;k<len;k++) if(rks[i+k]!==rks[i]+k){ok=false;break;}
    if(!ok) continue;
    const c=[]; for(let k=0;k<len;k++) c.push(g[rks[i+k]][0]);
    out.push(c);
  }
  return out;
}
function findSeqPairs(h,pairs){
  const g=groupByRank(h),out=[],rks=RANKS.filter(r=>r!==15&&g[r]&&g[r].length>=2);
  for(let i=0;i+pairs<=rks.length;i++){
    let ok=true;
    for(let k=1;k<pairs;k++) if(rks[i+k]!==rks[i]+k){ok=false;break;}
    if(!ok) continue;
    const c=[]; for(let k=0;k<pairs;k++) c.push(g[rks[i+k]][0],g[rks[i+k]][1]);
    out.push(c);
  }
  return out;
}
function allBombs(h){
  const g=groupByRank(h),out=[];
  for(const k in g) if(g[k].length===4) out.push(g[k].slice());
  for(let p=3;p<=6;p++) findSeqPairs(h,p).forEach(c=>out.push(c));
  return out;
}
function legalMoves(h,cur){
  const g=groupByRank(h),moves=[];
  const push=cards=>{const m=classify(cards); if(m&&beats(m,cur)) moves.push({cards,m});};
  if(!cur){
    for(const k in g){const a=g[k];
      push([a[0]]);
      if(a.length>=2) push([a[0],a[1]]);
      if(a.length>=3) push([a[0],a[1],a[2]]);
      if(a.length===4) push(a.slice());
    }
    for(let L=3;L<=12;L++) findStraights(h,L).forEach(c=>push(c));
    for(let p=3;p<=6;p++) findSeqPairs(h,p).forEach(c=>push(c));
    return moves;
  }
  switch(cur.type){
    case 'single': for(const k in g) push([g[k][0]]); break;
    case 'pair':   for(const k in g) if(g[k].length>=2) push([g[k][0],g[k][1]]); break;
    case 'triple': for(const k in g) if(g[k].length>=3) push([g[k][0],g[k][1],g[k][2]]); break;
    case 'four':   for(const k in g) if(g[k].length===4) push(g[k].slice()); break;
    case 'straight': findStraights(h,cur.len).forEach(c=>push(c)); break;
    case 'seqpair':  for(let p=cur.pairs;p<=6;p++) findSeqPairs(h,p).forEach(c=>push(c)); break;
  }
  if(cur.type==='single'&&cur.rank===15 || cur.type==='pair'&&cur.rank===15 || isBomb(cur))
    allBombs(h).forEach(c=>push(c));
  return moves;
}
function botMove(S,p){
  const h=S.hands[p], cur=S.current, moves=legalMoves(h,cur);
  if(!moves.length) return null;
  const nonBomb=moves.filter(x=>!isBomb(x.m));
  const oppMin=Math.min(...[0,1,2,3].filter(i=>i!==p&&!S.finished.includes(i)).map(i=>S.hands[i].length));
  if(!cur){
    let pool=nonBomb.length?nonBomb:moves;
    if(S.firstPlay){
      const w=moves.filter(x=>x.cards.some(c=>c.rank===3&&c.suit===0));
      if(w.length) pool=w;
    }
    pool.sort((a,b)=>{
      const ab=isBomb(a.m), bb=isBomb(b.m);
      if(ab!==bb) return ab?1:-1;
      if(b.cards.length!==a.cards.length) return b.cards.length-a.cards.length;
      return a.m.top-b.m.top;
    });
    return pool.find(x=>x.m.top<14*4)||pool[0];
  }
  if(nonBomb.length){ nonBomb.sort((a,b)=>a.m.top-b.m.top); return nonBomb[0]; }
  if(h.length<=7||oppMin<=3){ moves.sort((a,b)=>bombStrength(a.m)-bombStrength(b.m)); return moves[0]; }
  return null;
}

