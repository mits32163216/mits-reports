"use strict";
// 財務整理 進捗表 と 継続経費 が読む共通データ。
// var 宣言で window グローバルに載る（両ページの <script src="zaimu_seiri_data.js"> で読む）。
// 2026-09-19 自動反映テスト行（launchd WatchPaths 動作確認用・そのまま残す）

var BEFORE = 1109417;        // 1〜7月の月平均 1,288,580 − 私用（事業主貸）106,150 = 1,182,430（MF 仕訳の実額・2026-09-19 Mits様確認済）
var TARGET_CUT = 472607;     // 出発点の半分 (945,213 ÷ 2 = 472,606.5 四捨五入・旧値のまま／2段目以下は Mits様が1段ずつ確認する)
var TARGET_80  = 378085;     // 目標で削る額の8割 (472,607 × 0.8 = 378,085.6 切り捨て・旧値のまま)
// A（借入返済を除く）ランニングコストの基準
var LOAN_MONTHLY = 142286;   // 区分1 借入返済の月額合計。1〜7月の実額の月平均（楽天 35,431 ＋ Amex JP 96,687 ＋ Amex US 10,169・2026-09-19 Mits様確認済）
var A_BEFORE = 967131;      // BEFORE − LOAN_MONTHLY = 1,182,430 − 142,286 = 1,040,144（2026-09-19 Mits様確認済）
var A_TARGET_CUT = 402882;   // 805,763 ÷ 2 = 402,881.5 四捨五入・旧値のまま（2段目以下は Mits様が1段ずつ確認する）
var A_TARGET_80  = 322305;   // 402,882 × 0.8 = 322,305.6 切り捨て・旧値のまま
var LIST_SUM   = 462976;    // 区分1〜4 の月額合計（k2-08 まぐまぐMits様分 880円修正・2026-09-18）

// 2026-09-19 差し替え：1段目 3ボックスを Mits様確認済の実額に差し替え（before/borrow/start のみ）。
// keep 以下は 2026-09-18 の値のまま。Mits様が1段ずつ確認しながら順次更新する。
var BASELINE_20260918 = {
  date: "2026-09-18",
  before: 1109417,       // Before 総額（2026-09-19 差し替え：旧 945,213）
  borrow: 142286,        // 借入の返済（2026-09-19 差し替え：旧 139,450）
  start: 967131,        // 出発点総額（借入の返済を除く）= before − borrow（2026-09-19 差し替え：旧 805,763）
  keep: 129695,          // 継続と決めた額（月額相当）── 進捗表の21行（2026-09-19 差し替え：旧 107,914／9/18 以降に継続にした6行を含む）
  keepOutside: 112326,   // 継続と決めた額（一覧外・月額相当）── 家賃 106,770 + 電気 4,695 + ガス 861
  circus: 697849,        // サーカス対象 = start − keep（旧値のまま／2段目以下は Mits様が1段ずつ確認する）
  outside: 482237,       // 削減対象B（一覧に載っていない月額の経費）= before − LIST_SUM（旧値のまま）
  targetA: 215612,       // 削減対象A（このページの分母）= circus − outside（旧値のまま）
  // 2026-09-18 時点で「継続（パン）」だった 15行 ＋ 9/18 以降に継続にした 6行 = 21行の id。
  // 9/18 以降に追加した6行：k2-38 Chatwork ／ k3-06 Bonvoy 年会費 ／ k2-16 U-NEXT ／ k2-11 DMM ／ k2-08 まぐまぐ ／ k2-01 WEBLIO（2026-09-19 Mits様確認）
  keptIds: ["k2-46","k2-45","k2-44","k2-35","k2-27","k2-04","k2-03","k2-06","k2-02","k2-25","k2-26","k2-10","k2-07","k2-36","k2-31","k2-38","k3-06","k2-16","k2-11","k2-08","k2-01"]
};

