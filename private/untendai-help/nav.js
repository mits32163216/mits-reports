/* 運転台の使い方 ── 右カラムの目次（ここを直せば全ページに反映されます） */
(function () {
  var BASE = 'https://change.7years.life/page/';
  var PAGES = [
    [1,  '四葉',            'FglucgHdmgU8'],
    [2,  'お金の計器',       '6jMgNpis11Aa'],
    [3,  '目標設定',         '0hsA4nVQ6X0s'],
    [4,  '分析',            'kkWfs1ZZ1Nbg'],
    [5,  '顧客の計器',       'FKIMT6QkH0Ia'],
    [6,  '戦略の計器',       '1wTJg2XpvYDh'],
    [7,  '仕事の計器',       'K6EydhZVQ0mX'],
    [8,  '参謀（AI-Mits）',  'DUCVSYbs8ur7'],
    [9,  '経営カレンダー',    'OZ1oLJNULjJf'],
    [10, '月次決算',         'bngMQ8kc5c7D'],
    [11, '設定',            'PPSyd4LWOVtX']
  ];
  var cur = document.currentScript;
  var self = cur && cur.dataset ? parseInt(cur.dataset.self, 10) : 0;
  function build() {
    var ol = document.querySelector('#nav ol');
    if (!ol) return;
    ol.innerHTML = '';
    PAGES.forEach(function (p) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = BASE + p[2];
      a.textContent = p[1];
      if (p[0] === self) a.className = 'on';
      li.appendChild(a);
      ol.appendChild(li);
    });
    var box = document.getElementById('nav');
    if (box && !box.querySelector('.tolist')) {
      var p = document.createElement('div');
      p.className = 'tolist';
      p.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid #e6e2d9';
      p.innerHTML = '<a href="https://change.7years.life/page/f07BcqK4zqsd" style="color:#11159f;font-weight:700;text-decoration:none">＜ 使い方トップへ</a>';
      box.appendChild(p);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
