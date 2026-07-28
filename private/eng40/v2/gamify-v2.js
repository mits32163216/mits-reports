/* gamify-v2.js — ELSA式ゲーミフィ v1
 * バナー3チップ（連続/累計/残り）+ マイルストーンカード + Day完了演出（パーティクル/vibrate/トースト）
 * + Day14/20/40マイルストーン祝祭モーダル + progress.html Before/After強化・週次snapshot
 * 全ページ共通ロード可（DOMフックがある場所だけ機能を注入）
 * sync.js は変更なし・全 eng40-* キーが自動同期される
 */
(function () {
  var PREFIX = 'eng40-';
  var TASK_P = PREFIX + 'task:';
  var DONE_P = PREFIX + 'done:day-';
  var MILESTONE_P = PREFIX + 'milestone:';
  var SNAPSHOT_P = PREFIX + 'snapshot:';
  var START_KEY = PREFIX + 'start';
  var TOTAL = 40;
  // Day別必須ステップ数（[0]=Day1）— program.html ENG40_DAY_STEPS / progress.html DAY_STEPS と統一（[0]=2）
  var DAY_STEPS = [2, 5, 5, 5, 5, 5, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 5, 5, 5, 5, 5, 5, 3, 5, 5, 5, 5, 5, 5, 3, 5, 5, 5, 4, 4];
  var OPT_TASKS = { 'd01-4': 1, 'd03-6': 1, 'd37-6': 1, 'd39-4': 1 };
  var MILESTONES = [
    { day: 14, id: 'M14', icon: '', title: 'Day 14 到達', body: 'フォニックス1周完了。26音の口の形が入りました。' },
    { day: 20, id: 'M20', icon: '', title: 'Day 20 到達', body: '半分（20日）達成。ここから後半戦です。' },
    { day: 40, id: 'M40', icon: '', title: 'Day 40 到達', body: '40日完了。この体験は一生残ります。' }
  ];

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

  function dayStats() {
    var counts = [], i;
    for (i = 0; i < TOTAL; i++) counts.push(0);
    var len = localStorage.length;
    for (i = 0; i < len; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(TASK_P) !== 0) continue;
      if (get(k) !== '1') continue;
      var id = k.slice(TASK_P.length);
      if (OPT_TASKS[id]) continue;
      var m = /^d(\d{2})-\d+$/.exec(id);
      if (!m) continue;
      var d = parseInt(m[1], 10);
      if (d >= 1 && d <= TOTAL) counts[d - 1]++;
    }
    var full = [], active = [];
    for (i = 1; i <= TOTAL; i++) {
      var need = DAY_STEPS[i - 1] || 0;
      var got = Math.min(counts[i - 1], need);
      var isFull = (get(DONE_P + pad2(i)) === '1') || (need > 0 && got >= need);
      full.push(isFull);
      active.push(isFull || got > 0);
    }
    var doneN = 0, startedN = 0;
    for (i = 0; i < TOTAL; i++) { if (full[i]) doneN++; if (active[i]) startedN++; }
    return { counts: counts, full: full, active: active, done: doneN, started: startedN };
  }

  function todayIdx() {
    var start = get(START_KEY);
    if (!start) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start);
    if (!m) return null;
    var s = new Date(+m[1], +m[2] - 1, +m[3]);
    var now = new Date();
    var t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var days = Math.round((t - s) / 86400000);
    return Math.max(1, Math.min(TOTAL, days + 1));
  }

  function computeStreak(active, tIdx) {
    var cur = 0, t;
    if (tIdx === null || tIdx === undefined) {
      t = TOTAL;
      while (t >= 1 && !active[t - 1]) t--;
    } else {
      t = Math.max(0, Math.min(TOTAL, tIdx));
      if (t >= 1 && !active[t - 1]) t--;
    }
    while (t >= 1 && active[t - 1]) { cur++; t--; }
    return cur;
  }

  function nextMilestone(doneN) {
    for (var i = 0; i < MILESTONES.length; i++) {
      if (doneN < MILESTONES[i].day) return MILESTONES[i];
    }
    return null;
  }

  function renderChips(host, stats, streakN) {
    var goalRemain = TOTAL - stats.done;
    var streakClass = streakN >= 7 ? ' streak-hot' : '';
    var chipsHtml =
      '<div class="gamify-chips">' +
        '<div class="gchip' + streakClass + '"><span class="g-emoji">🔥</span><span class="g-num">' + streakN + '</span><span class="g-lbl">連続日数</span></div>' +
        '<div class="gchip"><span class="g-emoji">📗</span><span class="g-num">' + stats.done + '</span><span class="g-lbl">累計 完了日</span></div>' +
        '<div class="gchip"><span class="g-emoji">🎯</span><span class="g-num">' + goalRemain + '</span><span class="g-lbl">ゴールまで</span></div>' +
      '</div>';
    var warnHtml = streakN >= 7 ? '<div class="gchip-warn">連続を切らさないで！</div>' : '';
    var nm = nextMilestone(stats.done);
    var mcHtml = '';
    if (nm) {
      var remain = Math.max(0, nm.day - stats.done);
      mcHtml = '<div class="milestone-card">' +
        'あと <span class="ms-big">' + remain + '</span> 日で ' + nm.title + '</div>';
    } else {
      mcHtml = '<div class="milestone-card done">Day 40 到達（全マイルストーン達成）</div>';
    }
    host.innerHTML = chipsHtml + warnHtml + mcHtml;
  }

  /* 📗 教材ストックバー：教材ルート(route.html) の unit/ch + 音(phonics.html) の ph チェック合計
   * 分母は route.html + phonics.html の実測 checkbox 数を反映：
   *   - eng40-unit:unit-N ×56（Murphy 選抜56ユニット）
   *   - eng40-ch:ch-N ×7（AIO 7章：ch-1,2,3,4,13,16,p2）
   *   - eng40-ph:phx-N ×4（Ayane 実践4）+ ph-NN ×13（Chigusa 理論13）
   * 合計 max = 80
   */
  var STOCK_MAX_UNIT = 56;
  var STOCK_MAX_CH = 7;
  var STOCK_MAX_PH = 17;
  var STOCK_MAX_TOTAL = STOCK_MAX_UNIT + STOCK_MAX_CH + STOCK_MAX_PH; // 80

  function countChecked(prefix) {
    var n = 0, len = localStorage.length;
    for (var i = 0; i < len; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(prefix) !== 0) continue;
      if (get(k) === '1') n++;
    }
    return n;
  }

  function stockStats() {
    var u = Math.min(countChecked('eng40-unit:'), STOCK_MAX_UNIT);
    var c = Math.min(countChecked('eng40-ch:'), STOCK_MAX_CH);
    var p = Math.min(countChecked('eng40-ph:'), STOCK_MAX_PH);
    var done = u + c + p;
    var pct = STOCK_MAX_TOTAL > 0 ? Math.round(done / STOCK_MAX_TOTAL * 100) : 0;
    return { unit: u, ch: c, ph: p, done: done, max: STOCK_MAX_TOTAL, pct: pct };
  }

  function renderStockbar(host) {
    var s = stockStats();
    host.className = 'gamify-stockbar';
    host.innerHTML =
      '<div class="sb-head">' +
        '<span>📗 教材ストック <b style="font-family:\'SF Mono\',Menlo,monospace">' + s.done + '</b> / ' + s.max + '</span>' +
        '<span class="sb-pct">' + s.pct + '%</span>' +
      '</div>' +
      '<div class="sb-track"><div class="sb-fill" style="width:' + s.pct + '%"></div></div>' +
      '<div class="sb-sub">' +
        '<span>📖 マーフィー <b>' + s.unit + '</b> / ' + STOCK_MAX_UNIT + '</span>' +
        '<span>📙 ALL IN ONE 章 <b>' + s.ch + '</b> / ' + STOCK_MAX_CH + '</span>' +
        '<span>🎧 音 <b>' + s.ph + '</b> / ' + STOCK_MAX_PH + '</span>' +
      '</div>';
  }

  function fireParticles() {
    var layer = document.createElement('div');
    layer.className = 'gpart-layer';
    var cx = window.innerWidth / 2;
    var cy = Math.max(120, window.innerHeight * 0.35);
    var count = 6;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      p.className = 'gpart';
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      var angle = (Math.PI * 2 * i / count) + (Math.random() * 0.4 - 0.2);
      var dist = 80 + Math.random() * 60;
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', (Math.sin(angle) * dist - 40) + 'px');
      layer.appendChild(p);
    }
    document.body.appendChild(layer);
    setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 1400);
  }

  function fireToast(text) {
    var el = document.createElement('div');
    el.className = 'gtoast';
    el.textContent = text;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
    }, 2000);
  }

  function fireVibrate() {
    try { if (navigator.vibrate) navigator.vibrate([30, 50, 30]); } catch (e) { }
  }

  function boostBadge(dayN) {
    var badge = document.querySelector('.stepbadge[data-daybadge="' + dayN + '"]');
    if (!badge) return;
    badge.style.transition = 'transform 0.3s';
    badge.style.transform = 'scale(1.15)';
    setTimeout(function () { badge.style.transform = 'scale(1)'; }, 300);
  }

  function showMilestoneModal(nm, stats, streakN) {
    var overlay = document.createElement('div');
    overlay.className = 'gmodal-overlay';
    overlay.innerHTML =
      '<div class="gmodal">' +
        '<div class="gm-title">' + nm.title + '</div>' +
        '<div class="gm-body">' + nm.body + '<br><br>' +
          '完了 <span class="gm-hl">' + stats.done + '</span> 日 ／ 連続 <span class="gm-hl">' + streakN + '</span> 日' +
        '</div>' +
        '<button class="gm-close" type="button">続ける</button>' +
      '</div>';
    overlay.addEventListener('click', function (e) {
      if (e.target.classList.contains('gmodal-overlay') || e.target.classList.contains('gm-close')) {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }
    });
    document.body.appendChild(overlay);
  }

  function checkMilestones(prevDone, newDone, stats, streakN) {
    for (var i = 0; i < MILESTONES.length; i++) {
      var m = MILESTONES[i];
      if (newDone >= m.day && prevDone < m.day && get(MILESTONE_P + m.id) !== '1') {
        set(MILESTONE_P + m.id, '1');
        // 少し遅らせて particle → modal（重なり回避）
        setTimeout(function (mm) { return function () { showMilestoneModal(mm, stats, streakN); }; }(m), 600);
        return;
      }
    }
  }

  function weeklySnapshot(stats) {
    var d = new Date();
    var key = SNAPSHOT_P + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    if (get(key)) return;
    try { set(key, JSON.stringify({ done: stats.done, started: stats.started, at: Date.now() })); } catch (e) { }
  }

  function findRecentSnapshot(daysAgo) {
    // 現在から daysAgo 日前以前で最新の snapshot を返す
    var target = new Date();
    target.setDate(target.getDate() - daysAgo);
    var best = null, bestDate = null;
    var len = localStorage.length;
    for (var i = 0; i < len; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(SNAPSHOT_P) !== 0) continue;
      var ds = k.slice(SNAPSHOT_P.length);
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ds);
      if (!m) continue;
      var d = new Date(+m[1], +m[2] - 1, +m[3]);
      if (d <= target && (!bestDate || d > bestDate)) {
        try { best = JSON.parse(get(k)); bestDate = d; } catch (e) { }
      }
    }
    return best ? { data: best, date: bestDate } : null;
  }

  function enhanceProgress(stats) {
    // Before/After hero: shindan1 → shindan2、なければ jitsuryoku 単体
    var stArea = document.querySelector('.stats-grid');
    if (stArea) {
      // 週前差分
      var snap = findRecentSnapshot(7);
      if (snap && stats.done > snap.data.done) {
        var diff = stats.done - snap.data.done;
        var diffEl = document.createElement('div');
        diffEl.className = 'snap-diff';
        diffEl.textContent = '↑ 7日前より完了+' + diff + '日';
        stArea.parentNode.insertBefore(diffEl, stArea.nextSibling);
      }
      // st-days stat に進捗リング
      var stDays = document.getElementById('st-days');
      if (stDays) {
        var card = stDays.closest('.stat');
        if (card) {
          card.classList.add('stat-ring-wrap');
          var pct = stats.done / TOTAL;
          var r = 11, c = 2 * Math.PI * r;
          var svgNs = 'http://www.w3.org/2000/svg';
          var svg = document.createElementNS(svgNs, 'svg');
          svg.setAttribute('class', 'p-ring');
          svg.setAttribute('viewBox', '0 0 26 26');
          var bg = document.createElementNS(svgNs, 'circle');
          bg.setAttribute('class', 'bg'); bg.setAttribute('cx', '13'); bg.setAttribute('cy', '13'); bg.setAttribute('r', r);
          var fg = document.createElementNS(svgNs, 'circle');
          fg.setAttribute('class', 'fg'); fg.setAttribute('cx', '13'); fg.setAttribute('cy', '13'); fg.setAttribute('r', r);
          fg.setAttribute('stroke-dasharray', c.toFixed(2));
          fg.setAttribute('stroke-dashoffset', (c * (1 - pct)).toFixed(2));
          fg.setAttribute('stroke-linecap', 'round');
          svg.appendChild(bg); svg.appendChild(fg);
          card.appendChild(svg);
        }
      }
    }
    // Before/After hero を測定スコアの推移セクションの直前に挿入
    var scoreSec = null;
    var sects = document.querySelectorAll('.step-section');
    for (var i = 0; i < sects.length; i++) {
      var h = sects[i].querySelector('h2');
      if (h && /測定スコア/.test(h.textContent)) { scoreSec = sects[i]; break; }
    }
    if (scoreSec) {
      var sh1 = parseInt(get('eng40-score:shindan1') || '', 10);
      var sh2 = parseInt(get('eng40-score:shindan2') || '', 10);
      var jt = parseInt(get('eng40-score:jitsuryoku') || '', 10);
      var hero = document.createElement('div');
      hero.className = 'ba-hero';
      if (!isNaN(sh1) && !isNaN(sh2)) {
        var d = sh2 - sh1;
        var pct = sh1 > 0 ? Math.round(d / sh1 * 100) : 0;
        hero.innerHTML =
          '<div class="ba-lbl">📗 マーフィー診断テスト（Study Guide）</div>' +
          '<div class="ba-nums"><span class="ba-before">' + sh1 + '</span><span class="ba-arrow">→</span><span class="ba-after">' + sh2 + '</span></div>' +
          '<div class="ba-diff">' + (d >= 0 ? '+' : '') + d + ' 問' + (pct !== 0 ? '（' + (pct > 0 ? '+' : '') + pct + '%）' : '') + '</div>';
      } else if (!isNaN(sh1)) {
        hero.innerHTML =
          '<div class="ba-lbl">📗 マーフィー診断テスト（Study Guide）</div>' +
          '<div class="ba-nums"><span class="ba-after">' + sh1 + '</span> <span class="ba-caption">問</span></div>' +
          '<div class="ba-caption">Day 39 で再受験して伸びを見よう</div>';
      } else if (!isNaN(jt)) {
        hero.innerHTML =
          '<div class="ba-lbl">📊 Day 1 実力測定テスト（合計）</div>' +
          '<div class="ba-nums"><span class="ba-after">' + jt + '</span> <span class="ba-caption">／ 100</span></div>' +
          '<div class="ba-caption">40日後の自分と比べるための出発点</div>';
      } else {
        hero = null;
      }
      if (hero) scoreSec.parentNode.insertBefore(hero, scoreSec);
    }
  }

  function init() {
    var host = document.getElementById('gamify-banner-chips');
    var stats = dayStats();
    var tIdx = todayIdx();
    var streakN = computeStreak(stats.active, tIdx);

    if (host) renderChips(host, stats, streakN);
    var sbHost = document.getElementById('gamify-stockbar');
    if (sbHost) renderStockbar(sbHost);
    weeklySnapshot(stats);

    // progress.html 拡張
    if (/progress\.html$/i.test(location.pathname)) {
      // 既存 renderCal / 統計描画スクリプトが後で回るので、少し遅延させて挿入
      setTimeout(function () { enhanceProgress(stats); }, 50);
    }

    // daily.html: Day完了検知 → 演出
    var isDaily = document.querySelector('details.daycard') && document.querySelector('.tchk input[data-tkey]');
    if (!isDaily) return;

    var prevFull = stats.full.slice();
    var prevDone = stats.done;
    var boxes = document.querySelectorAll('.tchk input[data-tkey]');
    Array.prototype.forEach.call(boxes, function (cb) {
      cb.addEventListener('change', function () {
        // 既存の daily.html change ハンドラが localStorage を更新した後に走らせる
        setTimeout(function () {
          var s2 = dayStats();
          var t2 = todayIdx();
          var streak2 = computeStreak(s2.active, t2);
          var flippedDay = null;
          for (var i = 0; i < TOTAL; i++) {
            if (s2.full[i] && !prevFull[i]) { flippedDay = i + 1; break; }
          }
          if (flippedDay !== null) {
            fireParticles();
            fireVibrate();
            fireToast('🎉 Day ' + flippedDay + ' 完了！連続 ' + streak2 + ' 日');
            boostBadge(flippedDay);
          }
          checkMilestones(prevDone, s2.done, s2, streak2);
          if (host) renderChips(host, s2, streak2);
          prevFull = s2.full.slice();
          prevDone = s2.done;
        }, 40);
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
