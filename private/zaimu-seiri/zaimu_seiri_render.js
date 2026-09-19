"use strict";

// ─── 共有定数：借入の月々返済（TOP と 借入.html の両方が参照する唯一の値） ───
// 2026-09-18：① 楽天キャッシングリボ + ④-1 8WEEKS.AI + ④-2/④-3 みたゆた ×2 完済後の値。
// 借入.html の borrow-divider・参考行、TOP の 6段目 借入返済箱、この4か所が同じ数字を読む。
// 借入が変わったら、ここ1か所を直せば全部が同期する。
const LOAN_MONTHLY_LATEST  = 43575;   // 現在の月々の返済（② + ③ + Amex US 利息 + 楽天その他）
const LOAN_MONTHLY_BEFORE  = 139450;  // 9/18 完済前（① + ④-1 + ④-2 + ④-3 が生きていた頃）
const LOAN_MONTHLY_LABEL   = "① ＋ ④-1 ＋ ④-2 ＋ ④-3 完済後";

const STORAGE_KEY   = "zaimu_seiri_progress_v1";
const OUTSIDE_KEY   = "zaimu_seiri_outside_v1";
const NOTES_KEY     = "zaimu_seiri_user_notes_v1";

// ─── SAVED_STATE：ファイルに残っている押し状態（zaimu_seiri_state.js が読み込まれる） ───
// data.js の後・render.js の前に読み込まれている。無い場合は空扱い。
function getSavedState() {
  try {
    if (typeof SAVED_STATE !== "undefined" && SAVED_STATE) return SAVED_STATE;
  } catch (e) {}
  return { progress: {}, outside: {}, notes: {}, saved_at: null };
}

// 2つの状態オブジェクトをマージする。id ごとに「新しい方（status_date）が勝つ」。
// 片方だけにあれば、そちらを採用。日付が無いエントリは、日付がある方に負ける。
function mergeStatusStore(saved, local) {
  const merged = {};
  const ids = new Set([...Object.keys(saved || {}), ...Object.keys(local || {})]);
  for (const id of ids) {
    const s = (saved || {})[id];
    const l = (local || {})[id];
    if (s && !l) { merged[id] = s; continue; }
    if (l && !s) { merged[id] = l; continue; }
    // 両方あるとき：日付の新しい方が勝つ
    const sd = (s && (s.status_date || s.done_date)) || "";
    const ld = (l && (l.status_date || l.done_date)) || "";
    if (ld > sd) merged[id] = l;
    else if (sd > ld) merged[id] = s;
    else merged[id] = l;  // 同点は localStorage 側を採用（手元の直近操作を尊重）
  }
  return merged;
}

// メモは日付を持たない・localStorage を優先し、無い分だけ SAVED_STATE から補う
function mergeNotesStore(saved, local) {
  return { ...(saved || {}), ...(local || {}) };
}

function loadUserNotes() {
  let local = {};
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw) local = JSON.parse(raw) || {};
  } catch (e) {}
  return mergeNotesStore(getSavedState().notes, local);
}
function saveUserNotes(obj) {
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(obj)); } catch (e) {}
}
function loadUserNote(id) {
  const all = loadUserNotes();
  return Object.prototype.hasOwnProperty.call(all, id) ? all[id] : null;
}
function setUserNote(id, text, defaultText) {
  const all = loadUserNotes();
  const trimmed = (text || "").replace(/\r/g,"").replace(/\n{3,}/g,"\n\n");
  if (trimmed === (defaultText || "")) {
    // default と同じなら localStorage から削除
    delete all[id];
  } else {
    all[id] = trimmed;
  }
  saveUserNotes(all);
}
function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}

function loadLocalProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (e) {
    return {};
  }
}
function loadState() {
  return mergeStatusStore(getSavedState().progress, loadLocalProgress());
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

function loadLocalOutside() {
  try {
    const raw = localStorage.getItem(OUTSIDE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (e) {
    return {};
  }
}
function loadOutsideState() {
  return mergeStatusStore(getSavedState().outside, loadLocalOutside());
}

// 状態取得（後方互換：古い { done:true } を "done" として読む）
function getStatus(item, state) {
  const s = state[item.id];
  if (s) {
    if (s.status) return s.status;
    if (s.done === true) return "done";
    if (s.done === false) return null;
  }
  return item.status || null;
}
function getStatusDate(item, state) {
  const s = state[item.id];
  if (s) {
    if (s.status_date) return s.status_date;
    if (s.done_date) return s.done_date;
  }
  return item.status_date || null;
}

function renderOutsideBreakdown() {
  const body = document.getElementById("m-outside-breakdown-body");
  if (!body) return;
  const list = (typeof OUTSIDE_BREAKDOWN !== "undefined" && Array.isArray(OUTSIDE_BREAKDOWN)) ? OUTSIDE_BREAKDOWN : [];
  if (list.length === 0) {
    body.innerHTML = '<span style="color:var(--sub);">内訳を集計中（BS-keiri が出す結果を待っています）</span>';
    return;
  }
  const rows = list.map(row => `<tr>
    <td style="padding:3px 8px;">${(row.category||"").replace(/</g,"&lt;")}</td>
    <td style="padding:3px 8px; text-align:right; font-family:'SF Mono',Menlo,monospace;">${(row.monthly||0).toLocaleString("ja-JP")}円</td>
    <td style="padding:3px 8px; color:var(--sub); font-size:11px;">${(row.detail||"").replace(/</g,"&lt;")}</td>
  </tr>`).join("");
  const total = list.reduce((a,b) => a + (b.monthly || 0), 0);
  body.innerHTML = `<table style="width:100%; border-collapse:collapse; font-size:12px;">
    <thead><tr style="color:var(--sub);">
      <th style="text-align:left; padding:3px 8px; border-bottom:1px solid var(--line);">分類</th>
      <th style="text-align:right; padding:3px 8px; border-bottom:1px solid var(--line);">月平均</th>
      <th style="text-align:left; padding:3px 8px; border-bottom:1px solid var(--line);">主な相手先</th>
    </tr></thead><tbody>${rows}</tbody>
    <tfoot><tr><td style="padding:4px 8px; border-top:1px solid var(--line); font-weight:bold;">合計</td>
      <td style="padding:4px 8px; text-align:right; border-top:1px solid var(--line); font-weight:bold; font-family:'SF Mono',Menlo,monospace;">${total.toLocaleString("ja-JP")}円</td>
      <td style="border-top:1px solid var(--line);"></td></tr></tfoot>
  </table>`;
}

function fmtYen(n) { return n.toLocaleString("ja-JP"); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function render() {
  const state = loadState();
  const container = document.getElementById("sections");
  if (container) container.innerHTML = "";
  let totalCount = 0, doneCount = 0, holdCount = 0, keepCount = 0, handledCount = 0, todoCount = 0;
  let totalCut = 0;
  let totalCutA = 0;   // A（借入返済を除く）だけの削減額
  let keepSum = 0;
  let handledSum = 0;

  // ページごとに表示するセクションを絞る。container の data-sections 属性で指定できる。
  // 未指定なら従来どおり全部（進捗表と互換）。
  const DEFAULT_SECTION_ORDER = ["k2m", "k2a", "k3", "k4", "k1"];
  let SECTION_ORDER = DEFAULT_SECTION_ORDER;
  if (container) {
    const attr = container.getAttribute && container.getAttribute("data-sections");
    if (attr) SECTION_ORDER = attr.split(",").map(s => s.trim()).filter(Boolean);
  }
  SECTION_ORDER.forEach(sectionKey => {
    const section = DATA[sectionKey];
    const isBorrow = (sectionKey === "k1"); // 区分1（借入返済）は 8割・累計の計算対象外
    const isAnnualSection = section.isAnnual === true; // 年払いセクションは8割線・累計を出さない
    // 借入セクションの直前に「借入の返済（別合計）」の区切りブロックを挿入
    if (isBorrow) {
      const divider = document.createElement("div");
      divider.className = "borrow-divider";
      divider.innerHTML = `
        <div class="pane pane-b" style="border-left-width:6px;">
          <div class="pane-title">借入の返済（別合計）── ランニングコストとは分けて集計</div>
          <div class="metrics">
            <div class="metric"><div class="label">月々の返済 <span style="color:#2e7d32;font-size:10px;font-weight:bold;">（${LOAN_MONTHLY_LABEL}）</span></div><div class="value">${fmtYen(LOAN_MONTHLY_LATEST)}<span class="yen">円</span><div class="sub-line">② Amex JP リボ 15,000 ／ ③ 楽天デンタル分割 17,288 ／ Amex US 利息 9,512 ／ その他 1,775<br><span style="color:#9aa1a8;font-size:10px;">前 115,623（− みたゆた×2 72,048）／ 前 123,335（− ④-1 8WEEKS.AI 7,712）／ 前 ${fmtYen(LOAN_MONTHLY_BEFORE)}（− ① 楽天キャッシングリボ 16,115）</span></div></div></div>
            <div class="metric"><div class="label">残っている元金 合計（判明分）<span style="color:#2e7d32;font-size:10px;font-weight:bold;">（${LOAN_MONTHLY_LABEL}）</span></div><div class="value">908,570<span class="yen">円</span><div class="sub-line">楽天 432,200（③ デンタル分割）＋ Amex JP 476,370（② リボのみ）（＋ Amex US 未確定）<br><span style="color:#9aa1a8;font-size:10px;">前 975,244（− みたゆた×2 66,674）／ 前 1,018,051（− 8WEEKS.AI 42,807）／ 前 1,408,051（− キャッシングリボ 390,000）</span></div></div></div>
          </div>
          <div class="pane-note" style="color:var(--sub);">
            返済は削減ではないので、上の A の数字には入れない。返済が終わると、この月々 ${fmtYen(LOAN_MONTHLY_LATEST)}円（${LOAN_MONTHLY_LABEL}前は ${fmtYen(LOAN_MONTHLY_BEFORE)}円） が家計から消える。
          </div>
        </div>`;
      if (container) container.appendChild(divider);
    }
    // 除外行（excluded:true）は集計から外す ── 表の末尾に灰色で表示する
    const excludedItems = section.items.filter(it => it.excluded === true);
    const nonExcluded   = section.items.filter(it => it.excluded !== true);
    // 継続（パン）とそれ以外を分ける ── 継続は表に出さず、集計だけ先に済ませて上部バナー＆別ページへ回す
    const activeItems = nonExcluded.filter(it => getStatus(it, state) !== "keep");
    const keepItems   = nonExcluded.filter(it => getStatus(it, state) === "keep");
    // 継続の集計を先に済ませる（totalCount / keepCount / keepSum に反映）
    keepItems.forEach(it => { totalCount++; keepCount++; keepSum += it.amount; });
    // 除外行は totalCount のみ加算（合計・8割線・累計・削減額など全ての金額集計から外す）
    excludedItems.forEach(() => { totalCount++; });
    const items = activeItems.concat(excludedItems); // 表に描画するのは（継続除く）+ 除外行を末尾に

    // 小計と 8割：継続（パン）を除いた合計だけを対象にする
    let secTotal = 0;
    activeItems.forEach(it => { secTotal += it.amount; });
    const secTotal80 = Math.ceil(secTotal * 0.8);
    let secKeepTotal = 0;
    keepItems.forEach(it => { secKeepTotal += it.amount; });
    // 年額合計（activeItems 中の年払いのうち annual_jpy が判明しているもの）
    let secAnnualTotal = 0;
    let secAnnualCount = 0;
    activeItems.forEach(it => {
      if (it.cycle === "annual" && typeof it.annual_jpy === "number") {
        secAnnualTotal += it.annual_jpy;
        secAnnualCount++;
      }
    });

    // 累計計算：activeItems の中を大きい順に上から足す
    let cum = 0;
    let secDoneTotal = 0;
    let p80LineIndex = -1;
    let hasP80 = false;
    items.forEach((it, i) => {
      if (it.excluded === true) {
        // 除外行は集計から完全に外す（totalCount は先に加算済み）
        it._cum = null;
        return;
      }
      const st = getStatus(it, state);
      totalCount++;
      if (st === "done") {
        doneCount++; secDoneTotal += it.amount; totalCut += it.amount;
        if (!isBorrow) totalCutA += it.amount;
      }
      else if (st === "hold") { holdCount++; }
      else if (st === "keep") { keepCount++; keepSum += it.amount; }
      else if (st === "handled") { handledCount++; handledSum += it.amount; }
      else { todoCount++; }

      if (!isBorrow && !isAnnualSection && st !== "keep") {
        cum += it.amount;
        it._cum = cum;
        if (!hasP80 && secTotal > 0 && cum >= secTotal80) { p80LineIndex = i; hasP80 = true; }
      } else {
        it._cum = null; // 借入セクション or 年払いセクション or 継続 → 累計に載せない
      }
    });

    const maxAmount = items.reduce((m, it) => Math.max(m, it.amount), 1);

    const secDiv = document.createElement("div");
    secDiv.className = "section";
    const head = document.createElement("div");
    head.className = "section-head";
    const keepNote = secKeepTotal > 0
      ? `<span style="color:var(--gray);"> ／ 継続（パン） ${fmtYen(secKeepTotal)}円 は除外</span>`
      : "";
    const annualNote = secAnnualCount > 0
      ? `<span style="color:var(--gold);"> ／ 年額合計（参考）${fmtYen(secAnnualTotal)}円（${secAnnualCount}件）</span>`
      : "";
    if (isBorrow) {
      head.innerHTML = `<h2>${section.title} <span style="font-size:11px;color:var(--gold);font-weight:normal;">（ここは返済。ランニングコストの削減とは別）</span></h2>
        <span class="section-sub">
          月々の返済合計 ${fmtYen(secTotal)}円
          （<span class="done-sub">完了 ${fmtYen(secDoneTotal)}円</span>）${keepNote}
        </span>`;
    } else if (isAnnualSection) {
      head.innerHTML = `<h2>${section.title} <span style="font-size:11px;color:var(--gold);font-weight:normal;">（次の更新日が近い順・8割線と累計は無し）</span></h2>
        <span class="section-sub">
          月割り小計 ${fmtYen(secTotal)}円
          <span style="color:var(--gold);"> ／ 年額合計 ${fmtYen(secAnnualTotal)}円（${secAnnualCount}件）</span>
          （<span class="done-sub">完了 月割り${fmtYen(secDoneTotal)}円</span>）${keepNote}
        </span>`;
    } else {
      head.innerHTML = `<h2>${section.title}</h2>
        <span class="section-sub">
          小計 ${fmtYen(secTotal)}円
          <span class="p80-sub">8割：${fmtYen(secTotal80)}円</span>
          （<span class="done-sub">完了 ${fmtYen(secDoneTotal)}円</span>）${keepNote}${annualNote}
        </span>`;
    }
    secDiv.appendChild(head);

    const table = document.createElement("table");
    table.innerHTML = `<thead><tr>
      <th style="width:170px;">状態</th>
      <th>名称</th>
      <th style="text-align:right;">月額</th>
      <th style="text-align:right;">年額</th>
      <th>横棒</th>
      <th style="text-align:right;">累計</th>
      <th>払っているところ</th>
      <th>メモ・備考（クリックで書き込み）</th>
      <th>最終決済日</th>
      <th>次の予定日</th>
      <th>完了日</th>
    </tr></thead>`;
    const tbody = document.createElement("tbody");
    items.forEach((it, i) => {
      const st = getStatus(it, state);
      const dt = getStatusDate(it, state);
      const tr = document.createElement("tr");
      const isExcluded = it.excluded === true;
      // 状態クラス
      if (isExcluded) tr.classList.add("st-excluded");
      else if (st === "done") tr.classList.add("st-done");
      else if (st === "hold") tr.classList.add("st-hold");
      else if (st === "keep") tr.classList.add("st-keep");
      else if (st === "handled") tr.classList.add("st-handled");
      // 8割の線より上の強調（線の行を含む）
      if (hasP80 && i <= p80LineIndex) tr.classList.add("above80");
      // 8割の線
      if (hasP80 && i === p80LineIndex) tr.classList.add("p80-line");

      const nameHtml = it.url
        ? `<a href="${it.url}" target="_blank" style="color:inherit;">${escapeHtml(it.name)}</a>`
        : escapeHtml(it.name);
      const notionHtml = it.notion_url
        ? `<a class="notion-link" href="${it.notion_url}" target="_blank" title="Notion 原本">Notion</a>`
        : "";
      const barPct = Math.round(it.amount / maxAmount * 100);
      const cumStr = it._cum === null ? "―" : (fmtYen(it._cum) + "円");

      const actionsCell = isExcluded
        ? `<td class="actions"><span class="badge-excluded">重複・集計外</span></td>`
        : `<td class="actions">
          <button data-id="${it.id}" data-act="handled" class="${st==='handled'?'on-handled':''}" title="手続き済み・課金停止待ち">対応済み</button>
          <button data-id="${it.id}" data-act="done" class="${st==='done'?'on-done':''}">完了</button>
          <button data-id="${it.id}" data-act="hold" class="${st==='hold'?'on-hold':''}">保留</button>
          <button data-id="${it.id}" data-act="keep" class="${st==='keep'?'on-keep':''}">継続（パン）</button>
        </td>`;
      tr.innerHTML = `${actionsCell}
        <td class="name">${nameHtml}${notionHtml}</td>
        <td class="amount">${fmtYen(it.amount)}円${it.cycle==='annual'?'<span class="badge-annual">年払い</span>':''}</td>
        <td class="annual-amt">${it.cycle==='annual' && it.annual_amount ? escapeHtml(it.annual_amount) : ""}</td>
        <td class="bar-cell"><div class="row-bar-outer"><div class="row-bar-inner" style="width:${barPct}%"></div></div></td>
        <td class="cum">${cumStr}</td>
        <td class="card">${escapeHtml(it.card || "")}</td>
        <td class="memo${loadUserNote(it.id)!==null?' user-note':''}" contenteditable="plaintext-only" data-id="${it.id}" data-default="${escapeAttr(it.memo || '')}">${escapeHtml(loadUserNote(it.id) !== null ? loadUserNote(it.id) : (it.memo || ''))}</td>
        <td class="paydate${it.last_paid && it.last_paid < "2026-08-01" ? " stale" : ""}">${it.last_paid || ""}</td>
        <td class="paydate">${(isAnnualSection && st === 'done') ? '—（解約済み）' : (it.next_due || '')}</td>
        <td class="date">${dt || ""}</td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    secDiv.appendChild(table);
    if (container) container.appendChild(secDiv);
  });

  // 借入セクション後の「参考」1行（家計全体の見当）
  const bottomLine = document.createElement("div");
  bottomLine.className = "bottom-total";
  const nowRunning = A_BEFORE - totalCutA;
  const nowTotal   = BEFORE - totalCut;
  bottomLine.innerHTML = `
    <span style="color:var(--sub);">参考：</span>
    ランニングコスト（A）<b>${fmtYen(nowRunning)}</b>円　＋　借入の返済 <b>${fmtYen(LOAN_MONTHLY_LATEST)}</b>円 <span style="color:#9aa1a8;font-size:10px;">（前 ${fmtYen(LOAN_MONTHLY_BEFORE)}・${LOAN_MONTHLY_LABEL}前）</span>　＝　今の月額 <b>${fmtYen(nowTotal - (LOAN_MONTHLY_BEFORE - LOAN_MONTHLY_LATEST))}</b>円
    <span style="color:var(--sub);">（出発点 945,213円）</span>
  `;
  if (container) container.appendChild(bottomLine);

  // 見つからない ID があっても no-op で通すヘルパー
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const nowA = A_BEFORE - totalCutA;

  // 1段目は 2026-09-18 の基準値（BASELINE_20260918）で HTML に固定表示。JS からは触らない。
  // 2段目：サーカス対象・削減対象B・削減対象A は固定値。削った額のみ動的。
  const BASE = (typeof BASELINE_20260918 !== "undefined") ? BASELINE_20260918 : { keptIds: [], targetA: 215612, keep: 107914 };
  const targetA = BASE.targetA || 215612;
  setText("m-eq2-cut", fmtYen(totalCut));                     // 削った額
  setText("m-eq2-done-count", doneCount);                     // 完了件数
  setText("m-eq2-remaining", fmtYen(targetA - totalCut));     // 残りの削減対象A

  // 対応済みが効いたときの月額（ランニング）= 削減額（＝対応済み分の月額合計）を大きく／件数を小さく
  setText("m-after-handled", fmtYen(handledSum));
  setText("m-after-handled-sub", `${handledCount}件`);

  // 借入の返済カード（k1 の全 amount 合計を自動計算）
  const k1Items = (DATA.k1 && DATA.k1.items) ? DATA.k1.items : [];
  const loanTotal = k1Items.reduce((a,b) => a + (b.amount || 0), 0);
  setText("m-loan-monthly", fmtYen(loanTotal));
  const findK1 = (id) => (k1Items.find(it => it.id === id) || {}).amount || 0;
  setText("m-loan-monthly-sub",
    `楽天 ${fmtYen(findK1("k1-01"))} ／ Amex JP ${fmtYen(findK1("k1-02"))} ／ Amex US 利息 ${fmtYen(findK1("k1-03"))}`);

  // 継続と決めた額（月額相当）── 9/18 固定 107,914円 ＋ 一覧外の継続（可変）
  const keepFrozen = BASE.keep || 107914;
  const outsideState = loadOutsideState();
  let outsideKeepSum = 0;
  let outsideKeepCount = 0;
  if (typeof OUTSIDE_BREAKDOWN !== "undefined") {
    OUTSIDE_BREAKDOWN.forEach(it => {
      if (it.residual === true) return;
      const s = outsideState[it.id];
      const st = s && (s.status || (s.done ? "done" : null)) || it.status || null;
      if (st === "keep") { outsideKeepSum += it.amount || 0; outsideKeepCount++; }
    });
  }
  const keepTotal = keepFrozen + outsideKeepSum;
  setText("m-keep-total", fmtYen(keepTotal));
  setText("m-keep-outside-sum", fmtYen(outsideKeepSum));
  setText("m-keep-outside-count", outsideKeepCount);
  setText("m-outside-keep-1dan", fmtYen(outsideKeepSum));   // 1段目「一覧外の継続」参考カード

  // 4段目：削減対象A（固定 215,612）＋ 残りの削減対象B（可変）＝ 半分経営するための削減対象総額
  // 一覧外の done 合計も別 localStorage から集める
  let outsideDoneSum = 0;
  if (typeof OUTSIDE_BREAKDOWN !== "undefined") {
    OUTSIDE_BREAKDOWN.forEach(it => {
      if (it.residual === true) return;
      const s = outsideState[it.id];
      const st = s && (s.status || (s.done ? "done" : null)) || it.status || null;
      if (st === "done") outsideDoneSum += it.amount || 0;
    });
  }
  const OUTSIDE_TOTAL_B = 482237;
  const remainingB = OUTSIDE_TOTAL_B - outsideKeepSum - outsideDoneSum;
  const targetTotal = targetA + remainingB;
  setText("m-b-keep", fmtYen(outsideKeepSum));
  setText("m-b-cut", fmtYen(outsideDoneSum));
  setText("m-remaining-b", fmtYen(remainingB));
  setText("m-remaining-b-inline", fmtYen(remainingB));
  setText("m-target-total", fmtYen(targetTotal));

  // 5段目：半分経営の削減目標 − (削った額＋対応済み) = 半分まで残り
  // Mits様指示（2026-09-18 訂正後）：継続 106,971・継続外 112,326・継続合計 219,297・削減対象総額 586,466・半分経営の削減目標 293,233
  const keepOutsideFrozen = (BASE.keepOutside !== undefined) ? BASE.keepOutside : 112326;
  const remainingBFrozen = OUTSIDE_TOTAL_B - keepOutsideFrozen;
  const targetTotalFrozen = 722706;   // 訂正後の固定値（805,763 − 219,297）
  const halfGoal = 361353;             // 訂正後の固定値（Math.round(586466/2)）
  const cutPlusHandled = totalCut + handledSum;
  const halfRemaining = halfGoal - cutPlusHandled;
  setText("m-half-goal", fmtYen(halfGoal));
  setText("m-cut-plus-handled", fmtYen(cutPlusHandled));
  setText("m-half-remaining", fmtYen(halfRemaining));

  // 5段目 真ん中の内訳（月払い／年払い・可変）
  // DATA と OUTSIDE_BREAKDOWN の中で status が done / handled の行を集める
  const doneHandled = [];
  Object.keys(DATA).forEach(sk => {
    (DATA[sk].items || []).forEach(it => {
      if (it.excluded === true) return;
      const st = getStatus(it, state);
      if (st === "done" || st === "handled") {
        doneHandled.push({ name: it.name, amount: it.amount || 0, cycle: it.cycle, status: st });
      }
    });
  });
  if (typeof OUTSIDE_BREAKDOWN !== "undefined") {
    OUTSIDE_BREAKDOWN.forEach(it => {
      if (it.residual === true) return;
      const s = outsideState[it.id];
      const st = s && (s.status || (s.done ? "done" : null)) || it.status || null;
      if (st === "done" || st === "handled") {
        doneHandled.push({ name: it.name || it.category, amount: it.amount || 0, cycle: it.cycle, status: st });
      }
    });
  }
  const monthly = doneHandled.filter(it => it.cycle !== "annual");
  const annual  = doneHandled.filter(it => it.cycle === "annual");
  const mSum = monthly.reduce((a,b) => a + b.amount, 0);
  const aSum = annual.reduce((a,b) => a + b.amount, 0);
  const bd = document.getElementById("m-cut-breakdown");
  if (bd) {
    bd.textContent = `月払い ${monthly.length}行 ${fmtYen(mSum)}円 ／ 年払い ${annual.length}行 ${fmtYen(aSum)}円（月割り）`;
  }

  // 6段目：半分経営の削減目標（固定）＋ 継続と決めた額の合計（固定）＋ 借入の返済（最新）＝ 合計
  // Mits様指示（2026-09-19 組み替え後）：293,233 ＋ 219,297 ＋ LOAN_MONTHLY_LATEST(43,575) ＝ 556,105
  const KEEP_SUB_CORRECTED = 129695;                                       // 進捗表の15行の月額合計（訂正後）
  const KEEP_TOTAL_FROZEN  = KEEP_SUB_CORRECTED + keepOutsideFrozen;       // 106,971 + 112,326 = 219,297
  const sixTotal = halfGoal + KEEP_TOTAL_FROZEN + LOAN_MONTHLY_LATEST;      // 293,233 + 219,297 + 43,575 = 556,105
  setText("m-6-half-goal", fmtYen(halfGoal));
  setText("m-6-keep-total", fmtYen(KEEP_TOTAL_FROZEN));
  setText("m-6-loan", fmtYen(LOAN_MONTHLY_LATEST));
  setText("m-6-loan-echo", fmtYen(LOAN_MONTHLY_LATEST));
  setText("m-6-total", fmtYen(sixTotal));
  // 旧ID（互換のため両方 set）── 旧 6段目 HTML を残しているページでも表示が崩れないように
  setText("m-6-keep-sub", fmtYen(KEEP_SUB_CORRECTED));
  setText("m-6-keep-out", fmtYen(keepOutsideFrozen));

  // 進捗バー：分子＝削った額＋対応済み（cutPlusHandled）／分母＝半分経営の削減目標（halfGoal）
  const pctRaw = halfGoal > 0 ? cutPlusHandled / halfGoal * 100 : 0;
  const pct = Math.min(100, Math.round(pctRaw * 10) / 10);  // 小数第1位で四捨五入
  setText("m-pct", pct + "%");
  const bar = document.getElementById("m-bar");
  if (bar) { bar.style.width = pct + "%"; if (pct >= 100) bar.classList.add("over"); else bar.classList.remove("over"); }

  // 件数行
  setText("m-todo-count", todoCount);
  setText("m-handled-count", handledCount);
  setText("m-done-count", doneCount);
  setText("m-hold-count", holdCount);
  setText("m-keep-count", keepCount);
  setText("m-total-count", totalCount);
  setText("m-cut", fmtYen(totalCut));

  // 継続バナー（別ページへの導線）
  const banner = document.getElementById("m-keep-banner");
  if (banner) {
    if (keepCount > 0) {
      banner.style.display = "block";
      setText("m-keep-banner-count", keepCount);
      setText("m-keep-banner-sum", fmtYen(keepSum));
    } else {
      banner.style.display = "none";
    }
  }

  // ボタンにイベント
  document.querySelectorAll('td.actions button').forEach(btn => {
    btn.addEventListener("click", onClickAct);
  });
  // メモ・備考 セルの編集
  document.querySelectorAll('td.memo[contenteditable]').forEach(el => {
    el.addEventListener("blur", onMemoBlur);
    el.addEventListener("keydown", onMemoKey);
  });
}

function onMemoBlur(e) {
  const el = e.currentTarget;
  const id = el.getAttribute("data-id");
  const def = el.getAttribute("data-default") || "";
  const text = el.innerText.trim();
  setUserNote(id, text, def);
  if (text !== def && text.length > 0) el.classList.add("user-note");
  else el.classList.remove("user-note");
}
function onMemoKey(e) {
  if (e.key === "Escape") { e.currentTarget.blur(); }
  if (e.key === "Enter" && e.metaKey) { e.currentTarget.blur(); }
}

function onClickAct(e) {
  const id = e.currentTarget.getAttribute("data-id");
  const act = e.currentTarget.getAttribute("data-act");
  const state = loadState();
  const cur = state[id] && (state[id].status || (state[id].done ? "done" : null));
  if (cur === act) {
    // 同じボタンをもう一度 → 未着手に戻す
    state[id] = { status: null, status_date: null };
  } else {
    state[id] = { status: act, status_date: todayStr() };
  }
  saveState(state);
  render();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}

function exportJSON() {
  const state = loadState();
  const out = [];
  Object.keys(DATA).forEach(sk => {
    DATA[sk].items.forEach(it => {
      const st = getStatus(it, state);
      if (st) {
        out.push({
          id: it.id, name: it.name, amount: it.amount,
          status: st, status_date: getStatusDate(it, state),
          notion_url: it.notion_url || null
        });
      }
    });
  });
  const text = JSON.stringify(out, null, 2);
  const pre = document.getElementById("export-out");
  pre.textContent = text;
  pre.style.display = "block";
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      pre.textContent = "コピーしました：\n\n" + text;
    }).catch(() => {});
  }
}

// 最終更新時刻の表示
function updateTopnavTime() {
  const el = document.getElementById("topnav-time");
  if (!el) return;
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  el.textContent = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 継続と決めた額の内訳（月払い ／ 年払い）── TOP 2段目 継続 と 3段目 一覧外継続 に注入
function renderKeepBreakdown() {
  if (typeof DATA === "undefined") return;
  if (typeof BASELINE_20260918 === "undefined") return;
  const keptIds = new Set(BASELINE_20260918.keptIds || []);
  const ANNUAL_LIKE_IDS = new Set(["k2-36"]); // ムームードメイン（irregular・年更新）は年払い扱い
  let subMonthly = 0, subAnnual = 0;
  Object.keys(DATA).forEach(sk => {
    (DATA[sk].items || []).forEach(it => {
      if (it.excluded === true) return;
      if (!keptIds.has(it.id)) return;
      const isAnnualLike = it.cycle === "annual" || ANNUAL_LIKE_IDS.has(it.id);
      if (isAnnualLike) subAnnual += it.amount || 0;
      else              subMonthly += it.amount || 0;
    });
  });
  const kb = document.getElementById("m-keep-breakdown");
  if (kb) kb.textContent = `月払い ${fmtYen(subMonthly)}円 ／ 年払い ${fmtYen(subAnnual)}円（月割り）`;

  const outsideKeepIds = new Set(["o-01", "o-02", "o-03"]);
  let outMonthly = 0, outAnnual = 0;
  if (typeof OUTSIDE_BREAKDOWN !== "undefined") {
    OUTSIDE_BREAKDOWN.forEach(it => {
      if (!outsideKeepIds.has(it.id)) return;
      if (it.cycle === "annual") outAnnual += it.amount || 0;
      else                        outMonthly += it.amount || 0;
    });
  }
  const okb = document.getElementById("m-keepout-breakdown");
  if (okb) okb.textContent = `月払い ${fmtYen(outMonthly)}円 ／ 年払い ${fmtYen(outAnnual)}円`;
}

// 月別の実績（MONTHLY_ACTUAL）── TOP の進み具合バーの下に、表と棒グラフを出す。
// 表：月／出ていった総額／私用（事業主貸）／借入の返済／単発（5万円以上の外注）／ランニング。
// 最終行に 1〜N 月の平均を追加。棒はランニングの月次推移で、出発点 805,763 と目標 512,530
// の縦線、直近3ヶ月平均の横棒を添える。data.js は触らない前提で、この関数だけで完結する。
function renderMonthlyActual() {
  if (typeof MONTHLY_ACTUAL === "undefined" || !Array.isArray(MONTHLY_ACTUAL)) return;
  const tbody = document.getElementById("monthly-actual-tbody");
  const barBox = document.getElementById("monthly-actual-bar");
  if (!tbody || !barBox) return;
  const rows = MONTHLY_ACTUAL;
  const n = rows.length;
  if (n === 0) { tbody.innerHTML = ""; barBox.innerHTML = ""; return; }

  // 平均（1〜N 月）
  const sum = rows.reduce((a, m) => ({
    total: a.total + (m.total || 0),
    jigyounushi_kashi: a.jigyounushi_kashi + (m.jigyounushi_kashi || 0),
    borrow: a.borrow + (m.borrow || 0),
    one_off: a.one_off + (m.one_off || 0),
    running: a.running + (m.running || 0)
  }), { total:0, jigyounushi_kashi:0, borrow:0, one_off:0, running:0 });
  const avg = {
    total: Math.round(sum.total / n),
    jigyounushi_kashi: Math.round(sum.jigyounushi_kashi / n),
    borrow: Math.round(sum.borrow / n),
    one_off: Math.round(sum.one_off / n),
    running: Math.round(sum.running / n)
  };

  // 表
  const monthLabel = m => {
    const s = String(m.month || "");
    // "2026-07" → "7月"
    const mm = /^\d{4}-(\d{2})$/.exec(s);
    return mm ? (parseInt(mm[1], 10) + "月") : s;
  };
  const trs = rows.map(m => `<tr>
    <td>${escapeHtml(monthLabel(m))}</td>
    <td class="amount">${fmtYen(m.total || 0)}円</td>
    <td class="amount">${fmtYen(m.jigyounushi_kashi || 0)}円</td>
    <td class="amount">${fmtYen(m.borrow || 0)}円</td>
    <td class="amount">${fmtYen(m.one_off || 0)}円</td>
    <td class="amount">${fmtYen(m.running || 0)}円</td>
  </tr>`).join("");
  const firstNum = /^\d{4}-(\d{2})$/.exec(rows[0].month || "");
  const lastNum  = /^\d{4}-(\d{2})$/.exec(rows[n-1].month || "");
  const avgLabel = (firstNum && lastNum)
    ? `${parseInt(firstNum[1],10)}〜${parseInt(lastNum[1],10)}月の平均`
    : "平均";
  const avgTr = `<tr style="background:#f0ede4; font-weight:bold;">
    <td style="border-top:2px solid var(--navy);">${escapeHtml(avgLabel)}</td>
    <td class="amount" style="border-top:2px solid var(--navy);">${fmtYen(avg.total)}円</td>
    <td class="amount" style="border-top:2px solid var(--navy);">${fmtYen(avg.jigyounushi_kashi)}円</td>
    <td class="amount" style="border-top:2px solid var(--navy);">${fmtYen(avg.borrow)}円</td>
    <td class="amount" style="border-top:2px solid var(--navy);">${fmtYen(avg.one_off)}円</td>
    <td class="amount" style="border-top:2px solid var(--navy);">${fmtYen(avg.running)}円</td>
  </tr>`;
  tbody.innerHTML = trs + avgTr;

  // 棒グラフ（ランニングの月次推移）
  const START_POINT = 981465;              // 出発点（1段目 eq-start と同じ値）
  const HALF_GOAL   = 361353;              // 半分経営の削減目標
  const GOAL        = START_POINT - HALF_GOAL;  // 512,530
  const last3 = rows.slice(-3);
  const last3Avg = last3.length > 0
    ? Math.round(last3.reduce((a,m) => a + (m.running || 0), 0) / last3.length)
    : 0;
  const maxRun = Math.max(...rows.map(m => m.running || 0), START_POINT);
  const maxVal = maxRun * 1.08;  // 右側に余白
  const pctOf = v => (v / maxVal * 100).toFixed(2);
  const startPct = pctOf(START_POINT);
  const goalPct  = pctOf(GOAL);

  const barRow = (label, value, color, isMeta) => {
    const pct = pctOf(value);
    const labelColor = isMeta ? "var(--gold)" : "var(--sub)";
    const valueColor = isMeta ? "var(--gold)" : "var(--ink)";
    const extraStyle = isMeta ? "padding-top:8px; margin-top:6px; border-top:1px dashed var(--line);" : "";
    return `<div style="display:flex; align-items:center; margin-bottom:4px; font-size:11px; ${extraStyle}">
      <div style="width:110px; color:${labelColor}; ${isMeta?'font-weight:bold;':''}">${escapeHtml(label)}</div>
      <div style="flex:1; height:18px; background:#f0ede4; border-radius:3px; position:relative;">
        <div style="width:${pct}%; height:100%; background:${color}; border-radius:3px;"></div>
        <div style="position:absolute; top:-3px; bottom:-3px; left:${startPct}%; width:2px; background:var(--red); z-index:2;" title="出発点 ${fmtYen(START_POINT)}円"></div>
        <div style="position:absolute; top:-3px; bottom:-3px; left:${goalPct}%; width:2px; background:var(--green); z-index:2;" title="目標 ${fmtYen(GOAL)}円"></div>
      </div>
      <div style="width:120px; text-align:right; font-family:'SF Mono',Menlo,monospace; color:${valueColor}; ${isMeta?'font-weight:bold;':''}">${fmtYen(value)}円</div>
    </div>`;
  };

  const bars = rows.map(m => barRow(monthLabel(m), m.running || 0, "linear-gradient(90deg,#4a7c59,#2e7d32)", false)).join("");
  const last3Bar = barRow("直近3ヶ月平均", last3Avg, "var(--gold)", true);

  const legend = `<div style="margin-top:10px; font-size:11px; color:var(--sub); display:flex; flex-wrap:wrap; gap:16px;">
    <span><span style="display:inline-block; width:14px; height:2px; background:var(--red); vertical-align:middle; margin-right:4px;"></span>出発点 ${fmtYen(START_POINT)}円</span>
    <span><span style="display:inline-block; width:14px; height:2px; background:var(--green); vertical-align:middle; margin-right:4px;"></span>目標 ${fmtYen(GOAL)}円（${fmtYen(START_POINT)} − ${fmtYen(HALF_GOAL)}）</span>
    <span><span style="display:inline-block; width:14px; height:6px; background:var(--gold); vertical-align:middle; margin-right:4px;"></span>直近3ヶ月平均 ${fmtYen(last3Avg)}円</span>
  </div>`;

  barBox.innerHTML = `<div style="font-size:12px; color:var(--sub); margin-bottom:8px;">ランニングの月次推移（棒＝各月・縦線＝基準）</div>${bars}${last3Bar}${legend}`;
}

// ─── 状態のファイル保存（Blob + a[download] で zaimu_seiri_state.js を落とす） ───
// 押した瞬間の SAVED_STATE + localStorage をマージした最新状態を、
// var SAVED_STATE = {...} の形の JS として書き出す。
// ダウンロード先は Chrome の設定に従う（Mits様は ~/Downloads）。
// 参謀が Downloads から 04_口座・明細/ に手動で移す。
function buildSavedStateJS() {
  const saved = getSavedState();
  const merged = {
    progress: mergeStatusStore(saved.progress || {}, loadLocalProgress()),
    outside:  mergeStatusStore(saved.outside  || {}, loadLocalOutside()),
    notes:    mergeNotesStore(saved.notes    || {}, (function(){
      try { return JSON.parse(localStorage.getItem(NOTES_KEY) || "{}") || {}; } catch(e){ return {}; }
    })()),
    saved_at: new Date().toISOString()
  };
  const body = JSON.stringify(merged, null, 2);
  return `"use strict";
// 状態の保存ファイル（zaimu_seiri_state.js）
//
// data.js の後・render.js の前に読み込む。SAVED_STATE をベースにして、
// ブラウザの localStorage に残っている操作を「新しい方が勝ち」で重ねる。
//
// このファイルは、TOP か進捗表の「💾 状態をファイルに保存」ボタンで生成する。
// Chrome の Downloads に落ちるので、参謀が 04_口座・明細/ に手動で移す。

var SAVED_STATE = ${body};
`;
}

function saveStateToFile() {
  const text = buildSavedStateJS();
  const blob = new Blob([text], { type: "application/javascript;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "zaimu_seiri_state.js";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  // 保存直後に画面上の「最後の保存」表示も更新する（次に SAVED_STATE が読まれた時までは、
  // 実体は差し替わっていないが、Mits様が押した時刻を見せる方が正しい）
  const el = document.getElementById("save-state-time");
  if (el) el.textContent = formatSavedAt(new Date().toISOString()) + "（ダウンロード済み・要ファイル差し替え）";
}

function formatSavedAt(iso) {
  if (!iso) return "未保存";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "未保存";
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch (e) { return "未保存"; }
}

// 「💾 状態をファイルに保存」ボタン ＋「最後の保存」表示を、
// #save-state-bar があるページに注入する（TOP・進捗表）。
function initSaveStateBar() {
  const bar = document.getElementById("save-state-bar");
  if (!bar) return;
  const saved = getSavedState();
  const at = saved && saved.saved_at ? formatSavedAt(saved.saved_at) : "未保存（ファイルに未反映）";
  bar.innerHTML = `
    <button type="button" id="save-state-btn" style="padding:6px 12px;font-size:13px;background:#f5efe0;border:1px solid var(--gold, #b08d3a);border-radius:4px;cursor:pointer;font-weight:bold;">💾 状態をファイルに保存</button>
    <span style="margin-left:10px;font-size:12px;color:var(--sub, #6b7078);">最後の保存 <b id="save-state-time" style="color:var(--navy, #223);">${at}</b></span>
    <span style="margin-left:8px;font-size:11px;color:var(--sub, #6b7078);">（Chrome の Downloads に落ちます・参謀が 04_口座・明細/ に移します）</span>
  `;
  const btn = document.getElementById("save-state-btn");
  if (btn) btn.addEventListener("click", saveStateToFile);
}

render();
renderKeepBreakdown();
renderMonthlyActual();
updateTopnavTime();
initSaveStateBar();

// 別タブでの状態変化・タブ復帰・focus で即時再描画（TOP と進捗表が同期する）
function _refreshAll() { render(); renderKeepBreakdown(); renderMonthlyActual(); updateTopnavTime(); }
const _WATCHED_KEYS = ["zaimu_seiri_progress_v1", "zaimu_seiri_outside_v1", "zaimu_seiri_user_notes_v1"];
window.addEventListener("storage", (e) => {
  if (!e.key) { _refreshAll(); return; }
  if (_WATCHED_KEYS.includes(e.key)) _refreshAll();
});
document.addEventListener("visibilitychange", () => { if (!document.hidden) _refreshAll(); });
window.addEventListener("focus", () => _refreshAll());
