"use strict";
// 財務整理の基準の数字を1か所で計算する（2026-09-19 Mits様指示「全ページが判定ページと TOP の1段目から読む」）。
// 読む順：zaimu_seiri_data.js → zaimu_seiri_state.js → zaimu_seiri_ichirangai_meisai.js → このファイル → zaimu_seiri_render.js
// TOP・年額・サブスク整理・継続経費・借入の返済は、出発点・Before・ゴール・継続をここから読む。ページに直書きしない。

var ZS_KIJUN = (function(){
  const A_ADJ       = 47018;   // 一覧の行に無い足し分：年払いを1〜7月の実額に直した差 41,082（Notion・Genspark・年会費・2026-09-19 Mits様確認）＋ DOCPRO 5,936（1〜7月の月平均 14,363 − 月割り 8,427・2026-09-19 年払いへ）
  const LOAN_BEFORE = 142286;  // 借入の返済（1〜7月の実額の月平均・2026-09-19 Mits様確認）
  const LOAN_LATEST = 43575;   // 今の月々の返済（2026-09-18 完済後）
  const LOAN_PRINCIPAL = 908570; // 残っている元金 合計（判明分）

  const M = (typeof ICHIRANGAI_MEISAI !== "undefined" && ICHIRANGAI_MEISAI) ? ICHIRANGAI_MEISAI : null;
  let saved = {}; try { saved = (SAVED_STATE && SAVED_STATE.ichirangai) || {}; } catch(e){}
  let local = {}; try { local = JSON.parse(localStorage.getItem("zaimu_seiri_ichirangai_decision_v1") || "{}") || {}; } catch(e){}
  const pick = id => { const s = saved[id], l = local[id]; if (s && l) return ((l.date||"") >= (s.date||"")) ? l : s; return l || s || null; };

  let b = 0, bKeep = 0, bCut = 0, bOnce = 0;
  const keepItems = [];
  ((M && M.items) || []).forEach(it => {
    const m = Number(it.monthly) || 0; b += m;
    const s = pick(it.id) || (it.status ? { status: it.status } : null);
    const st = s && s.status;
    if (st === "keep") { bKeep += m; keepItems.push(it); }
    else if (st === "cut") bCut += m;
    else if (st === "once") bOnce += m;
  });
  const toA = ((M && M.to_ichiran_a) || []).filter(x => !x.dup_of);   // 記録用（行は サブスク整理 の k2-47〜k2-59 に入れた）
  const addA = 0;

  // 一覧 A＝サブスク整理の区分2〜4 の行（対象外を除く）＋ 行に無い足し分。継続は今「継続」の行の合計
  let sp = {}; try { sp = (SAVED_STATE && SAVED_STATE.progress) || {}; } catch(e){}
  let lp = {}; try { lp = JSON.parse(localStorage.getItem("zaimu_seiri_progress_v1") || "{}") || {}; } catch(e){}
  const dt = x => (x && (x.status_date || x.done_date)) || "";
  const stOf = it => { const s = sp[it.id], l = lp[it.id]; const x = (s && l) ? (dt(l) >= dt(s) ? l : s) : (l || s);
    if (x) { if (x.status) return x.status; if (x.done === true) return "done"; if (x.done === false) return null; } return it.status || null; };
  let rowSum = 0, A_KEEP = 0;
  ["k2m","k2a","k3","k4"].forEach(k => (((typeof DATA !== "undefined") && DATA[k] && DATA[k].items) || []).forEach(it => {
    if (it.excluded === true) return;
    rowSum += it.amount || 0;
    if (stOf(it) === "keep") A_KEEP += it.amount || 0;
  }));
  const A_BASE  = rowSum + A_ADJ;
  const a       = A_BASE;                      // 2段目 一覧 A
  const start   = a + b;                       // 1段目 出発点（借入の返済を除く）
  const before  = start + LOAN_BEFORE;         // 1段目 Before
  const keepAll = A_KEEP + bKeep;              // 4段目 継続の合計
  const aRemain = a - A_KEEP;
  const bRemain = b - bKeep;
  const r4      = aRemain + bRemain;           // 4段目 削減対象総額
  const target1 = Math.round(r4 / 2);          // 5段目・8段目① 半分経営の削減目標
  const goal    = Math.round(start / 2);       // 6段目 ゴール（出発点の半分）
  const free    = goal - keepAll;              // 6段目 継続以外に使える額
  const target2 = r4 - free;                   // 8段目②

  return { A_BASE, A_ADJ, A_KEEP, rowSum, LOAN_BEFORE, LOAN_LATEST, LOAN_PRINCIPAL,
           addA, toA, a, b, bKeep, bCut, bOnce, keepItems,
           start, before, keepAll, aRemain, bRemain, r4, target1, goal, free, target2 };
})();

// 旧い固定値を読んでいた箇所のために、同じ名前へ基準の値を入れ直す（data.js には値を置かない）
BEFORE       = ZS_KIJUN.before;
LOAN_MONTHLY = ZS_KIJUN.LOAN_BEFORE;
A_BEFORE     = ZS_KIJUN.start;
if (typeof BASELINE_20260918 !== "undefined" && BASELINE_20260918) {
  BASELINE_20260918.before      = ZS_KIJUN.before;
  BASELINE_20260918.borrow      = ZS_KIJUN.LOAN_BEFORE;
  BASELINE_20260918.start       = ZS_KIJUN.start;
  BASELINE_20260918.keepOutside = ZS_KIJUN.bKeep;
  BASELINE_20260918.outside     = ZS_KIJUN.b;
}
