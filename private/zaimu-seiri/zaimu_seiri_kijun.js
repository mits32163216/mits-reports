"use strict";
// 財務整理の基準の数字を1か所で計算する（2026-09-19 Mits様指示「全ページが判定ページと TOP の1段目から読む」）。
// 読む順：zaimu_seiri_data.js → zaimu_seiri_state.js → zaimu_seiri_ichirangai_meisai.js → このファイル → zaimu_seiri_render.js
// TOP・年額・サブスク整理・継続経費・借入の返済は、出発点・Before・ゴール・継続をここから読む。ページに直書きしない。

var ZS_KIJUN = (function(){
  const A_ADJ       = 36107;   // 一覧の行に無い足し分：年払いを1〜8月の実額に直した差（1〜8月の実額÷8 − 月割り）＝ Notion 3,804 ＋ Genspark 9,944 ＋ Bonvoy 年会費 6,138 ＋ Delta 年会費 3,224 ＋ Hilton 年会費 2,734 ＋ Chase Sapphire 年会費 4,185 ＋ DOCPRO 4,214 ＋ GRAMMARLY 993 ＋ JALカード年会費 871（20,900÷8 − 1,742）（2026-09-19 8月締め。1〜7月は 47,018）
  const LOAN_BEFORE = 153465;  // 借入の返済（1〜8月の実額の月平均＝1,227,722÷8・ペイディ込み・2026-09-19 8月締め。1〜7月は 142,286）
  const LOAN_NOTE   = "各月の実額：1月 195,584 ／ 2月 120,820 ／ 3月 137,706 ／ 4月 146,489 ／ 5月 163,602 ／ 6月 148,927 ／ 7月 136,851 ／ 8月 177,743（5月から ペイディ 17,908 を含む）";
  const LOAN_LATEST = 77598;   // 2026-09-19 ⑤ ペイディ（MacBook Pro 24回・17,908）を追加。前 59690   // 今の月々の返済（④-1・④-2・④-3 完済後。① 楽天キャッシングリボの繰り上げ返済は 2026-09-19 取り消し）
  const LOAN_PRINCIPAL = 1656738; // 2026-09-19 ⑤ ペイディ 358,168（8月末）を追加。前 1298570 // 残っている元金 合計（判明分）＝楽天 822,200 ＋ Amex JP 476,370

  const M = (typeof ICHIRANGAI_MEISAI !== "undefined" && ICHIRANGAI_MEISAI) ? ICHIRANGAI_MEISAI : null;
  let saved = {}; try { saved = (SAVED_STATE && SAVED_STATE.ichirangai) || {}; } catch(e){}
  let local = {}; try { local = JSON.parse(localStorage.getItem("zaimu_seiri_ichirangai_decision_v1") || "{}") || {}; } catch(e){}
  const pick = id => { const s = saved[id], l = local[id]; if (s && l) return ((l.date||"") >= (s.date||"")) ? l : s; return l || s || null; };

  let b = 0, bKeep = 0, bCut = 0, bOnce = 0;
  const keepItems = [];
  const byCat = {};   // 大分類ごと {actual(月平均), total(集計期間の総額), keep, cut, once}
  Object.keys((M && M.caps) || {}).forEach(c => { byCat[c] = { actual: 0, total: 0, keep: 0, cut: 0, once: 0 }; });
  ((M && M.items) || []).forEach(it => {
    const m = Number(it.monthly) || 0; b += m;
    const s = pick(it.id) || (it.status ? { status: it.status } : null);
    const st = s && s.status;
    const bc = byCat[it.category] || (byCat[it.category] = { actual: 0, total: 0, keep: 0, cut: 0, once: 0 });
    bc.actual += m; bc.total += Number(it.total) || 0;
    if (st === "keep") { bKeep += m; keepItems.push(it); bc.keep += m; }
    else if (st === "cut") { bCut += m; bc.cut += m; }
    else if (st === "once") { bOnce += m; bc.once += m; }
  });
  const toA = ((M && M.to_ichiran_a) || []).filter(x => !x.dup_of);   // 記録用（行は サブスク整理 の k2-47〜k2-59 に入れた）
  const addA = 0;

  // 一覧 A＝サブスク整理の区分2〜4 の行（対象外を除く）＋ 行に無い足し分。継続は今「継続」の行の合計
  let sp = {}; try { sp = (SAVED_STATE && SAVED_STATE.progress) || {}; } catch(e){}
  let lp = {}; try { lp = JSON.parse(localStorage.getItem("zaimu_seiri_progress_v1") || "{}") || {}; } catch(e){}
  const dt = x => (x && (x.status_date || x.done_date)) || "";
  const stOf = it => { const s = sp[it.id], l = lp[it.id]; const x = (s && l) ? (dt(l) >= dt(s) ? l : s) : (l || s);
    if (x) { if (x.status) return x.status; if (x.done === true) return "done"; if (x.done === false) return null; } return it.status || null; };
  let rowSum = 0, A_KEEP = 0, aDone = 0, aHandled = 0;
  ["k2m","k2a","k3","k4"].forEach(k => (((typeof DATA !== "undefined") && DATA[k] && DATA[k].items) || []).forEach(it => {
    if (it.excluded === true) return;
    rowSum += it.amount || 0;
    const sa = stOf(it);
    if (sa === "keep") A_KEEP += it.amount || 0;
    else if (sa === "done") aDone += it.amount || 0;
    else if (sa === "handled") aHandled += it.amount || 0;
  }));
  // サブスク外の判定の「削る予定額（月）」の合計（保存ファイルとブラウザの入力の新しい方）
  let planSum = 0; const plans = {};
  (function(){
    let sv = {}; try { sv = (SAVED_STATE && SAVED_STATE.ichirangai_plan) || {}; } catch(e){}
    let lc = {}; try { lc = JSON.parse(localStorage.getItem("zaimu_seiri_ichirangai_plan_v1") || "{}") || {}; } catch(e){}
    const t = e => (e && (e.ts || e.date)) || "";
    new Set([...Object.keys(sv), ...Object.keys(lc)]).forEach(k => { const a = sv[k], b = lc[k]; const x = (a && b) ? (t(b) >= t(a) ? b : a) : (b || a); const n = (x && Number(x.plan)) || 0; const c = k.split("::")[0]; plans[c] = (plans[c] || 0) + n; planSum += n; });   // 「大分類::中分類」は大分類に足す（2026-09-19）
  })();
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

  const months = (M && M.months) || 7;
  const KIKAN = "1〜" + months + "月";   // 集計期間の表記（ページの「1〜N月」はここから入れる）
  return { KIKAN, LOAN_NOTE, A_BASE, A_ADJ, A_KEEP, rowSum, planSum, plans, byCat, aDone, aHandled, months, LOAN_BEFORE, LOAN_LATEST, LOAN_PRINCIPAL,
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

// ページの集計期間・借入の返済の表記を基準の値で埋める（1〜7月 → 1〜8月 のように、明細の months から決まる）
(function(){
  const K = ZS_KIJUN, f = n => Math.round(n).toLocaleString("ja-JP");
  const fill = () => {
    document.querySelectorAll(".zs-kikan").forEach(e => e.textContent = K.KIKAN);
    document.querySelectorAll(".zs-loan-before").forEach(e => e.textContent = f(K.LOAN_BEFORE));
    document.querySelectorAll(".zs-loan-note").forEach(e => e.textContent = K.LOAN_NOTE);
    document.querySelectorAll(".zs-loan-diff").forEach(e => e.textContent = f(K.LOAN_BEFORE - 139450));
  };
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill); else fill(); }
})();