// 月別の実際に出ていった額（2026-09-19 第4版・BS-keiri・参謀確定）。
// total             = 全カード確定額(JPY+USD@148円/USD) + PayPay直接引落(家賃+電気+ATM現金引出) − 集計の直し(400/月×8=3,200)
//                    （第2版の作り方から「単発の平ならし」と「アドネス穴埋め」を外したもの・実額そのまま）
// jigyounushi_kashi = 借方=事業主貸/西田光弘・貸方=未払金/カード の8仕訳（1〜8月 純額 ¥743,053・カード払いだが会社経費でない私用）
// borrow            = 楽天引落確定額 + Amex JP 42008 リボ元本+手数料+分割新規 + Amex US 44000 年会費・手数料・利息（狭義・第2版と同一）
// one_off           = 0（2026-09-19 Mits様確定：単発は分けず running に含める。3月 #49 も running へ戻した）
// running           = total − jigyounushi_kashi − borrow（2026-09-19 差し替え：one_off を running に戻したため式から外した）
//
// jigyounushi_kashi 8件（1〜8月 純額 ¥743,053・MF仕訳ID・参謀確定）:
//   #151 (2026-01-19) PRIORITY PASS AmexJP ANA ¥5,733
//   #308 (2026-01-31) SCHEMATIC AmexUS ¥111,546
//   #403 (2026-02-08) SCHEMATIC Chase Hyatt ¥543,194
//   #405 (2026-02-12) SCHEMATIC 返金 Chase Hyatt −¥549,658
//   #323 (2026-02-15) SCHEMATIC AmexUS ¥111,292
//   #407 (2026-02-19) SCHEMATIC Chase Hyatt ¥504,946
//   #587 (2026-03-03) 楽天プレミアム年会費 ¥11,000
//   #480 (2026-05-31) SCHEMATIC AmexUS ¥5,000
// 月別: 1月 ¥117,279 ／ 2月 ¥609,774 ／ 3月 ¥11,000 ／ 5月 ¥5,000 ／ その他月 0
//
// one_off 明細（外注費 1件 ≥50,000・MF仕訳ID）:
//   2026-03: #49 外注費 ¥50,371（振込 カ)マーケティングワークス トウキヨウシテン）
//   その他月: 0（Precious Valencia #393/#415 等はいずれも5万未満のため対象外）
//
// 「アドネス」の実額：$79（$18.42 + $60.58、2026-06-28・Amex US 44000・ADDNESS CO JP TOKYO）
// MF仕訳ID #481（2026-06-30 消耗品費 ¥11,760、レート @148.86）。旧コメントの「アドネス 102,240円/8mo」は根拠のない架空値だった。
//
// borrow 平均検証（1〜7月）: 平均 ¥142,286 ／ 出発点 LOAN_MONTHLY=139,450 との差 +¥2,836
//   理由：月毎の実額を単純平均したため、LOAN_MONTHLY（k1-01+k1-02+k1-03=35,178+94,760+9,512）と月毎の変動・丸め分の誤差。
// running 平均検証（1〜7月）: 平均 ¥1,032,948 ／ 出発点 A_BEFORE=805,763 との差 +¥227,185
//   理由：第2版は「単発を平均240,277/月で flatly 引いていた」が、実額の jigyounushi_kashi(¥106,150/月) + one_off(¥7,196/月) = ¥113,346/月 のみを引いた結果、¥128,521/月 が running に戻ったため。
//
// MF 総仕訳数 814件 と 手元集計 809件 の差5件（すべて Feb・軽微・数値には影響なし）:
//   #730 (2026-02-06) Chase Sapphire 5明細（TELLO/SINGHA/ARL/ACTIVENOTE/OKINAWA・合計約$46.64）
//   #742 (2026-02-20) BOA VISA 4452 → Wise 送金手数料 2件（¥18,790 + ¥3,046）
//   #747 (2026-02-05) セブンATM出金 事業主貸→接待交際費 振替 ¥30,000
//   #748 (2026-02-13) E-netATM出金 事業主貸→接待交際費 振替 ¥30,000
//   #749 (2026-02-24) セブンATM出金 事業主貸→接待交際費 振替 ¥30,000
//   → total は第2版由来（明細から実額導出済み・#730/#742/#747-749 は既に反映済み）。jigyounushi_kashi は参謀確定の8件のみ（#747-749 の振替は対象外）。
var MONTHLY_ACTUAL = [
  { month:"2026-01", total:1480475, jigyounushi_kashi:117279, borrow:195584, one_off:     0, running:1167612 },
  { month:"2026-02", total:1767200, jigyounushi_kashi:609774, borrow:120820, one_off:     0, running:1036606 },
  { month:"2026-03", total:1399157, jigyounushi_kashi: 11000, borrow:137706, one_off:     0, running:1250451 },
  { month:"2026-04", total: 949744, jigyounushi_kashi:     0, borrow:146489, one_off:     0, running: 803255 },
  { month:"2026-05", total:1108630, jigyounushi_kashi:  5000, borrow:145694, one_off:     0, running: 957936 },
  { month:"2026-06", total:1305664, jigyounushi_kashi:     0, borrow:130769, one_off:     0, running:1174895 },
  { month:"2026-07", total:1009192, jigyounushi_kashi:     0, borrow:118943, one_off:     0, running: 890249 }
  // 2026-08 は未締め（家賃・電気 未仕訳、カード9月引落分の一部未反映）。9月締め後に追記する。
];

