/* カラオケ練習AI 共有グローバルナビ
 * 全ページに <script src="./nav.js"></script> を置くだけで統一ナビが出る。
 * 現在地は location から自動判定。旧 .back-nav は自動で隠す。
 */
(function () {
  var NAV = [
    { file: "index.html",              key: "index",      emoji: "🏠", label: "ホーム",   sub: "" },
    { file: "dashboard.html",          key: "dashboard",  emoji: "📊", label: "測る",     sub: "9軸実測" },
    { file: "myp_voice_quality.html",  key: "voice",      emoji: "🎯", label: "課題",     sub: "声質偏差値" },
    { file: "karaoke_pdca.html",       key: "pdca",       emoji: "🔁", label: "検証",     sub: "効果PDCA" },
    { file: "curriculum_20260710.html",key: "curriculum", emoji: "📖", label: "計画",     sub: "ルーティン" },
    { file: "karaoke_diary.html",      key: "diary",      emoji: "📔", label: "日記",     sub: "練習ログ" },
    { file: "myp_basics.html",         key: "basics",     emoji: "🌱", label: "基礎30",   sub: "おすすめ順" },
    { file: "myp_videos.html",         key: "videos",     emoji: "🎬", label: "学ぶ",     sub: "全動画" },
  ];

  // 現在ページ判定（パス末尾のファイル名。/ で終わる or 空なら index）
  var path = location.pathname.split("/").pop() || "index.html";
  if (path === "" || path === "/") path = "index.html";
  var current = "index";
  for (var i = 0; i < NAV.length; i++) {
    if (NAV[i].file === path) { current = NAV[i].key; break; }
  }

  var css = `
  :root { --kn-navy:#0F1B2E; --kn-ivory:#F5EFE1; --kn-gold:#D4A85B; --kn-sage:#7A9B7E; }
  /* 旧ページ内ナビは隠す（統一ナビに置換） */
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
    '<a class="kai-brand" href="./index.html">🎤 カラオケ練習AI</a>' +
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
