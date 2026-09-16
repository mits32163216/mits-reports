/* うちなーぐち辞書：検索履歴（全ページ共通） */
/* ───── 検索履歴 ─────
   端末の中（localStorage）に、引いた語と言い換えた文を日時つきで残す。
   続けて打っている途中の形（「あ」「あり」「ありが」）は1件にまとめる。上限 2000件。 */
const HIST_KEY="uchi_hist", HIST_MAX=2000;
function histLoad(){
  let h=[]; try{ h=JSON.parse(localStorage.getItem(HIST_KEY)||"[]"); }catch(e){ h=[]; }
  /* 以前の「最近引いた語」（日時なし・20件）を一度だけ移す */
  try{
    if(!localStorage.getItem("uchi_hist_migrated")){
      const old=JSON.parse(localStorage.getItem("uchi_recent")||"[]");
      old.slice().reverse().forEach(q=>h.push({q,t:0,p:"辞書"}));
      localStorage.setItem("uchi_hist_migrated","1");
      localStorage.setItem(HIST_KEY,JSON.stringify(h));
    }
  }catch(e){}
  return h;
}
function histAdd(q,p,extra){
  q=String(q||"").trim(); if(!q) return;
  let h=histLoad(); const now=Date.now(); const last=h[0];
  /* 同じページで1分以内に、前の語を延ばした・縮めた・同じ語なら、前の1件を置き換える */
  if(last && last.p===p && now-last.t<60000 &&
     (q.startsWith(last.q)||last.q.startsWith(q))){ h.shift(); }
  h.unshift(Object.assign({q,t:now,p},extra||{}));
  if(h.length>HIST_MAX) h=h.slice(0,HIST_MAX);
  try{ localStorage.setItem(HIST_KEY,JSON.stringify(h)); }catch(e){}
  histAutoSync();
}
/* ?q= で開かれたら、その語を入れた状態で始める */
function qParam(){ try{ return new URLSearchParams(location.search).get("q")||""; }catch(e){ return ""; } }


/* ───── サーバーに預ける（Cloudflare Worker uchinaaguchi-sync） ─────
   この端末の履歴・以前の「最近引いた語」・自分で足した語を送る。
   サーバー側は履歴を1件ずつ合体するので、何度押しても、別の端末から押しても消えない。
   合言葉は画面の JS に入っていて秘密にはできない（karaoke-sync と同じ扱い）。 */
const SYNC_URL="https://uchinaaguchi-sync.3216-fun.workers.dev/state";
const SYNC_KEY="a277861338236c72bed1c978186ab7b6", SYNC_FAMILY="mitsuhiro";
async function histSync(){
  histLoad();                                   /* 以前の記録の移し替えを先に済ませる */
  const g=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const state={};
  if(g(HIST_KEY)!==null) state.uchi_hist=g(HIST_KEY);
  if(g("uchi_recent")!==null) state.uchi_recent=g("uchi_recent");
  if(g("uchinaaguchi_mine_v1")!==null) state.uchi_mine_v1=g("uchinaaguchi_mine_v1");
  const res=await fetch(SYNC_URL+"?key="+SYNC_KEY+"&f="+SYNC_FAMILY,{method:"POST",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({state,updatedAt:Date.now()})});
  const j=await res.json();
  if(!j.ok) throw new Error(j.error||("HTTP "+res.status));
  const back=await (await fetch(SYNC_URL+"?key="+SYNC_KEY+"&f="+SYNC_FAMILY)).json();
  let n=0; try{ n=JSON.parse(back.state.uchi_hist||"[]").length; }catch(e){}
  try{ localStorage.setItem("uchi_synced_at",String(Date.now())); }catch(e){}
  return {sent:(JSON.parse(state.uchi_hist||"[]")).length, onServer:n,
          mine:(JSON.parse(state.uchi_mine_v1||"[]")).length};
}

/* ───── 自動で預ける ─────
   引くたびに、少し待ってからサーバーへ送る。開いた時・画面を離れる時にも送る。
   サーバーは1件ずつ合体するので、何度送っても消えない。電波が無ければ次の機会に送る。 */
let _histSyncTimer=null;
function histAutoSync(delay){
  clearTimeout(_histSyncTimer);
  _histSyncTimer=setTimeout(()=>{ histSync().catch(()=>{}); }, delay==null?4000:delay);
}
if(typeof window!=="undefined" && location.protocol!=="file:"){
  window.addEventListener("load",()=>histAutoSync(1500));
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden"){ clearTimeout(_histSyncTimer); histSync().catch(()=>{}); } });
  window.addEventListener("online",()=>histAutoSync(1000));
}
