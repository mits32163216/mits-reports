/* 英語40日プログラム 共有グローバルナビ
 * 全ページに <script src="./nav.js"></script> を置くだけで統一ナビが出る。
 * 現在地は location から自動判定。（カラオケ練習AI nav.js から流用）
 */
(function () {
  var NAV = [
    { file: "phonics.html", key: "phonics", emoji: "🎧", label: "音",         sub: "フォニックス13回" },
    { file: "route.html",   key: "route",   emoji: "📖", label: "教材ルート", sub: "56ユニット" },
    { file: "test.html",    key: "test",    emoji: "📊", label: "測る",       sub: "テスト記録" },
    { file: "program.html", key: "program", emoji: "✅", label: "40日",       sub: "デイリー" },
    { file: "daily.html",   key: "daily",   emoji: "📋", label: "今日やること", sub: "チェックはここ" },
    { file: "vocab.html",   key: "vocab",   emoji: "📓", label: "単語",       sub: "D+1テスト" },
    { file: "progress.html", key: "progress", emoji: "📈", label: "記録", sub: "見える化" },
    { file: "family.html",  key: "family",  emoji: "👨‍👩‍👧", label: "家族",       sub: "ID切替" },
  ];

  var path = location.pathname.split("/").pop() || "index.html";
  if (path === "" || path === "/") path = "index.html";
  var current = "";
  for (var i = 0; i < NAV.length; i++) {
    if (NAV[i].file === path) { current = NAV[i].key; break; }
  }
  var isHome = (path === "index.html");
  // Preserve ?f=<familyId> when navigating to home
  var brandHref = "index.html" + (location.search.indexOf("f=") >= 0 ? location.search : "");

  var css = `
  :root { --kn-navy:#0F1B2E; --kn-ivory:#F5EFE1; --kn-gold:#D4A85B; --kn-sage:#7A9B7E; }
  .back-nav, .back-nav-bottom { display:none !important; }
  html { overflow-x:hidden; }
  body { padding-top:0 !important; }
  .kai-nav {
    position:sticky; top:0; z-index:900;
    background:rgba(245,239,225,0.92); backdrop-filter:blur(10px);
    border-bottom:1px solid rgba(15,27,46,0.12);
  }
  @media (prefers-color-scheme:dark) {
    .kai-nav { background:rgba(15,27,46,0.92); border-bottom-color:rgba(245,239,225,0.14); }
  }
  .kai-nav-inner {
    max-width:1200px; margin:0 auto; padding:8px 16px;
    display:flex; align-items:center; gap:14px;
  }
  .kai-brand {
    font-family:"Hiragino Mincho ProN","游明朝",serif; font-weight:700; font-size:15px;
    color:var(--kn-gold); text-decoration:none; white-space:nowrap; flex:0 0 auto;
    cursor:pointer; transition:opacity 0.15s, text-shadow 0.15s;
  }
  .kai-brand:hover { text-decoration:none; opacity:0.85; }
  .kai-brand.kn-brand-current {
    cursor:default;
    text-shadow:0 0 8px rgba(212,168,91,0.35);
  }
  .kai-brand.kn-brand-current:hover { opacity:1; }
  .kai-links {
    display:flex; gap:4px; flex:1 1 auto;
  }
  .kai-links a {
    flex:0 0 auto; text-decoration:none;
    display:flex; flex-direction:column; align-items:center; gap:1px;
    padding:5px 12px; border-radius:9px;
    color:var(--kn-navy); transition:all 0.15s; border:1px solid transparent;
  }
  @media (prefers-color-scheme:dark){ .kai-links a { color:var(--kn-ivory); } }
  .kai-links a:hover { background:rgba(212,168,91,0.14); text-decoration:none; }
  .kai-links a .kn-top { font-size:13px; font-weight:600; white-space:nowrap; }
  .kai-links a .kn-emoji { display:inline; }
  .kai-links a .kn-lbl { display:inline; margin-left:2px; }
  .kai-links a .kn-sub { font-size:9px; opacity:0.6; font-family:"SF Mono",Menlo,monospace; white-space:nowrap; }
  .kai-links a.kn-current {
    background:var(--kn-gold); color:#fff; border-color:var(--kn-gold);
  }
  .kai-links a.kn-current .kn-sub { opacity:0.85; }

  /* Hamburger button: hidden on desktop. White fill so it's visible on dark bg. */
  .kai-burger {
    display:none;
    width:44px; height:44px; padding:0; margin-left:auto;
    background:rgba(255,255,255,0.94); border:0; border-radius:10px;
    cursor:pointer; align-items:center; justify-content:center;
    color:#0a0e1a; font-size:22px; line-height:1; font-weight:700;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
    -webkit-tap-highlight-color:transparent;
    transition:background 0.15s, box-shadow 0.15s, transform 0.1s;
  }
  @media (prefers-color-scheme:dark){
    .kai-burger { background:#ffffff; color:#0a0e1a; box-shadow:0 2px 10px rgba(0,0,0,0.5); }
  }
  .kai-burger:hover { background:#ffffff; box-shadow:0 3px 12px rgba(0,0,0,0.4); }
  .kai-burger:active { transform:scale(0.96); }
  .kai-burger:focus-visible { outline:2px solid var(--kn-gold); outline-offset:2px; }

  /* Drawer + overlay: hidden by default */
  .kai-overlay {
    position:fixed; inset:0; background:rgba(15,27,46,0.55);
    opacity:0; pointer-events:none; transition:opacity 0.2s;
    z-index:950;
  }
  .kai-drawer {
    position:fixed; top:0; right:0; height:100dvh; width:min(84vw,320px);
    background:var(--kn-ivory); color:var(--kn-navy);
    box-shadow:-8px 0 32px rgba(15,27,46,0.28);
    transform:translateX(100%); transition:transform 0.22s ease-out;
    z-index:960; display:flex; flex-direction:column;
    padding:0; overflow-y:auto; -webkit-overflow-scrolling:touch;
  }
  @media (prefers-color-scheme:dark){
    .kai-drawer { background:#1a2740; color:var(--kn-ivory); }
  }
  .kai-drawer-head {
    display:flex; align-items:center; justify-content:space-between;
    padding:12px 16px; border-bottom:1px solid rgba(15,27,46,0.12);
    font-family:"Hiragino Mincho ProN","游明朝",serif; font-weight:700;
    color:var(--kn-gold); font-size:15px;
  }
  @media (prefers-color-scheme:dark){
    .kai-drawer-head { border-bottom-color:rgba(245,239,225,0.14); }
  }
  .kai-close {
    width:40px; height:40px; padding:0; background:transparent;
    border:1px solid rgba(15,27,46,0.18); border-radius:8px;
    cursor:pointer; font-size:20px; line-height:1;
    color:inherit; -webkit-tap-highlight-color:transparent;
  }
  .kai-close:focus-visible { outline:2px solid var(--kn-gold); outline-offset:2px; }
  .kai-drawer-list {
    display:flex; flex-direction:column; gap:2px; padding:8px 8px 24px;
  }
  .kai-drawer-list a {
    display:flex; align-items:center; gap:12px;
    padding:14px 12px; border-radius:10px;
    text-decoration:none; color:inherit;
    border:1px solid transparent; font-size:15px; font-weight:600;
    min-height:48px;
    -webkit-tap-highlight-color:transparent;
  }
  .kai-drawer-list a:hover { background:rgba(212,168,91,0.14); }
  .kai-drawer-list a .kn-emoji { font-size:22px; line-height:1; flex:0 0 auto; width:28px; text-align:center; }
  .kai-drawer-list a .kn-lbl { flex:1 1 auto; }
  .kai-drawer-list a .kn-sub { font-size:11px; opacity:0.6; font-family:"SF Mono",Menlo,monospace; white-space:nowrap; }
  .kai-drawer-list a.kn-current {
    background:var(--kn-gold); color:#fff; border-color:var(--kn-gold);
  }
  .kai-drawer-list a.kn-current .kn-sub { opacity:0.85; }

  /* Open state */
  body.kai-drawer-open { overflow:hidden; }
  body.kai-drawer-open .kai-overlay { opacity:1; pointer-events:auto; }
  body.kai-drawer-open .kai-drawer { transform:translateX(0); }

  /* Mobile: swap desktop nav for hamburger */
  @media (max-width:640px){
    .kai-nav-inner { padding:6px 12px; gap:8px; }
    .kai-brand { font-size:13px; }
    .kai-links { display:none; }
    .kai-burger { display:inline-flex; }
  }
  @media (min-width:641px){
    .kai-overlay, .kai-drawer { display:none !important; }
  }
  `;

  // Desktop nav links (shown ≥641px)
  var linksHtml = NAV.map(function (n) {
    var cls = n.key === current ? "kn-current" : "";
    var sub = n.sub ? '<span class="kn-sub">' + n.sub + "</span>" : "";
    return '<a class="' + cls + '" href="./' + n.file + '" aria-label="' + n.label + '" title="' + n.label + '">' +
           '<span class="kn-top">' +
             '<span class="kn-emoji">' + n.emoji + '</span>' +
             '<span class="kn-lbl">' + n.label + '</span>' +
           '</span>' + sub + "</a>";
  }).join("");

  // Drawer list (shown ≤640px)
  var drawerLinksHtml = NAV.map(function (n) {
    var cls = n.key === current ? "kn-current" : "";
    var sub = n.sub ? '<span class="kn-sub">' + n.sub + "</span>" : "";
    var cur = n.key === current ? ' aria-current="page"' : '';
    return '<a class="' + cls + '" href="./' + n.file + '"' + cur + '>' +
           '<span class="kn-emoji" aria-hidden="true">' + n.emoji + '</span>' +
           '<span class="kn-lbl">' + n.label + '</span>' +
           sub + '</a>';
  }).join("");

  var brandAttrs = ' href="./' + brandHref + '" aria-label="ホーム（英語40日）"' +
    (isHome ? ' aria-current="page" style="cursor:default;"' : '');

  var html =
    '<nav class="kai-nav"><div class="kai-nav-inner">' +
      '<a class="kai-brand' + (isHome ? ' kn-brand-current' : '') + '"' + brandAttrs + '>📘 英語40日</a>' +
      '<div class="kai-links">' + linksHtml + '</div>' +
      '<button class="kai-burger" type="button" aria-label="メニューを開く" aria-expanded="false" aria-controls="kai-drawer">☰</button>' +
    '</div></nav>' +
    '<div class="kai-overlay" hidden></div>' +
    '<aside class="kai-drawer" id="kai-drawer" role="dialog" aria-modal="true" aria-label="ナビゲーションメニュー" hidden>' +
      '<div class="kai-drawer-head">' +
        '<a class="kai-brand' + (isHome ? ' kn-brand-current' : '') + '"' + brandAttrs + '>📘 英語40日</a>' +
        '<button class="kai-close" type="button" aria-label="メニューを閉じる">×</button>' +
      '</div>' +
      '<div class="kai-drawer-list">' + drawerLinksHtml + '</div>' +
    '</aside>';

  function inject() {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    // Insert all top-level children (nav + overlay + drawer) into body
    var nodes = [];
    for (var i = 0; i < wrap.children.length; i++) nodes.push(wrap.children[i]);
    for (var j = nodes.length - 1; j >= 0; j--) {
      document.body.insertBefore(nodes[j], document.body.firstChild);
    }
    wireDrawer();
  }

  function wireDrawer() {
    var burger = document.querySelector(".kai-burger");
    var overlay = document.querySelector(".kai-overlay");
    var drawer = document.querySelector(".kai-drawer");
    var closeBtn = drawer && drawer.querySelector(".kai-close");
    if (!burger || !overlay || !drawer) return;

    // Reveal (hidden attr was for no-JS fallback)
    overlay.hidden = false;
    drawer.hidden = false;

    function open() {
      document.body.classList.add("kai-drawer-open");
      burger.setAttribute("aria-expanded", "true");
      // Move focus into drawer for keyboard users
      if (closeBtn) closeBtn.focus();
    }
    function close() {
      document.body.classList.remove("kai-drawer-open");
      burger.setAttribute("aria-expanded", "false");
      burger.focus();
    }

    burger.addEventListener("click", function () {
      if (document.body.classList.contains("kai-drawer-open")) close(); else open();
    });
    overlay.addEventListener("click", close);
    if (closeBtn) closeBtn.addEventListener("click", close);
    // Link tap → close (defer to allow navigation)
    drawer.querySelectorAll(".kai-drawer-list a").forEach(function (a) {
      a.addEventListener("click", function () {
        document.body.classList.remove("kai-drawer-open");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("kai-drawer-open")) close();
    });
    // If resized to desktop while open, force close
    window.addEventListener("resize", function () {
      if (window.innerWidth > 640 && document.body.classList.contains("kai-drawer-open")) close();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
