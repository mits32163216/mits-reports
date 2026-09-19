"use strict";
// 押した状態を、ローカル（file://）と web（reports.7years.life）で自動で同じにする（2026-09-19 Mits様指示）
// 保存先：Cloudflare Worker zaimu-seiri-sync（KV ZAIMU_SEIRI_SYNC）。1件ずつ「新しい方が勝つ」。
// ・ボタンを押す／削る予定額を入れる → その場で保存先へ送る
// ・ページを開く／タブに戻る → 保存先から取り込み、変わっていたら1回だけ読み込み直す
// 読む順：zaimu_seiri_state.js の直後（数字を計算するファイルより前）
(function(){
  var URL_ = "https://zaimu-seiri-sync.3216-fun.workers.dev/state";
  var KEY  = "V45k3S9UvfHDvf_sFaHt6AJDRYshWU_K";
  var MAP  = { progress: "zaimu_seiri_progress_v1", outside: "zaimu_seiri_outside_v1",
               ichirangai: "zaimu_seiri_ichirangai_decision_v1", ichirangai_plan: "zaimu_seiri_ichirangai_plan_v1" };
  var FLAG = "zs_sync_reloaded";
  function tsOf(e){ return (e && (e.ts || e.status_date || e.done_date || e.date)) || ""; }
  var origSet = Storage.prototype.setItem;
  function readLS(k){ try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch(e){ return {}; } }
  function writeLS(k, o){ try { origSet.call(localStorage, k, JSON.stringify(o)); } catch(e){} }
  function storeOf(k){ for (var s in MAP) if (MAP[s] === k) return s; return null; }

  var pending = {}, timer = null;
  function post(body){
    return fetch(URL_, { method: "POST", headers: { "content-type": "application/json", "x-zs-key": KEY }, body: JSON.stringify(body), keepalive: true })
      .catch(function(){ for (var s in body){ pending[s] = pending[s] || {}; for (var id in body[s]) pending[s][id] = body[s][id]; } });
  }
  function flush(){ var b = pending; pending = {}; if (Object.keys(b).length) post(b); }

  // 押した時：変わった行に時刻（ts）を付けて送る
  Storage.prototype.setItem = function(k, v){
    var s = (this === localStorage) ? storeOf(k) : null;
    if (!s) return origSet.apply(this, arguments);
    var before = readLS(k), after;
    try { after = JSON.parse(v) || {}; } catch(e){ return origSet.apply(this, arguments); }
    var now = new Date().toISOString();
    Object.keys(after).forEach(function(id){
      if (JSON.stringify(after[id]) !== JSON.stringify(before[id])) {
        if (after[id] && typeof after[id] === "object") after[id].ts = now;
        (pending[s] = pending[s] || {})[id] = after[id];
      }
    });
    origSet.call(this, k, JSON.stringify(after));
    clearTimeout(timer); timer = setTimeout(flush, 300);
  };

  // 開いた時・戻った時：保存先と重ねる
  function pull(){
    fetch(URL_, { headers: { "x-zs-key": KEY }, cache: "no-store" }).then(function(r){ return r.json(); }).then(function(srv){
      var changed = false, push = {};
      Object.keys(MAP).forEach(function(s){
        var L = readLS(MAP[s]), S = (srv && srv[s]) || {}, lch = false;
        Object.keys(S).forEach(function(id){ if (!L[id] || tsOf(S[id]) > tsOf(L[id])) { L[id] = S[id]; lch = true; } });
        Object.keys(L).forEach(function(id){ if (!S[id] || tsOf(L[id]) > tsOf(S[id])) (push[s] = push[s] || {})[id] = L[id]; });
        if (lch) { writeLS(MAP[s], L); changed = true; }
      });
      if (Object.keys(push).length) post(push);
      var done = false; try { done = sessionStorage.getItem(FLAG) === "1"; } catch(e){}
      if (changed && !done) { try { sessionStorage.setItem(FLAG, "1"); } catch(e){} location.reload(); }
      else if (!changed) { try { sessionStorage.removeItem(FLAG); } catch(e){} }
    }).catch(function(){});
  }
  pull();
  document.addEventListener("visibilitychange", function(){ if (!document.hidden) pull(); else flush(); });
  window.addEventListener("pagehide", flush);
})();
