/* カラオケ練習AI 共有グローバルナビ（2026-07-17 新命名・7ページ+準備期間）
 * 全ページに <script src="./nav.js"></script> を置くだけで統一ナビが出る。
 * 現在地は location から自動判定。旧 .back-nav は自動で隠す。
 */
(function () {
  var NAV = [
    { file: "index.html",   key: "index",   emoji: "🏠", label: "ホーム",  sub: "" },
    { file: "measure.html", key: "measure", emoji: "📊", label: "実測",    sub: "9軸ダッシュ" },
    { file: "profile.html", key: "profile", emoji: "🎯", label: "課題",    sub: "声質偏差値" },
    { file: "success.html", key: "success", emoji: "✅", label: "検証",    sub: "サクセスFile" },
    { file: "plan.html",    key: "plan",    emoji: "📖", label: "計画",    sub: "ルーティン" },
    { file: "log.html",     key: "log",     emoji: "📔", label: "日記",    sub: "練習ログ" },
    { file: "basics.html",  key: "basics",  emoji: "🌱", label: "基礎",    sub: "おすすめ順" },
    { file: "videos.html",  key: "videos",  emoji: "🎬", label: "学ぶ",    sub: "全動画" },
    { file: "junbi-kikan/index.html", key: "junbi", emoji: "🗄", label: "準備期間", sub: "旧サイト" },
  ];

  // 現在ページ判定
  //   /junbi-kikan/ 配下のときも「junbi」として扱う（旧サイトを見ているときも現在地表示）
  var path = location.pathname;
  var current = "index";
  if (path.indexOf("/junbi-kikan/") >= 0) {
    current = "junbi";
  } else {
    var leaf = path.split("/").pop() || "index.html";
    if (leaf === "" || leaf === "/") leaf = "index.html";
    for (var i = 0; i < NAV.length; i++) {
      if (NAV[i].file === leaf) { current = NAV[i].key; break; }
    }
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
  .kai-links a.kn-junbi {
    border-color:rgba(15,27,46,0.16); opacity:0.72; font-style:italic;
  }
  .kai-links a.kn-junbi.kn-current { opacity:1; font-style:normal; }
  @media (max-width:560px){
    .kai-brand { font-size:13px; }
    .kai-links a { padding:5px 9px; }
    .kai-links a .kn-sub { display:none; }
  }
  `;

  // Root-relative へ変換：現在が junbi-kikan/ 配下なら "../" を前置
  var prefix = (path.indexOf("/junbi-kikan/") >= 0) ? "../" : "./";

  var linksHtml = NAV.map(function (n) {
    var cls = (n.key === current ? "kn-current " : "") + (n.key === "junbi" ? "kn-junbi" : "");
    var sub = n.sub ? '<span class="kn-sub">' + n.sub + "</span>" : "";
    // 準備期間だけは常に junbi-kikan/index.html 相対、他は現在ディレクトリ相対
    var href;
    if (n.key === "junbi") {
      href = prefix + "junbi-kikan/index.html";
    } else {
      href = prefix + n.file;
    }
    return '<a class="' + cls.trim() + '" href="' + href + '">' +
           '<span class="kn-top">' + n.emoji + " " + n.label + "</span>" + sub + "</a>";
  }).join("");

  var brandHref = prefix + "index.html";
  var html =
    '<nav class="kai-nav"><div class="kai-nav-inner">' +
    '<a class="kai-brand" href="' + brandHref + '">🎤 カラオケ練習AI</a>' +
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
