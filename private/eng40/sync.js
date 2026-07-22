/* 英語40日プログラム クラウド同期レイヤ v3（マルチ家族対応）
 * ---------------------------------------------------------------------------
 * 目的：チェック入力は子どもの1端末でよいが、履歴・進捗は両親の別デバイスからも見たい。
 *       localStorage（端末ごとに分断）を Cloudflare Worker + KV で家族1 state に集約する。
 *
 * 使い方：各ページの <script src="./nav.js?v=2"> の直前に
 *         <script src="./sync.js?v=2"></script> を置くだけ。
 *
 * v2 の変更（モバイルで1件も届かない問題への対策）:
 *   1. 離脱時 flush：visibilitychange(hidden) / pagehide / blur で即 flush。
 *      送信は fetch(keepalive:true)。旧実装の sendBeacon(application/json) は
 *      preflight が必要になり CORS で黙って落ちるため廃止。
 *   2. debounce 1500ms → 600ms（モバイルはタイマーが凍結されやすい）。
 *   3. サーバ時刻権威：updatedAt はサーバが刻む。端末の時計ずれで捨てられない。
 *      拒否（409 empty_overwrite_blocked 等）は「同期できず」と可視化する。
 *   4. デバッグ：同期ピルをタップすると直近の試行ログを表示。console にも
 *      [eng40sync] prefix で全部出す。
 *
 * v3 の変更（マルチ家族対応・2026-07-22）:
 *   1. URL の ?f=<familyId> で家族を識別。API には &f= を必ず付ける。
 *      familyId は localStorage["eng40cfg-family"] に保存（"eng40-" prefix では
 *      ないので同期対象キーには絶対に入らない）。
 *   2. ?f= が無ければ保存済み familyId を使う。どちらも無ければ「未設定」状態で
 *      通信を一切行わず、セットアップ導線だけ出す（他家族のデータを読み書きしない）。
 *   3. ?f= が保存済みと違う → 家族の切替とみなし、ローカルの eng40- キーを全消去
 *      してから新しい家族を pull する（旧家族のデータを新家族へ混ぜないため）。
 *   4. ?view=parent との併用（?f=xxx&view=parent）はそのまま動く。
 *
 * Worker: worker/src/index.js
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  // ==== 設定（同期先を変えるときはここだけ差し替える）====================
  var SYNC_URL   = 'https://eng40-sync.3216-fun.workers.dev/state';
  var SYNC_TOKEN = 'e5b16274f09ba16b29360d1270692031';
  var PUSH_DEBOUNCE_MS = 600;
  var FETCH_TIMEOUT_MS = 8000;
  // =======================================================================

  var PREFIX      = 'eng40-';               // 同期対象キーの prefix
  var META_AT     = 'eng40sync-serverAt';   // 最後に把握したサーバ updatedAt（PREFIX 外＝同期対象外）
  var META_DIRTY  = 'eng40sync-dirty';      // 未送信のローカル変更あり
  var RELOAD_FLAG = 'eng40sync-reloads';    // reload 暴走ガード（sessionStorage）
  var MAX_RELOADS = 2;

  // ---- 家族ID（マルチ家族対応 v3）----------------------------------------
  // 'eng40cfg-family' は 'eng40-' で始まらない → 同期 state には絶対に載らない。
  var FAMILY_KEY  = 'eng40cfg-family';
  var FAMILY_RE   = /^[a-z0-9]{6,32}$/;
  var LEGACY_FAMILY = 'mits';               // 旧 eng40:state の移行先（4文字だが常に有効）
  var ID_CHARS    = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var ID_LEN      = 16;

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
  var inFlight = false;

  // ---- 素の localStorage メソッドを退避（hook 前に確保）----
  var rawSet, rawRemove, rawClear;
  if (LS) {
    rawSet    = LS.setItem.bind(LS);
    rawRemove = LS.removeItem.bind(LS);
    rawClear  = LS.clear.bind(LS);
  }

  // =====================================================================
  // デバッグログ（モバイルで自己申告できるようにする）
  // =====================================================================

  var LOGS = [];
  var MAX_LOGS = 30;

  function clock(ts) {
    var d = new Date(ts || Date.now());
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function log(kind, detail) {
    var line = clock() + ' ' + kind + (detail ? ' ' + detail : '');
    LOGS.push(line);
    if (LOGS.length > MAX_LOGS) LOGS.shift();
    try { console.log('[eng40sync] ' + line); } catch (e) {}
  }

  function debugText() {
    var head =
      'eng40sync v3 デバッグ\n' +
      'UA: ' + (navigator.userAgent || '').slice(0, 90) + '\n' +
      'online: ' + (navigator.onLine === false ? 'NO' : 'yes') +
      ' / localStorage: ' + (LS ? 'ok' : 'NG') +
      ' / 閲覧モード: ' + (VIEW_ONLY ? 'YES' : 'no') + '\n' +
      '家族ID: ' + (FAMILY ? '…' + FAMILY.slice(-4) + '（設定済み）' : '未設定') + '\n' +
      'ローカルキー数: ' + Object.keys(collectState()).length +
      ' / 未送信: ' + (isDirty() ? 'あり' : 'なし') + '\n' +
      'サーバ updatedAt: ' + (lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : '未取得') +
      '\n\n--- 直近の同期試行 ---\n';
    return head + (LOGS.length ? LOGS.join('\n') : '(まだ記録なし)');
  }

  // =====================================================================
  // 家族ID（マルチ家族対応）
  // ---------------------------------------------------------------------
  // 優先順： URL ?f=xxx  →  localStorage['eng40cfg-family']  →  未設定
  // 未設定のときは通信を一切しない（他家族のデータを読まない・書かない）。
  // =====================================================================

  function validFamily(id) {
    var s = String(id || '').toLowerCase();
    if (!s) return '';
    if (s === LEGACY_FAMILY) return s;
    return FAMILY_RE.test(s) ? s : '';
  }

  function newFamilyId() {
    var out = '', i;
    var buf = null;
    try {
      if (window.crypto && window.crypto.getRandomValues) {
        buf = new Uint8Array(ID_LEN);
        window.crypto.getRandomValues(buf);
      }
    } catch (e) { buf = null; }
    for (i = 0; i < ID_LEN; i++) {
      var n = buf ? buf[i] : Math.floor(Math.random() * 256);
      out += ID_CHARS.charAt(n % ID_CHARS.length);
    }
    return out;
  }

  function familyFromUrl() {
    var m = /[?&]f=([^&#]*)/.exec(location.search);
    if (!m) return '';
    var raw = m[1];
    try { raw = decodeURIComponent(raw); } catch (e) {}
    return validFamily(raw);
  }

  function storedFamily() {
    if (!LS) return '';
    try { return validFamily(LS.getItem(FAMILY_KEY)); } catch (e) { return ''; }
  }

  function saveFamily(id) {
    if (!LS) return;
    try { rawSet(FAMILY_KEY, id); } catch (e) {}
  }

  /* 家族を切り替えるとき、旧家族のローカルデータを残すと新家族へ push されて
   * 混ざる。PREFIX キーと同期メタを全消去してから新家族を pull する。 */
  function wipeLocalFamilyData() {
    if (!LS) return 0;
    var doomed = [], i, k;
    try {
      for (i = 0; i < LS.length; i++) {
        k = LS.key(i);
        if (k && k.indexOf(PREFIX) === 0) doomed.push(k);
      }
      for (i = 0; i < doomed.length; i++) rawRemove(doomed[i]);
      rawRemove(META_AT);
      rawRemove(META_DIRTY);
    } catch (e) {}
    return doomed.length;
  }

  function resolveFamily() {
    var fromUrl = familyFromUrl();
    var saved   = storedFamily();
    if (fromUrl) {
      if (saved && saved !== fromUrl) {
        var n = wipeLocalFamilyData();
        try { console.log('[eng40sync] family switch: 旧データ ' + n + ' 件を消去'); } catch (e) {}
      }
      saveFamily(fromUrl);
      return fromUrl;
    }
    return saved;   // '' なら未設定
  }

  var FAMILY = resolveFamily();

  /* familyId 付きのサイトURL（家族の他の端末に渡す用） */
  function familyUrl(id) {
    var base = location.origin + location.pathname.replace(/[^/]*$/, 'index.html');
    return base + '?f=' + encodeURIComponent(id);
  }

  /* この端末を id の家族として登録し、?f= 付きURLに置き換えて読み込み直す */
  function adoptFamily(id) {
    var v = validFamily(id);
    if (!v) return false;
    saveFamily(v);
    var url = familyUrl(v);
    if (VIEW_ONLY) url += '&view=parent';
    try { location.replace(url); } catch (e) { location.href = url; }
    return true;
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

  function serverAtLocal() {
    if (!LS) return 0;
    return Number(LS.getItem(META_AT)) || 0;
  }

  function markServerAt(ts) {
    if (!LS) return;
    try { rawSet(META_AT, String(ts)); } catch (e) {}
  }

  function isDirty() {
    if (!LS) return false;
    try { return LS.getItem(META_DIRTY) === '1'; } catch (e) { return false; }
  }

  function setDirty(on) {
    if (!LS) return;
    try {
      if (on) rawSet(META_DIRTY, '1');
      else rawRemove(META_DIRTY);
    } catch (e) {}
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

  function apiUrl(extra) {
    return SYNC_URL +
      '?key=' + encodeURIComponent(SYNC_TOKEN) +
      '&f=' + encodeURIComponent(FAMILY) +
      (extra || '');
  }

  function pull() {
    if (!FAMILY) {
      log('GET skip', '家族ID 未設定');
      return Promise.resolve(null);
    }
    if (typeof fetch !== 'function') {
      log('GET skip', 'fetch 非対応');
      return Promise.resolve(null);
    }
    var opt = { method: 'GET', cache: 'no-store' };
    var sig = timeoutSignal();
    if (sig) opt.signal = sig;
    log('GET →');
    return fetch(apiUrl(), opt)
      .then(function (r) {
        var st = r.status;
        return r.json().catch(function () { return null; }).then(function (j) {
          log('GET ←', 'HTTP ' + st + ' keys=' +
            (j && j.state ? Object.keys(j.state).length : '?') +
            ' updatedAt=' + (j && j.updatedAt || 0));
          return r.ok ? j : null;
        });
      })
      .catch(function (e) {
        log('GET ✗', String(e && e.message || e));
        return null;
      });
  }

  /* push 本体。keepalive:true でページ離脱後も送信を完了させる。 */
  function push(reason) {
    if (!LS || typeof fetch !== 'function') return Promise.resolve(null);
    if (VIEW_ONLY) return Promise.resolve(null);   // 閲覧モードは絶対に書かない
    if (!FAMILY) {                                  // 家族未設定は誰のデータも書かない
      log('POST skip', '家族ID 未設定');
      setStatus('nofamily');
      return Promise.resolve(null);
    }

    var state = collectState();
    var nKeys = Object.keys(state).length;
    var ts = Date.now();
    var opt = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: state, updatedAt: ts }),
      keepalive: true,          // ← モバイル離脱時の取りこぼし対策の要
      cache: 'no-store',
    };
    // keepalive と abort signal は併用しない（離脱直後に abort される事故を防ぐ）
    inFlight = true;
    setStatus('sync');
    log('POST →', (reason || '') + ' keys=' + nKeys);

    return fetch(apiUrl(), opt)
      .then(function (r) {
        var st = r.status;
        return r.json().catch(function () { return null; }).then(function (j) {
          inFlight = false;
          if (r.ok && j && j.ok && j.saved) {
            lastSyncedAt = Number(j.updatedAt) || ts;
            markServerAt(lastSyncedAt);
            setDirty(false);
            setStatus('ok');
            log('POST ←', 'HTTP ' + st + ' saved keys=' + (j.keys != null ? j.keys : nKeys));
          } else {
            // stale / empty_overwrite_blocked / その他の拒否は黙って成功に見せない
            setStatus('reject');
            log('POST ✗', 'HTTP ' + st + ' ' +
              ((j && (j.error || (j.stale ? 'stale' : ''))) || 'rejected'));
          }
          return j;
        });
      })
      .catch(function (e) {
        inFlight = false;
        setStatus('off');
        log('POST ✗', 'network ' + String(e && e.message || e));
        return null;
      });
  }

  function schedulePush() {
    if (applying || VIEW_ONLY) return;
    setDirty(true);
    if (pushTimer) clearTimeout(pushTimer);
    setStatus('pending');
    pushTimer = setTimeout(function () {
      pushTimer = null;
      push('debounce');
    }, PUSH_DEBOUNCE_MS);
  }

  /* 未送信分を即座に出し切る。モバイルの離脱イベントから呼ぶ。 */
  function flush(reason) {
    if (VIEW_ONLY || !LS) return;
    if (!pushTimer && !isDirty()) return;   // 送るものが無い
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
    push('flush:' + reason);
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
      if (!applying && String(k).indexOf(PREFIX) === 0) schedulePush();
    });

    define(LS, 'removeItem', function (k) {
      if (VIEW_ONLY && String(k).indexOf(PREFIX) === 0) return;
      rawRemove(k);
      if (!applying && String(k).indexOf(PREFIX) === 0) schedulePush();
    });

    define(LS, 'clear', function () {
      if (VIEW_ONLY) return;
      rawClear();
      if (!applying) schedulePush();
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
      'opacity:0.9;transition:opacity .2s;cursor:pointer;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.eng40-sync-pill.off{background:rgba(199,123,112,0.16);border-color:rgba(199,123,112,0.5);}' +
    '.eng40-sync-pill.reject{background:rgba(199,123,112,0.28);border-color:rgba(199,123,112,0.75);}' +
    '.eng40-sync-pill.view{background:rgba(212,168,91,0.20);border-color:rgba(212,168,91,0.6);}' +
    '.eng40-sync-pill.nofamily{background:rgba(212,168,91,0.30);border-color:rgba(212,168,91,0.8);}' +
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
    statusEl.classList.remove('off', 'view', 'reject', 'nofamily');

    if (!FAMILY) {
      statusEl.classList.add('nofamily');
      statusEl.textContent = '👨‍👩‍👧 家族が未設定（この端末だけに保存）';
      return;
    }
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
    } else if (kind === 'reject') {
      statusEl.classList.add('reject');
      statusEl.textContent = '⚠️ 同期できず（タップで詳細）';
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
      statusEl.addEventListener('click', function () {
        try { alert(debugText()); } catch (e) {}
      });
      document.body.appendChild(statusEl);

      if (VIEW_ONLY) {
        var banner = document.createElement('div');
        banner.className = 'eng40-view-banner';
        banner.textContent = '👀 閲覧モード（保護者用）— 記録の書き換えはできません';
        document.body.insertBefore(banner, document.body.firstChild);
      }

      // 家族未設定 & ホーム以外 → ホームのセットアップへ誘導する
      var page = location.pathname.split('/').pop() || 'index.html';
      if (!FAMILY && page !== 'index.html') {
        var nf = document.createElement('div');
        nf.className = 'eng40-view-banner';
        nf.innerHTML = '👨‍👩‍👧 家族がまだ設定されていません（記録はこの端末だけに保存中）　' +
          '<a href="./index.html" style="color:inherit;text-decoration:underline;">ホームで家族を作る →</a>';
        document.body.insertBefore(nf, document.body.firstChild);
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
        if (el === statusEl) return;
        // 家族設定カード（URLコピー等）は閲覧モードでも触れてよい
        if (el.closest && el.closest('.eng40-family-card')) return;
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
    if (!FAMILY) {
      setStatus('nofamily');
      log('boot', '家族ID 未設定 → 通信しない');
      return;
    }
    pull().then(function (res) {
      if (!res || !res.ok) { setStatus('off'); return; }

      var serverAt = Number(res.updatedAt) || 0;
      var serverState = res.state || {};
      var localKeys = Object.keys(collectState()).length;

      // 未送信のローカル変更がある → こちらを優先して送る
      // （サーバ時刻権威になったので、送れば必ず受理される）
      if (isDirty() && localKeys > 0 && !VIEW_ONLY) {
        log('boot', 'dirty あり → push');
        push('boot-dirty');
        return;
      }

      // サーバが新しい（= 前回把握した updatedAt より進んでいる）→ 取り込む
      if (serverAt > serverAtLocal() || (serverAt > 0 && localKeys === 0)) {
        var changed = applyState(serverState);
        markServerAt(serverAt);
        lastSyncedAt = serverAt;
        setStatus('ok');
        log('boot', 'サーバ反映 changed=' + changed);

        // 画面はすでに旧データで描画済み → 実際に値が変わったときだけ1回リロード
        if (changed && reloadCount() < MAX_RELOADS) {
          bumpReload();
          location.reload();
        }
        return;
      }

      lastSyncedAt = serverAt || Date.now();
      setStatus('ok');
      log('boot', '差分なし');
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

  // =====================================================================
  // 離脱時 flush（モバイルで1件も届かない主因への対策）
  // ---------------------------------------------------------------------
  // Android Chrome / iOS Safari はタブ切替・画面消灯で setTimeout が凍結され、
  // debounce の POST が発火しないままセッションが終わる。
  // hidden / pagehide / blur の3経路で pending を即 flush する。
  // =====================================================================

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush('hidden');
  });
  window.addEventListener('pagehide', function () { flush('pagehide'); });
  window.addEventListener('blur', function () { flush('blur'); });
  // 復帰時、送れていなければ再送
  window.addEventListener('online', function () { flush('online'); });

  // 外から叩けるようにしておく（デバッグ用）
  window.eng40sync = {
    flush: flush,
    push: push,
    pull: pull,
    logs: function () { return LOGS.slice(); },
    debug: debugText,
    state: collectState,
  };

  // 家族設定 UI（index.html の家族カード）から使う API
  window.eng40family = {
    id:       function () { return FAMILY; },
    isSet:    function () { return !!FAMILY; },
    tail:     function () { return FAMILY ? FAMILY.slice(-4) : ''; },
    generate: newFamilyId,
    urlFor:   familyUrl,
    myUrl:    function () { return FAMILY ? familyUrl(FAMILY) : ''; },
    adopt:    adoptFamily,     // この端末をその家族にして reload
  };
})();