// この一覧に載っていない月額の経費（家賃・水道光熱費など）の内訳。
// BS-keiri が集計してくれた結果を後で入れるだけで、進捗表の下段に自動で表示される。
// 1件 = { category: "分類名", monthly: 金額（数字）, detail: "主な相手先" }
// 空配列のときは「内訳を集計中」と表示される。
// 2026-09-18 BS-keiri 第3版反映。合計は 482,237 を分母にしているが、実測合計は 526,543 で 44,306 円の超過。
// o-99 に「照合で合わない差（未解明）」として 482,237 − 12行合計 を負の値で置く。ボタンは付けない。
var OUTSIDE_BREAKDOWN = [
  { id:"o-01", name:"家賃（水道込み）",              amount:106770, cycle:"monthly",  card:"PayPay 銀行",    memo:"大和リビング D-ROOM・RKS（保証会社）経由", status:null, status_date:null },
  { id:"o-02", name:"電気",                          amount:  4695, cycle:"monthly",  card:"PayPay 銀行",    memo:"沖縄電力", status:null, status_date:null },
  { id:"o-03", name:"ガス",                          amount:   861, cycle:"monthly",  card:"Amex JP 42008",  memo:"りゅうせき（都市ガス）／1〜5月の明細から。6〜8月分は未取り込み", status:null, status_date:null },
  { id:"o-04", name:"ATM の現金引き出し（生活費）",  amount: 78875, cycle:"monthly",  card:"銀行 ATM",       memo:"3万円 × 約21回", status:null, status_date:null },
  { id:"o-05", name:"Amex JP 42008 の買い物・分割・その他", amount:13958, cycle:"monthly", card:"Amex JP 42008",  memo:"", status:null, status_date:null },
  { id:"o-06", name:"Amex JP 42008 のサブスク（一覧に無い分）", amount:25486, cycle:"monthly", card:"Amex JP 42008",  memo:"", status:null, status_date:null },
  { id:"o-07", name:"Amex JP 63000",                 amount:  2159, cycle:"monthly",  card:"Amex JP 63000",  memo:"", status:null, status_date:null },
  { id:"o-08", name:"Amex US 44000 の旅行・飲食・買い物・その他", amount:196189, cycle:"monthly", card:"Amex US 44000",  memo:"旧176,867→196,189。理由：Mits様の 4カテゴリ実額から k2 一覧行と重複する 5加盟店（NOMAD.LOVE→k2-44・EWOKINAWA→k2-40・NOTE→k2-03・SUBLINE→k2-04・WEBLIO→k2-01）を除外して再集計。除外合計 187,696円/8mo = 23,462円/月。家族カード分は k4-01 に集約。年会費・手数料・利息 8,898円/月 は k1-03 と重複のため除外。Bonvoy 年会費 k3-06 は 2025-10-24 課金で window 外。仕事の外注 39,651円/月 は単発。", children:[
    { id:"o-08-1", name:"旅行・宿泊・交通（Mits様）", amount: 61276, memo:"上位3: BOOKING.COM 163,803 / 横浜宿泊 94,027 / MIYASPO AIR OKINAWA 26,565（8ヶ月合計）。k2-44 NOMAD.LOVE 136,752 と k2-40 EWOKINAWA 44,327 は重複除外。" },
    { id:"o-08-2", name:"飲食（Mits様）",            amount: 60471, memo:"上位3: IORI PG TOKYO 98,322 / JP FBA SAPPORO 85,429 / BAR COCCO OKINAWA 43,272（8ヶ月合計）。k2 と重複 0件。" },
    { id:"o-08-3", name:"買い物（Mits様）",           amount: 56007, memo:"上位3: AMAZON.CO.JP 114,947 / AMAZON DOWNLOADS 61,598 / JUN DENTAL CL 50,657（8ヶ月合計）。Amazon は複数額の都度買い物（サブスク定額と異なる）と判定・k2 と重複 0件。" },
    { id:"o-08-4", name:"その他（Mits様）",           amount: 18435, memo:"上位3: USAGI TOKYO 32,064 / SHIYOKUNOBAN OKINAWA 11,358 / NAMINOUE CRY OKINAWA 9,309（8ヶ月合計）。k2-03 NOTE 2,812・k2-04 SUBLINE 1,955・k2-01 WEBLIO 1,850 は重複除外。DMM 単発1件2,840円は irregular で k2-11 と量的不一致のため残置。" }
  ], status:null, status_date:null },
  { id:"o-09", name:"Amex US 81007 Delta（サブスク以外）",       amount: 33559, cycle:"monthly", card:"Amex US 81007",  memo:"8ヶ月実額@148円/USD: 飲食12,305 + 買い物9,294 + 旅行・宿泊・交通8,327 + その他395 + 家族カード追加カード年会費$175月割3,237 = 33,559円/月。年会費$650 Reserve本カード(月8,801) は k3-08 に移した。旧値44,846との差 -11,287円は「$650年会費控除(12,025) − 前回計算の丸めエラー(+738)」。", status:null, status_date:null },
  { id:"o-10", name:"Amex US 72006 Hilton（サブスク以外）",     amount: 23796, cycle:"monthly", card:"Amex US 72006",  memo:"", status:null, status_date:null },
  { id:"o-11", name:"BOA VISA 4452（単発以外）",     amount:  6242, cycle:"monthly",  card:"BOA VISA 4452",  memo:"", status:null, status_date:null },
  { id:"o-12", name:"Chase Sapphire 0430（サブスク以外）",       amount: 41988, cycle:"monthly", card:"Chase Sapphire 0430", memo:"", status:null, status_date:null },
  // o-99：照合で合わない差（未解明）。他の12行の合計と 482,237 の差。負の値になる場合もある。
  // ボタン無し・灰色・斜体で末尾に固定表示（画面側で扱う）。
  { id:"o-99", name:"照合で合わない差（未解明）",   amount:      0, cycle:null,       card:"",               memo:"単発の控除の過大（Hyatt・外注）とレートの丸め等。BS-keiri 調べ中。差は 482,237 − 12行合計で自動計算（マイナスになる場合は超過を意味する）。", status:null, status_date:null, residual:true }
];

