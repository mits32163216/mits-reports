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
}
/* ?q= で開かれたら、その語を入れた状態で始める */
function qParam(){ try{ return new URLSearchParams(location.search).get("q")||""; }catch(e){ return ""; } }

