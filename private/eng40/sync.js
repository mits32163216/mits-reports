/* 英語40日プログラム クラウド同期レイヤ
 * ---------------------------------------------------------------------------
 * 目的：チェック入力は子どもの1端末でよいが、履歴・進捗は両親の別デバイスからも見たい。
 *       localStorage（端末ごとに分断）を Cloudflare Worker + KV で家族1 state に集約する。
 *
 * 使い方：各ページの <script src="./nav.js"> の直前に
 *         <script src="./sync.js"></script> を置くだけ。
 *
 * 設計：
 *   - 起動時 GET /state → サーバが新しければ localStorage に反映し、1回だけ reload
 *   - 書き込み（setItem/removeItem/clear）を hook し、debounce 1.5s で POST（全state送信）
 *   - API 不通・オフラインでも localStorage のみで完全に動作継続（画面は絶対に壊さない）
 *   - ?view=parent なら閲覧モード（入力を全部 disable・書き込みを no-op）
 *
 * Worker: eng40-sync-worker/src/index.js
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  // ==== 設定（同期先を変えるときはここだけ差し替える）====================
  var SYNC_URL   = 'https://eng40-sync.3216-fun.workers.dev/state';
  var SYNC_TOKEN = 'e5b16274f09ba16b29360d1270692031';
  var PUSH_DEBOUNCE_MS = 1500;
  var FETCH_TIMEOUT_MS = 8000;
  // =======================================================================

  var PREFIX    = 'eng40-';        // 同期対象キーの prefix
  var META_AT   = 'eng40sync-updatedAt';  // ローカルの最終更新時刻（PREFIX 外＝同期対象外）
  var RELOAD_FLAG = 'eng40sync-reloads';  // reload 暴走ガード（sessionStorage）
  var MAX_RELOADS = 2;

  var VIEW_ONLY = /[?&]view=parent(?:&|$)/.test(location.search);

  // localStorage 自体が使えない環境（プライベートブラウズ等）でも落とさない
  var LS = null;
  try {
    LS = window.localStorage;
    LS.setItem('eng40sync-probe', '1');
    LS.removeItem('eng40sync-probe');
  } catch (e) {
    LS = null;
  }

  var applying = false;   // サーバ反映中は push を抑止
  var pushTimer = null;
  var statusEl = null;
  var lastSyncedAt = 0;

  // ---- 素の localStorage メソッドを退避（hook 前に確保）----
  var rawSet, rawRemove, rawClear;
  if (LS) {
    rawSet    = LS.setItem.bind(LS);
    rawRemove = LS.removeItem.bind(LS);
    rawClear  = LS.clear.bind(LS);
  }

  // =====================================================================
  // state 収集 / 反映
  // =====================================================================

  function collectState() {
    var state = {};
    if (!LS) return state;
    for (var i = 0; i < LS.length; i++) {
      var k = LS.key(i);
      if (!k || k.indexOf(PREFIX) !== 0) continue;
      var v = LS.getItem(k);
      if (typeof v === 'string') state[k] = v;
    }
    return state;
  }

  function localUpdatedAt() {
    if (!LS) return 0;
    return Number(LS.getItem(META_AT)) || 0;
  }

  function markLocalUpdated(ts) {
    if (!LS) return;
    try { rawSet(META_AT, String(ts)); } catch (e) {}
  }

  /* サーバ state をローカルに反映する。実際に値が変わったら true を返す。 */
  function applyState(serverState) {
    if (!LS) return false;
    var changed = false;
    applying = true;
    try {
      var current = collectState();

      // サーバに無くなったキーはローカルからも消す（チェック解除を伝播させる）
      Object.keys(current).forEach(function (k) {
        if (!Object.prototype.hasOwnProperty.call(serverState, k)) {
          rawRemove(k);
          changed = true;
        }
      });

      Object.keys(serverState).forEach(function (k) {
        if (k.indexOf(PREFIX) !== 0) return;
        if (current[k] !== serverState[k]) {
          rawSet(k, serverState[k]);
          changed = true;
        }
      });
    } catch (e) {
      // 反映に失敗してもローカル動作は継続
    } finally {
      applying = false;
    }
    return changed;
  }

  // =====================================================================
  // 通信（失敗しても絶対に throw しない）
  // =====================================================================

  function timeoutSignal() {
    if (typeof AbortController !== 'function') return null;
    var ac = new AbortController();
    setTimeout(function () { try { ac.abort(); } catch (e) {} }, FETCH_TIMEOUT_MS);
    return ac.signal;
  }

  function apiUrl() {
    return SYNC_URL + '?key=' + encodeURIComponent(SYNC_TOKEN);
  }

  function pull() {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    var opt = { method: 'GET', cache: 'no-store' };
    var sig = timeoutSignal();
    if (sig) opt.signal = sig;
    return fetch(apiUrl(), opt)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function push() {
    if (!LS || typeof fetch !== 'function') return Promise.resolve(null);
    if (VIEW_ONLY) return Promise.resolve(null);   // 閲覧モードは絶対に書かない

    var ts = Date.now();
    var body = JSON.stringify({ state: collectState(), updatedAt: ts });
    var opt = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    };
    var sig = timeoutSignal();
    if (sig) opt.signal = sig;

    setStatus('sync');
    return fetch(apiUrl(), opt)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.ok) {
          markLocalUpdated(ts);
          lastSyncedAt = ts;
          setStatus('ok');
        } else {
          setStatus('off');
        }
        return j;
      })
      .catch(function () {
        setStatus('off');
        return null;
      });
  }

  function schedulePush() {
    if (applying || VIEW_ONLY) return;
    if (pushTimer) clearTimeout(pushTimer);
    setStatus('pending');
    pushTimer = setTimeout(function () {
      pushTimer = null;
      push();
    }, PUSH_DEBOUNCE_MS);
  }

  // =====================================================================
  // localStorage への書き込みを hook
  // =====================================================================

  /* 注意：単純代入（LS.setItem = fn）だと Storage インスタンスの
   * 「列挙可能な自前プロパティ」になり Object.keys(localStorage) に
   * setItem / removeItem / clear が現れてしまう。
   * enumerable:false で定義してキー列挙を汚さない。 */
  function define(obj, name, fn) {
    try {
      Object.defineProperty(obj, name, {
        value: fn, writable: true, enumerable: false, configurable: true,
      });
    } catch (e) {
      obj[name] = fn;   // 定義できない環境では従来どおり
    }
  }

  function installWriteHook() {
    if (!LS) return;

    define(LS, 'setItem', function (k, v) {
      if (VIEW_ONLY && String(k).indexOf(PREFIX) === 0) return;  // 閲覧モードは無視
      rawSet(k, v);
      if (!applying && String(k).indexOf(PREFIX) === 0) {
        markLocalUpdated(Date.now());
        schedulePush();
      }
    });

    define(LS, 'removeItem', function (k) {
      if (VIEW_ONLY && String(k).indexOf(PREFIX) === 0) return;
      rawRemove(k);
      if (!applying && String(k).indexOf(PREFIX) === 0) {
        markLocalUpdated(Date.now());
        schedulePush();
      }
    });

    define(LS, 'clear', function () {
      if (VIEW_ONLY) return;
      rawClear();
      if (!applying) {
        markLocalUpdated(Date.now());
        schedulePush();
      }
    });
  }

  // =====================================================================
  // 同期ステータス表示
  // =====================================================================

  var STATUS_CSS =
    '.eng40-sync-pill{' +
      'position:fixed;right:12px;bottom:12px;z-index:950;' +
      'font-family:"SF Mono",Menlo,monospace;font-size:11px;line-height:1;' +
      'padding:7px 11px;border-radius:999px;white-space:nowrap;' +
      'background:rgba(245,239,225,0.94);color:#0F1B2E;' +
      'border:1px solid rgba(15,27,46,0.14);' +
      'box-shadow:0 2px 10px rgba(15,27,46,0.10);' +
      'opacity:0.9;transition:opacity .2s;pointer-events:none;}' +
    '.eng40-sync-pill.off{background:rgba(199,123,112,0.16);border-color:rgba(199,123,112,0.5);}' +
    '.eng40-sync-pill.view{background:rgba(212,168,91,0.20);border-color:rgba(212,168,91,0.6);}' +
    '@media (prefers-color-scheme:dark){' +
      '.eng40-sync-pill{background:rgba(15,27,46,0.94);color:#F5EFE1;border-color:rgba(245,239,225,0.18);}}' +
    '@media (max-width:560px){.eng40-sync-pill{font-size:10px;padding:6px 9px;}}' +
    '.eng40-view-banner{' +
      'position:sticky;top:0;z-index:940;' +
      'background:rgba(212,168,91,0.18);border-bottom:1px solid rgba(212,168,91,0.5);' +
      'color:#0F1B2E;font-family:"Hiragino Sans","游ゴシック",sans-serif;font-size:12px;' +
      'padding:7px 16px;text-align:center;}' +
    '@media (prefers-color-scheme:dark){.eng40-view-banner{color:#F5EFE1;}}';

  function hhmm(ts) {
    var d = new Date(ts);
    var h = d.getHours(), m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function setStatus(kind) {
    if (!statusEl) return;
    statusEl.classList.remove('off', 'view');

    if (VIEW_ONLY) {
      statusEl.classList.add('view');
      statusEl.textContent = lastSyncedAt
        ? '👀 閲覧モード ' + hhmm(lastSyncedAt)
        : '👀 閲覧モード';
      return;
    }
    if (kind === 'ok') {
      statusEl.textContent = '☁️ 同期済み ' + hhmm(lastSyncedAt || Date.now());
    } else if (kind === 'sync') {
      statusEl.textContent = '☁️ 同期中…';
    } else if (kind === 'pending') {
      statusEl.textContent = '✏️ 保存待ち…';
    } else {
      statusEl.classList.add('off');
      statusEl.textContent = '⚠️ オフライン（この端末に保存）';
    }
  }

  function mountUi() {
    try {
      var style = document.createElement('style');
      style.textContent = STATUS_CSS;
      document.head.appendChild(style);

      statusEl = document.createElement('div');
      statusEl.className = 'eng40-sync-pill';
      statusEl.textContent = '☁️ 同期中…';
      document.body.appendChild(statusEl);

      if (VIEW_ONLY) {
        var banner = document.createElement('div');
        banner.className = 'eng40-view-banner';
        banner.textContent = '👀 閲覧モード（保護者用）— 記録の書き換えはできません';
        document.body.insertBefore(banner, document.body.firstChild);
      }
      setStatus(VIEW_ONLY ? 'view' : 'pending');
    } catch (e) {
      statusEl = null;   // UI が作れなくても同期本体は動かす
    }
  }

  // ---- 閲覧モード：入力を触れなくする ----
  function lockInputs() {
    if (!VIEW_ONLY) return;
    try {
      var nodes = document.querySelectorAll('input, textarea, select, button');
      Array.prototype.forEach.call(nodes, function (el) {
        var t = (el.getAttribute('type') || '').toLowerCase();
        if (el.tagName === 'INPUT' && (t === 'checkbox' || t === 'radio')) {
          el.disabled = true;
        } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.readOnly = true;
          el.disabled = true;
        } else if (el.tagName === 'SELECT' || el.tagName === 'BUTTON') {
          el.disabled = true;
        }
      });
    } catch (e) {}
  }

  // ---- 閲覧モードをページ移動でも維持する（nav.js のリンクに引き継ぐ）----
  function keepViewParam() {
    if (!VIEW_ONLY) return;
    try {
      var links = document.querySelectorAll('a[href$=".html"]');
      Array.prototype.forEach.call(links, function (a) {
        var href = a.getAttribute('href') || '';
        if (href.indexOf('view=parent') !== -1) return;
        a.setAttribute('href', href + (href.indexOf('?') === -1 ? '?' : '&') + 'view=parent');
      });
    } catch (e) {}
  }

  // =====================================================================
  // 起動
  // =====================================================================

  function reloadCount() {
    try { return Number(sessionStorage.getItem(RELOAD_FLAG)) || 0; } catch (e) { return MAX_RELOADS; }
  }
  function bumpReload() {
    try { sessionStorage.setItem(RELOAD_FLAG, String(reloadCount() + 1)); } catch (e) {}
  }

  function boot() {
    pull().then(function (res) {
      if (!res || !res.ok) { setStatus('off'); return; }

      var serverAt = Number(res.updatedAt) || 0;
      var localAt  = localUpdatedAt();

      // サーバが新しい（or ローカルが空）→ 取り込む
      if (serverAt > localAt || (serverAt > 0 && localAt === 0)) {
        var changed = applyState(res.state || {});
        markLocalUpdated(serverAt);
        lastSyncedAt = serverAt;
        setStatus('ok');

        // 画面はすでに旧データで描画済み → 実際に値が変わったときだけ1回リロード
        if (changed && reloadCount() < MAX_RELOADS) {
          bumpReload();
          location.reload();
        }
        return;
      }

      // ローカルが新しい → 送る（閲覧モードでは送らない）
      if (localAt > serverAt && !VIEW_ONLY) {
        push();
        return;
      }

      lastSyncedAt = serverAt || Date.now();
      setStatus('ok');
    });
  }

  // 描画前に hook を仕込む（各ページの inline script より先に読み込まれる前提）
  installWriteHook();

  function onReady() {
    mountUi();
    lockInputs();
    boot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  // nav.js は DOMContentLoaded で注入されるので、リンク書き換えは load 後に行う
  window.addEventListener('load', function () {
    keepViewParam();
    lockInputs();
  });

  // タブを閉じる / 離れる直前に未送信分を出し切る
  window.addEventListener('pagehide', function () {
    if (VIEW_ONLY || !pushTimer || !LS) return;
    clearTimeout(pushTimer);
    pushTimer = null;
    try {
      var ts = Date.now();
      var blob = new Blob(
        [JSON.stringify({ state: collectState(), updatedAt: ts })],
        { type: 'application/json' }
      );
      if (navigator.sendBeacon) {
        navigator.sendBeacon(apiUrl(), blob);
        markLocalUpdated(ts);
      }
    } catch (e) {}
  });
})();