// データ配列。各行に status/status_date を持つ（null | "done" | "hold" | "keep"）。
var DATA = {
  "k1": {
    title: "区分1　借入を返す",
    items: [
      { id:"k1-01", name:"楽天カード 返済（キャッシングリボ 390,000円＋歯科の分割 432,200円・残高 822,200円）", amount:35178, card:"PayPay銀行", memo:"残債元本 822,200円（2026-08-19 時点・キャッシングリボ＋歯科の分割）", notion_url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-27", next_due:"2026-09-28予定", status:null, status_date:null },
      { id:"k1-02", name:"Amex JP Marriott リボ・分割の返済＋手数料(残高 585,851円・7/20締め)", amount:94760, card:"PayPay銀行", memo:"残債元本 585,851円（2026-07-20 締めの請求書）＝リボ 476,370円（毎月元金 9,170円・手数料 年14.9%）＋分割 109,481円（みたゆた 33,337円×2・8/20締めで完済予定／8WEEKS.AI 42,807円・12月締めで完済予定）。出所 amex_jp_42008_2026-07-20_statement.pdf。8/20 締めの請求書は未取得のため、9月時点の残はこれより少ない。", notion_url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-10", next_due:"2026-10-10予定", status:null, status_date:null },
      { id:"k1-03", name:"Amex US 44000 の利息・手数料（全額払いを続ければ0）", amount:9512, card:"Wise", memo:"残債元本は未確定（利息 $307.52 が 2026-04〜06 の請求に付いた分。残高の元本はこの表では拾えていない）", notion_url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-08", next_due:"2026-10-08予定", status:null, status_date:null }
    ]
  },
  "k2": {
    title: "区分2　サーカス（定期課金）をやめる",
    items: [
      { id:"k2-01", name:"WEBLIO", amount:333, card:"Amex US 44000", memo:"", notion_url:"https://app.notion.com/3b100782d90a81d8aa58fcdb48ce93a2", url:"https://uwl.weblio.jp/", cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-03", next_due:"2026-10-03予定", status:null, status_date:null },
      { id:"k2-02", name:"Apple（iCloud+ と見られる $2.99）", amount:486, card:"Amex US 44000", memo:"【Mits様 2026-09-18 進捗表でkeep】\n", notion_url:"https://app.notion.com/3b100782d90a8130ad3df7db5104effd", url:"https://apps.apple.com/account/subscriptions", cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-15", next_due:"2026-09-15予定", status:"keep", status_date:"2026-09-18" },
      { id:"k2-03", name:"note 有料マガジン", amount:505, card:"Amex US 44000", memo:"【Mits様 2026-09-18 進捗表でkeep】\n", notion_url:"https://app.notion.com/3b100782d90a811fac2cef3b0797f0ba", url:"https://note.com/settings/membership", cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-01", next_due:"2026-10-01予定", status:"keep", status_date:"2026-09-18" },
      { id:"k2-04", name:"SUBLINE", amount:554, card:"Amex US 44000", memo:"【Mits様 2026-09-18 進捗表でkeep】\n", notion_url:"https://app.notion.com/3b100782d90a8102a0e6d2d132dcf709", url:"https://www.subline.jp/", cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-01", next_due:"2026-10-01予定", status:"keep", status_date:"2026-09-18" },
      { id:"k2-05", name:"まぐまぐ（家族カード名義）", amount:880, card:"Amex US 81007・72006", memo:"【Mits様 2026-09-18 進捗表でhandled】\n", notion_url:"https://app.notion.com/3c200782d90a818eb04dd60100cf01e1", url:"https://mypage.mag2.com/", cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-01", next_due:"2026-10-01予定", status:"handled", status_date:"2026-09-18" },
      { id:"k2-06", name:"Amazon プライム", amount:494, card:"年払い", memo:"【Mits様 2026-09-18 進捗表でkeep】\n", notion_url:"https://app.notion.com/3c200782d90a81d59ec4d120c6f9da0c", url:"https://www.amazon.co.jp/gp/primecentral", cycle:"annual", annual_amount:"$36.51（5,932円）", annual_jpy:5932, last_paid:"2026-07-15", next_due:"2027-07-15予定", status:"keep", status_date:"2026-09-18" },
      { id:"k2-07", name:"Google Workspace", amount:1048, card:"Amex US 44000", memo:"【Mits様 2026-09-18 進捗表でkeep】\nメールの土台", notion_url:"https://app.notion.com/3c000782d90a8170b3d4d676c35dd066", url:"https://admin.google.com/ac/billing/subscriptions", cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-01", next_due:"2026-10-01予定", status:"keep", status_date:"2026-09-18" },
      { id:"k2-08", name:"まぐまぐ（Mits様分）", amount:880, card:"Amex US 44000", memo:"2026-09-18 880円に修正（毎月1日 $5.48〜$5.67・Amex US 44000・高城未来研究所 Future Report）。旧 1,780円は42008ほかを含む集計だったが、Amex JP 42008 は 2026-01-01 の 880円が最後で以後なし。", notion_url:"https://app.notion.com/3b100782d90a81309510ebd596aae708", url:"https://mypage.mag2.com/", cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-01", next_due:"2026-10-01予定", status:null, status_date:null },
      { id:"k2-09", name:"ジャパンナレッジ", amount:1833, card:"年払い", memo:"【Mits様 2026-09-18 完了】\n年払い 22,000円・最終 2026-04-16。次回 2027-04-16 は更新されない。", notion_url:"https://app.notion.com/3b100782d90a8101ad74de4f0c3c2a58", url:"https://japanknowledge.com/", cycle:"annual", annual_amount:"22,000円", annual_jpy:22000, last_paid:"2026-04-16", next_due:"2027-04-16予定", status:"done", status_date:"2026-09-18" },
      { id:"k2-10", name:"マネーフォワード クラウド", amount:1857, card:"Amex US 44000", memo:"【Mits様 2026-09-18 進捗表でkeep】\n帳簿で使用中", notion_url:"https://app.notion.com/3c200782d90a81e28f17d15d707e2f17", url:"https://biz.moneyforward.com/", cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-05", next_due:"2026-10-05予定", status:"keep", status_date:"2026-09-18" },
      { id:"k2-11", name:"DMM（DMM.COM）", amount:1864, card:"", memo:"【Mits様 2026-09-18 進捗表でhold】\n", notion_url:"https://app.notion.com/3c200782d90a813ca647f4d909c8f2b1", url:null, cycle:"irregular", annual_amount:null, annual_jpy:null, last_paid:"2026-06-05", next_due:"要調査", status:"hold", status_date:"2026-09-18" },
      { id:"k2-12", name:"Glasp Pro", amount:1582, card:"年払い", memo:"【Mits様 2026-09-18 進捗表でdone】\n2026-09-18 完了。解約方法：Stripe の請求管理画面から Cancel（Mits様が画面で確認）。表示「Cancels Nov 28 / Your service will end on November 28, 2026」＝次の $150 更新は無し。最終課金 2025-11-28 $120（Amex 44000）。", notion_url:"https://app.notion.com/3bf00782d90a81d2b958f64dce1d30b8", url:null, cycle:"annual", annual_amount:"$120（18,986円）", annual_jpy:18986, last_paid:"2025-11-28", next_due:null, status:"done", status_date:"2026-09-18" },
      { id:"k2-13", name:"1ST BANKCARD CTR（正体不明）", amount:2055, card:"BOA 3245", memo:"", notion_url:"https://app.notion.com/3bf00782d90a8151b653f94bb08f12f2", url:null, cycle:"irregular", annual_amount:null, annual_jpy:null, last_paid:"2026-04-28", next_due:"要調査", status:null, status_date:null },
      { id:"k2-14", name:"MEMBERPAY NEXUS", amount:2085, card:"Amex US 44000", memo:"", notion_url:"https://app.notion.com/3b100782d90a818dad20ea0e08a0821d", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-01", next_due:"2026-10-01予定", status:null, status_date:null },
      { id:"k2-15", name:"CapCut（家族カード名義）", amount:2180, card:"Amex US 44000", memo:"【Mits様 2026-09-18 進捗表でhandled】\n", notion_url:"https://app.notion.com/3c200782d90a81c5a02dd1ca25ca90fa", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-05-16", next_due:"要調査", status:"handled", status_date:"2026-09-18" },
      { id:"k2-16", name:"U-NEXT", amount:2202, card:"Amex US 44000", memo:"", notion_url:"https://app.notion.com/3b100782d90a810d9162e56c8d8a5381", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-01", next_due:"2026-10-01予定", status:null, status_date:null },
      { id:"k2-17", name:"Duolingo", amount:2240, card:"年払い・Google Play", memo:"【Mits様 2026-09-18 完了】\nGoogle Play の定期購入で解約（年払い $167.99・最終 2026-05-25）。次回 2027-05-25 は更新されない。", notion_url:"https://app.notion.com/3c000782d90a81aaba26fcbe894951b8", url:null, cycle:"annual", annual_amount:"$167.99（26,880円）", annual_jpy:26880, last_paid:"2026-05-25", next_due:"2027-05-25予定", status:"done", status_date:"2026-09-18" },
{ id:"k2-19", name:"Netflix", amount:2356, card:"Amex US 72006", memo:"【Mits様 2026-09-18 進捗表でdone】\n契約は1本（dai@3216.fun・Amex US 72006・毎月末前後に課金）。加盟店名の3表記（NETFLIX -MINATO-KU／NETFLIX.COM TOKYO／NETFLIX.COM 708340 LOS GATOS）は同じ契約。2026-09-18 検証。", notion_url:"https://app.notion.com/3b100782d90a81b484bee3cdbce97691", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-31", next_due:"2026-09-30予定", status:"done", status_date:"2026-09-18" },
      { id:"k2-20", name:"CLEAR", amount:2387, card:"年払い", memo:"", notion_url:"https://app.notion.com/3b100782d90a8194b3b1e05b1f60dd29", url:null, cycle:"annual", annual_amount:"$179（28,640円）", annual_jpy:28640, last_paid:"2026-07-12", next_due:"2027-07-12予定", status:null, status_date:null },
      { id:"k2-21", name:"Audible", amount:2429, card:"", memo:"【Mits様 2026-09-18 進捗表でdone】\n2026-09-18 完了。解約方法：Audible のアカウント → Membership details から解約（2026-10-06 で終了・残りクレジット10は終了日までに使う）。会員 2014-05-06 から・月 $14.95。", notion_url:"https://app.notion.com/3c200782d90a81d2a6a2c6abe9ae7b7a", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-06", next_due:"2026-10-06予定", status:"done", status_date:"2026-09-18" },
      { id:"k2-22", name:"Medium", amount:2437, card:"Amex US 44000", memo:"【Mits様 2026-09-18 進捗表でdone】\n", notion_url:"https://app.notion.com/3ac00782d90a81b5aa36f324b9c2afe9", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-06", next_due:"2026-10-06予定", status:"done", status_date:"2026-09-18" },
      { id:"k2-23", name:"Canva Pro", amount:2437, card:"Amex US 72006", memo:"【Mits様 2026-09-18 進捗表でdone】\n", notion_url:"https://app.notion.com/3bf00782d90a812b89e9cab0fca0ef78", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-16", next_due:"2026-09-16予定", status:"done", status_date:"2026-09-18" },
      { id:"k2-24", name:"OpenAI ChatGPT", amount:2733, card:"Amex US 44000", memo:"【Mits様 2026-09-18 進捗表でdone】\n2026-09-18 解約。解約方法：ChatGPT 設定 → Billing → Cancel（Mits様実施）。今の請求期間の終わり 2026-09-20 まで利用可。OpenAI から「Your plan will not renew」メール 2026-09-18 16:42 受信済み。", notion_url:"https://app.notion.com/3c000782d90a8142a0f3cfefff1cf089", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-20", next_due:"2026-09-20予定", status:"done", status_date:"2026-09-18" },
      { id:"k2-25", name:"CIF TOKYO", amount:3140, card:"Amex US 72006", memo:"【Mits様 2026-09-18 進捗表でkeep】\n", notion_url:"https://app.notion.com/3b100782d90a812f9b72eb71f13fb0ab", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-20", next_due:"2026-09-20予定", status:"keep", status_date:"2026-09-18" },
      { id:"k2-26", name:"Google One", amount:3248, card:"Amex US 44000", memo:"【Mits様 2026-09-18 進捗表でkeep】\n", notion_url:"https://app.notion.com/3b100782d90a8160be58cffb9fee0e56", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-31", next_due:"2026-09-30予定", status:"keep", status_date:"2026-09-18" },
      { id:"k2-27", name:"楽天モバイル", amount:2338, card:"Amex JP 42008", memo:"【Mits様 2026-09-18 進捗表でkeep】\n", notion_url:"https://app.notion.com/3b100782d90a816191c9e509f3ded599", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-12", next_due:"2026-09-12予定", status:"keep", status_date:"2026-09-18" },
      { id:"k2-28", name:"Manus AI", amount:3290, card:"Amex US 44000", memo:"【Mits様 2026-09-18 進捗表でdone】\n2026-09-18 完了。解約方法：Settings → Usage & Billing で Free プランを選択（Mits様が画面で確認）。最後の課金 2026-08-11 Manus Plus。", notion_url:"https://app.notion.com/3c000782d90a81249d14fb7406bc69c1", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-12", next_due:"要調査(通常月20.25)", status:"done", status_date:"2026-09-18" },
      { id:"k2-29", name:"Claude Pro（家族カード）", amount:3481, card:"Amex US 44000", memo:"【Mits様 2026-09-18 進捗表でhandled】\n", notion_url:"https://app.notion.com/3ac00782d90a81b19d7fe5e35471fcc1", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-13", next_due:"2026-10-13予定", status:"handled", status_date:"2026-09-18" },
      { id:"k2-30", name:"GOOGLE STORE", amount:3611, card:"BOA 3245", memo:"", notion_url:"https://app.notion.com/3bf00782d90a81bbb072f7cc74214b96", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-08", next_due:"2026-10-08予定", status:null, status_date:null },
      { id:"k2-31", name:"TeamViewer", amount:3768, card:"年払い", memo:"【Mits様 2026-09-18 進捗表でkeep】\n", notion_url:"https://app.notion.com/3b100782d90a8103ad2cd78a2377bb0c", url:null, cycle:"annual", annual_amount:"45,210円", annual_jpy:45210, last_paid:"2026-03-16", next_due:"2027-03-16予定", status:"keep", status_date:"2026-09-18" },
      { id:"k2-32", name:"Notta", amount:4093, card:"", memo:"【Mits様 2026-09-18 進捗表でdone】\n", notion_url:"https://app.notion.com/3c200782d90a81d6a514dcbb62f78889", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-02", next_due:"2026-10-02予定", status:"done", status_date:"2026-09-18" },
      { id:"k2-33", name:"SCORESENSE", amount:5268, card:"Amex US 44000", memo:"【Mits様メモ 2026-09-18】Call our Customer Care department at 1-888-550-2159 or chat with a live agent. We are here to assist you every day of the week:\n\nMonday - Friday, 8AM to 8PM CT\nSaturday, 8AM to 5PM CT\nSunday, Noon to 6PM CT", notion_url:"https://app.notion.com/3b100782d90a811296e9e96beec4d7e7", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-24", next_due:"2026-09-24予定", status:null, status_date:null },
      { id:"k2-34", name:"PRIORITY PASS", amount:2467, card:"Amex JP ANA", memo:"【Mits様メモ 2026-09-18】営業時間に電話\n1〜7月の請求4回のうち 1/19 5,733 は事業主貸（私用）のため除外。残り3回 17,269 ÷ 7ヶ月＝2,467（2026-09-19 Mits様確認）", notion_url:"https://app.notion.com/3c200782d90a813f8498fb083eeccfd3", url:null, cycle:null, annual_amount:null, annual_jpy:null, last_paid:"2026-06-08", next_due:"要調査", status:null, status_date:null },
      { id:"k2-35", name:"TELLO", amount:6189, card:"Amex US 44000", memo:"【Mits様 2026-09-18 進捗表でkeep】\n", notion_url:"https://app.notion.com/3b100782d90a81eeb687f217ca1a12bb", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-21", next_due:"2026-09-21予定", status:"keep", status_date:"2026-09-18" },
      { id:"k2-36", name:"ムームードメイン", amount:8538, card:"", memo:"【Mits様 2026-09-18 進捗表でkeep】\n", notion_url:"https://app.notion.com/3c200782d90a81208aaed814b7d8710d", url:null, cycle:"irregular", annual_amount:null, annual_jpy:null, last_paid:"2026-09-04", next_due:"要調査(通常は年払い)", status:"keep", status_date:"2026-09-18" },
      { id:"k2-37", name:"Notion", amount:8975, card:"年払い", memo:"【Mits様 2026-09-18 進捗表でdone】\n", notion_url:"https://app.notion.com/3c000782d90a8170bb19c310b91951c8", url:null, cycle:"annual", annual_amount:"$690.77（107,700円）", annual_jpy:107700, last_paid:"2026-01-01", next_due:"2027-01-01予定", status:"done", status_date:"2026-09-18" },
      { id:"k2-38", name:"Chatwork", amount:9261, card:"", memo:"", notion_url:"https://app.notion.com/3bf00782d90a81d99273c08e8fdb3ea6", url:null, cycle:"irregular", annual_amount:null, annual_jpy:null, last_paid:"2026-07-01", next_due:"2026-09-01予定(未計上)", status:null, status_date:null },
      { id:"k2-39", name:"Genspark", amount:3164, card:"年払い", memo:"【Mits様 2026-09-18 進捗表でdone】\n2026-09-18 完了。解約方法：Genspark 設定 → 請求 で Free にダウングレード（Mits様が画面で確認）。年払い（2026-05 課金）の次回更新 2027-05 は発生しない。", notion_url:"https://app.notion.com/3bf00782d90a813cb6c4f927841d3565", url:null, cycle:"annual", annual_amount:null, annual_jpy:null, last_paid:"2026-05-12", next_due:null, status:"done", status_date:"2026-09-18" },
      { id:"k2-40", name:"EWOKINAWA", amount:11956, card:"Amex US 44000", memo:"2026-09-18 完了（済み判定）。9/1 の決済が Amex US 44000 明細（9/15 まで）に無いことを確認。最後の課金は 2026-08-01 $75.06。自然停止扱い。", notion_url:"https://app.notion.com/3c200782d90a81f7b886ddb09fd3a4d8", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-01", next_due:"2026-09-01予定", status:"done", status_date:"2026-09-18" },
{ id:"k2-42", name:"Skool", amount:15751, card:"", memo:"【Mits様 2026-09-18 進捗表でdone】\n2026-09-18 完了。解約方法：コミュニティ設定 → Billing から解約（THE INNOVATION・今の請求期間の終わりでアーカイブ・参加/投稿/チャット不可・支払い受け取り停止・独自URL解放）。", notion_url:"https://app.notion.com/3c200782d90a8199ba0ccac9379e46d0", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-18", next_due:"2026-09-18予定", status:"done", status_date:"2026-09-18" },
      { id:"k2-43", name:"DMM生成AIスクール", amount:16314, card:"Amex US 44000", memo:"【Mits様 2026-09-18 進捗表でdone】\n", notion_url:"https://app.notion.com/3b100782d90a81be8396cc633f56c304", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-17", next_due:"2026-09-17予定", status:"done", status_date:"2026-09-18" },
      { id:"k2-44", name:"NOMAD.LOVE", amount:21447, card:"Amex US 44000", memo:"【Mits様 2026-09-18 進捗表でkeep】\n", notion_url:"https://app.notion.com/3b100782d90a81fc8970c1f42dc0c7bb", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-04", next_due:"2026-10-04予定", status:"keep", status_date:"2026-09-18" },
      { id:"k2-45", name:"UTAGE", amount:21715, card:"", memo:"【Mits様 2026-09-18 進捗表でkeep】\n", notion_url:"https://app.notion.com/3c200782d90a81a5b645daaef0291a5a", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-17", next_due:"2026-09-17予定", status:"keep", status_date:"2026-09-18" },
      { id:"k2-46", name:"Anthropic Max 20x", amount:31644, card:"Amex US 44000", memo:"【Mits様 2026-09-18 進捗表でkeep】\n2026-09-18 月払いに修正。Gmail 領収書 Receipt #2161-7652-8807「Max plan 20x Qty 1 $200.00 (Sep 16–Oct 16)」で毎月16日 $200 課金と確認（08-16・07-16 も同額）。旧記載「$200×12=$2,400 年払い」は12倍しただけの誤り。", notion_url:"https://app.notion.com/3bf00782d90a81848ce8d0ef6c00b169", url:null, cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-16", next_due:"2026-10-16予定", status:"keep", status_date:"2026-09-18" }
    ]
  },
  "k3": {
    title: "区分3　カードと口座を整理する（年会費・維持費）",
    items: [
      { id:"k3-01", name:"楽天プレミアムカード 年会費", amount:917, card:"", memo:"2026-09-18 楽天カードの引落全額が k1-01 に入っているため重複（年会費 11,000円は 3月の引落に含まれる）", notion_url:"https://app.notion.com/3c000782d90a81778312dd0a8111f2d7", cycle:"annual", annual_amount:"11,000円", annual_jpy:11000, last_paid:"2026-03-03", next_due:"2027-03-03予定", status:"excluded", status_date:"2026-09-18", excluded:true },
      { id:"k3-02", name:"Chase Hyatt 年会費", amount:1267, card:"", memo:"", notion_url:"https://app.notion.com/3b100782d90a81ffb981c6f1bbdad0d6", cycle:"annual", annual_amount:"$95（15,200円）", annual_jpy:15200, last_paid:"2026-03-01", next_due:"2027-03-01予定", status:null, status_date:null },
      { id:"k3-03", name:"BOA 普通預金 3245 口座維持", amount:1899, card:"", memo:"", notion_url:"https://app.notion.com/3bf00782d90a81f38fcad3138a4020fd", cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-09-15", next_due:"2026-10-15予定", status:null, status_date:null },
      { id:"k3-04", name:"Chase 5669 口座維持", amount:2205, card:"", memo:"", notion_url:"https://app.notion.com/3c200782d90a8143ada5d136f0d5d6d0", cycle:"monthly", annual_amount:null, annual_jpy:null, last_paid:"2026-08-21", next_due:"2026-09-21予定", status:null, status_date:null },
      { id:"k3-05", name:"Amex US Hilton 年会費", amount:7442, card:"", memo:"", notion_url:"https://app.notion.com/3b100782d90a81a39153e8248eaf36e4", cycle:"annual", annual_amount:"$550（89,300円）", annual_jpy:89300, last_paid:"2026-07-17", next_due:"2027-07-17予定", status:null, status_date:null },
      { id:"k3-06", name:"Amex US Bonvoy 年会費", amount:8184, card:"", memo:"", notion_url:"https://app.notion.com/3b100782d90a8129ae7ae801e695e55d", cycle:"annual", annual_amount:"$650（98,208円）", annual_jpy:98208, last_paid:"2025-10-24", next_due:"2026-10-24予定", status:null, status_date:null },
      { id:"k3-07", name:"Chase Sapphire 年会費", amount:10765, card:"", memo:"", notion_url:null, cycle:"annual", annual_amount:"$795（129,180円）", annual_jpy:129180, last_paid:"2026-07-01", next_due:"2027-07-01予定", status:null, status_date:null },
      { id:"k3-08", name:"Amex US Delta 年会費（Reserve）", amount:8801, card:"", memo:"2026-07-07 RENEWAL MEMBERSHIP FEE $650.00（Delta Reserve 本カード・Mits様分）＠162.4782 = 105,611円。同日 家族カード追加カード分 $175.00（28,434円）は別行扱い（k3 は本カード年会費のみを対象・Hilton k3-05 と同じ運用）。出典 amex_us_2026_zenken_shokai.html／MF 仕訳「RENEWAL MEMBERSHIP FEE 07/07〜07/17 3件 $1,375.00 → 仕入高 223,408円」。", notion_url:"https://app.notion.com/3b100782d90a81a69893ff05affb3671", cycle:"annual", annual_amount:"$650（105,611円）", annual_jpy:105611, last_paid:"2026-07-07", next_due:"2027-07-07予定", status:null, status_date:null }
    ]
  },
  "k4": {
    title: "区分4　家族カードの利用を月 $100 にする",
    items: [
      { id:"k4-01", name:"家族カード利用（今の月 $421.42 → $100）", amount:50855, card:"Amex US 44000", memo:"減額実行", notion_url:null, cycle:null, annual_amount:null, annual_jpy:null, last_paid:"2026-09-14", next_due:"継続", status:null, status_date:null }
    ]
  }
  // 区分5（単発）は月額の経費ではないため計算対象外（2026-09-18 Mits様確定）
};

// 区分2（サーカス）を「月払い」と「年払い」に分ける
{
  const k2 = DATA["k2"];
  const monthly = k2.items.filter(it => it.cycle !== "annual");
  const annual  = k2.items.filter(it => it.cycle === "annual");
  DATA["k2m"] = { title: "区分2　サーカス（月払い）── 定期課金をやめる", items: monthly };
  DATA["k2a"] = { title: "区分2　サーカス（年払い）── 更新日の前に判断", items: annual, isAnnual: true };
  delete DATA["k2"];
}

// 並べ替え：通常は月額の大きい順、年払いセクションは「次の更新日」が近い順
Object.keys(DATA).forEach(k => {
  const sec = DATA[k];
  if (sec.isAnnual) {
    sec.items.sort((a,b) => {
      const ad = a.next_due || "9999-99-99";
      const bd = b.next_due || "9999-99-99";
      return ad.localeCompare(bd);
    });
  } else {
    sec.items.sort((a,b) => b.amount - a.amount);
  }
});

// 共通ヘルパー
window.ZAIMU_HELPERS = {
  STATE_KEY: "zaimu_seiri_progress_v1",
  NOTES_KEY: "zaimu_seiri_user_notes_v1",
  loadState() { try { return JSON.parse(localStorage.getItem(this.STATE_KEY)) || {}; } catch(e) { return {}; } },
  loadNotes() { try { return JSON.parse(localStorage.getItem(this.NOTES_KEY)) || {}; } catch(e) { return {}; } },
  getStatus(item) {
    const state = this.loadState();
    const s = state[item.id];
    if (s) { if (s.status) return s.status; if (s.done === true) return "done"; if (s.done === false) return null; }
    return item.status || null;
  },
  getStatusDate(item) {
    const state = this.loadState();
    const s = state[item.id];
    if (s) { if (s.status_date) return s.status_date; if (s.done_date) return s.done_date; }
    return item.status_date || null;
  },
  loadUserNote(id) {
    const all = this.loadNotes();
    return Object.prototype.hasOwnProperty.call(all, id) ? all[id] : null;
  },
  fmtYen(n) { return n.toLocaleString("ja-JP"); }
};
