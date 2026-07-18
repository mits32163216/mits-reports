/* 英語40日プログラム 共有グローバルナビ
 * 全ページに <script src="./nav.js"></script> を置くだけで統一ナビが出る。
 * 現在地は location から自動判定。（カラオケ練習AI nav.js から流用）
 */
(function () {
  var NAV = [
    { file: "index.html",   key: "index",   emoji: "🏠", label: "ホーム",     sub: "" },
    { file: "program.html", key: "program", emoji: "✅", label: "40日",       sub: "デイリー" },
    { file: "daily.html",   key: "daily",   emoji: "📋", label: "手順書",     sub: "今日やること" },
    { file: "route.html",   key: "route",   emoji: "📖", label: "教材ルート", sub: "56ユニット" },
    { file: "vocab.html",   key: "vocab",   emoji: "📓", label: "単語",       sub: "D+1テスト" },
    { file: "phonics.html", key: "phonics", emoji: "🎧", label: "音",         sub: "フォニックス13回" },
    { file: "progress.html", key: "progress", emoji: "📈", label: "記録", sub: "見える化" },
    { file: "test.html",    key: "test",    emoji: "📊", label: "測る",       sub: "テスト記録" },
  ];

  var path = location.pathname.split("/").pop() || "index.html";
  if (path === "" || path === "/") path = "index.html";
  var current = "index";
  for (var i = 0; i < NAV.length; i++) {
    if (NAV[i].file === path) { current = NAV[i].key; break; }
  }

  var css = `
  :root { --kn-navy:#0F1B2E; --kn-ivory:#F5EFE1; --kn-gold:#D4A85B; --kn-sage:#7A9B7E; }
  .back-nav, .back-nav-bottom { display:none !important; }
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
  }
  .kai-brand:hover { text-decoration:none; opacity:0.85; }
  .kai-links {
    display:flex; gap:4px; overflow-x:auto; flex:1 1 auto;
    scrollbar-width:none; -webkit-overflow-scrolling:touch;
  }
  .kai-links::-webkit-scrollbar { display:none; }
  .kai-links a {
    flex:0 0 auto; text-decoration:none;
    display:flex; flex-direction:column; align-items:center; gap:1px;
    padding:5px 12px; border-radius:9px;
    color:var(--kn-navy); transition:all 0.15s; border:1px solid transparent;
  }
  @media (prefers-color-scheme:dark){ .kai-links a { color:var(--kn-ivory); } }
  .kai-links a:hover { background:rgba(212,168,91,0.14); text-decoration:none; }
  .kai-links a .kn-top { font-size:13px; font-weight:600; white-space:nowrap; }
  .kai-links a .kn-sub { font-size:9px; opacity:0.6; font-family:"SF Mono",Menlo,monospace; white-space:nowrap; }
  .kai-links a.kn-current {
    background:var(--kn-gold); color:#fff; border-color:var(--kn-gold);
  }
  .kai-links a.kn-current .kn-sub { opacity:0.85; }
  @media (max-width:560px){
    .kai-brand { font-size:13px; }
    .kai-links a { padding:5px 9px; }
    .kai-links a .kn-sub { display:none; }
  }
  `;

  var linksHtml = NAV.map(function (n) {
    var cls = n.key === current ? "kn-current" : "";
    var sub = n.sub ? '<span class="kn-sub">' + n.sub + "</span>" : "";
    return '<a class="' + cls + '" href="./' + n.file + '">' +
           '<span class="kn-top">' + n.emoji + " " + n.label + "</span>" + sub + "</a>";
  }).join("");

  var html =
    '<nav class="kai-nav"><div class="kai-nav-inner">' +
    '<a class="kai-brand" href="./index.html">📘 英語40日</a>' +
    '<div class="kai-links">' + linksHtml + "</div>" +
    "</div></nav>";

  function inject() {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    document.body.insertBefore(wrap.firstChild, document.body.firstChild);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
