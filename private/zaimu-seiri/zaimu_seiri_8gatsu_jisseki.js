"use strict";
// 2026-08 単月の実績（第7版 v7.3 準拠・Mits様「全部入れる」規則反映・JAL 訂正版）。BS-keiri 2026-09-19。
// レート USD 148。CSV 相手先別集計 + MF 仕訳（DF.ペイデイ 未払金正規化・#890 MacBook Pro 購入計上）。
//
// === Reconciliation（1円まで） ===
// a_total (サブスク一覧A 8月・31 id)   = 205,282
// b_total (m-* + 新 m-aXX の 8月部分)  = 563,457
// loan (借入返済・楽天+AmexJP+ペイデイ)= 177,743
// jk (自己口座間 Wise→PayPay 2件のみ)  = 450,451
// 外事業経費 (為替差損益・Stripe手数料等)= 105,305
// 合計 = 1,502,238 = MF 8月 支出 1,502,238（0円差）
//
// === loan 内訳（Aug 177,743）===
// 楽天カード引落 8/27  = 33,403（うち キャッシングリボ手数料 6,115 は #851 で計上）
// Amex JP 42008 8/10   = 114,579（7/20 締めの statement 全額）
// Amex JP ペイフレックス = 11,853（分割 2,682×2 + 576 + 5,913）
// ペイディ 8/27         = 17,908（MacBook Pro 分割 4/24・#851）
//
// === 前セッション由来の変更（v7.3）===
// DF.カンリヒトウ 26,530 → 現金生活費/管理費（旧 jk から移動・Mits様 2026-09-19）
// 家族 5,400 → 現金生活費/家族（旧 skip:定義外 から移動）
// DF.ペイデイ 17,908 → loan（旧 カード生活費 から移動）
// jk からは Wise→PayPay 2件（自己口座間）のみ残る
//
// === MF 変更 ===
// #890 (新規): 2026-04-20 MacBook Pro 429,800 消耗品費/未払金 (工具器具備品アカウント無効のため消耗品費で代用)
// #558/#570/#583/#851: DF.ペイデイ branches を 消耗品費 → 未払金(ペイディサブなし) へ変更
// 8月末 未払金/ペイディ 残高 = 429,800 - 17,908×3 - 18,158 = 357,918
// (参謀 358,168 との差 250 は 6/28 の 18,158 が本来 17,908 と比べて 250 高いため)
//
var ZS_JISSEKI_08 = {
  period: "2026-08",
  rate_usd: 148,
  a_rows: {"k2-26": 6658, "k2-46": 34496, "k2-02": 12063, "k2-33": 4798, "k2-35": 2335, "k2-24": 2554, "k2-42": 14652, "k2-43": 15247, "k2-45": 20119, "k2-48": 1766, "k2-28": 0, "k2-21": 2213, "k2-22": 2220, "k2-10": 1742, "k2-44": 19536, "k2-01": 309, "k2-32": 3728, "k2-07": 975, "k2-08": 1666, "k2-14": 1948, "k2-03": 474, "k2-04": 512, "k2-16": 2036, "k2-40": 11109, "k2-19": 2127, "k2-25": 2879, "k2-23": 2220, "k2-30": 3377, "k2-49": 5500, "k2-27": 2181, "k2-64": 23842},
  a_other: [],
  b_items: {"m-035": 17904, "m-009": 4739, "m-005": 19209, "m-018": 11829, "m-007": 9992, "m-036": 2814, "m-012": 4576, "m-004": 6953, "m-006": 4666, "m-k022": 16310, "m-044": 3278, "m-001": 150000, "m-rent": 128413, "m-a01": 1880, "m-a02": 145, "m-a03": 1096, "m-a04": 26621, "m-a05": 1029, "m-a06": 8198, "m-a07": 1786, "m-a08": 1834, "m-a09": 3857, "m-a10": 3484, "m-a11": 2728, "m-a12": 1301, "m-a13": 26600, "m-a14": 9033, "m-a15": 4881, "m-a16": 443, "m-a17": 1027, "m-a18": 2140, "m-a19": 1946, "m-a20": 110, "m-a21": 841, "m-a22": 5140, "m-a23": 5402, "m-a24": 9118, "m-a25": 1003, "m-a26": 5179, "m-a27": 567, "m-a28": 5056, "m-a29": 620, "m-a30": 1474, "m-a31": 2421, "m-a32": 410, "m-a33": 5667, "m-a34": 410, "m-a35": 3068, "m-a36": 485, "m-a37": 875, "m-a38": 3883, "m-a39": 2220, "m-a40": 252, "m-a41": 314, "m-a42": -3700, "m-a43": 26530, "m-a44": 0, "m-a45": 5400, "m-a46": 0, "m-a47": 0},
  b_new: [
    {"id": "m-a01", "merchant": "ETCカード売上", "category": "旅行", "sub": "交通", "aug_amount": 1880, "total_1_8": 1880},
    {"id": "m-a02", "merchant": "振込手数料（PayPay 銀行）", "category": "カード生活費", "sub": "その他", "aug_amount": 145, "total_1_8": 2465},
    {"id": "m-a03", "merchant": "LAWSON       *", "category": "カード生活費", "sub": "食事", "aug_amount": 1096, "total_1_8": 1096},
    {"id": "m-a04", "merchant": "TOWNPLAZAKANEOKINAWA", "category": "カード生活費", "sub": "食事", "aug_amount": 26621, "total_1_8": 26621},
    {"id": "m-a05", "merchant": "BOOK WALKER         TOKYO", "category": "カード生活費", "sub": "本", "aug_amount": 1029, "total_1_8": 1029},
    {"id": "m-a06", "merchant": "BAR A Z      OKINAWA", "category": "カード生活費", "sub": "食事", "aug_amount": 8198, "total_1_8": 8198},
    {"id": "m-a07", "merchant": "SURFCAFEULUOKOKINAWA", "category": "カード生活費", "sub": "食事", "aug_amount": 1786, "total_1_8": 1786},
    {"id": "m-a08", "merchant": "SUSHITENSOBATOKINAWA", "category": "カード生活費", "sub": "食事", "aug_amount": 1834, "total_1_8": 1834},
    {"id": "m-a09", "merchant": "TOWNPLAZAKANEHIDEYOGOKINAWA", "category": "カード生活費", "sub": "食事", "aug_amount": 3857, "total_1_8": 3857},
    {"id": "m-a10", "merchant": "YASUSUSHI    OKINAWA", "category": "カード生活費", "sub": "食事", "aug_amount": 3484, "total_1_8": 3484},
    {"id": "m-a11", "merchant": "RIUBOU STORE        JAPAN", "category": "カード生活費", "sub": "食事", "aug_amount": 2728, "total_1_8": 2728},
    {"id": "m-a12", "merchant": "MCDONALDS MOBTOKYO", "category": "カード生活費", "sub": "食事", "aug_amount": 1301, "total_1_8": 1301},
    {"id": "m-a13", "merchant": "CATCH THE WEB       KANAGAWA", "category": "カード生活費", "sub": "サブスク", "aug_amount": 26600, "total_1_8": 26600},
    {"id": "m-a14", "merchant": "JUNKUDOSHOTENOKINAWA", "category": "カード生活費", "sub": "本", "aug_amount": 9033, "total_1_8": 9033},
    {"id": "m-a15", "merchant": "FAMILY MART  *", "category": "カード生活費", "sub": "食事", "aug_amount": 4881, "total_1_8": 4881},
    {"id": "m-a16", "merchant": "APPLE.COM/BILINTERNET CHARGE", "category": "カード生活費", "sub": "サブスク", "aug_amount": 443, "total_1_8": 443},
    {"id": "m-a17", "merchant": "MARUBOSHI    OKINAWA", "category": "カード生活費", "sub": "食事", "aug_amount": 1027, "total_1_8": 1027},
    {"id": "m-a18", "merchant": "uranaha ajitona ba shi", "category": "カード生活費", "sub": "食事", "aug_amount": 2140, "total_1_8": 2140},
    {"id": "m-a19", "merchant": "COCOKARAFINE KANAGAWA", "category": "カード生活費", "sub": "食事", "aug_amount": 1946, "total_1_8": 1946},
    {"id": "m-a20", "merchant": "SEVEN ELEVEN *", "category": "カード生活費", "sub": "食事", "aug_amount": 110, "total_1_8": 110},
    {"id": "m-a21", "merchant": "KOEI TAXI    OKINAWA", "category": "旅行", "sub": "交通", "aug_amount": 841, "total_1_8": 841},
    {"id": "m-a22", "merchant": "RYUKYUORIONHOOKINAWA", "category": "カード生活費", "sub": "食事", "aug_amount": 5140, "total_1_8": 5140},
    {"id": "m-a23", "merchant": "TORITAKU PG  OKINAWA", "category": "カード生活費", "sub": "食事", "aug_amount": 5402, "total_1_8": 5402},
    {"id": "m-a24", "merchant": "DIFY PROFESSIONAL PLWILMINGTON", "category": "カード生活費", "sub": "サブスク", "aug_amount": 9118, "total_1_8": 9118},
    {"id": "m-a25", "merchant": "MOS BURGER   OKINAWA", "category": "カード生活費", "sub": "食事", "aug_amount": 1003, "total_1_8": 1003},
    {"id": "m-a26", "merchant": "DENTALSALON CLASSA  OKINAWA", "category": "カード生活費", "sub": "サービス", "aug_amount": 5179, "total_1_8": 5179},
    {"id": "m-a27", "merchant": "FAMILY MART         *", "category": "カード生活費", "sub": "食事", "aug_amount": 567, "total_1_8": 567},
    {"id": "m-a28", "merchant": "TUIKYASU            TOKYO", "category": "カード生活費", "sub": "その他", "aug_amount": 5056, "total_1_8": 5056},
    {"id": "m-a29", "merchant": "GAS FIXTURES RYOKINNOKINAWA", "category": "カード生活費", "sub": "日用", "aug_amount": 620, "total_1_8": 620},
    {"id": "m-a30", "merchant": "TOKYU STORE FKAMIMEGURO", "category": "カード生活費", "sub": "食事", "aug_amount": 1474, "total_1_8": 1474},
    {"id": "m-a31", "merchant": "FUJIMI KOUTU KANAGAWA", "category": "旅行", "sub": "交通", "aug_amount": 2421, "total_1_8": 2421},
    {"id": "m-a32", "merchant": "SERIA        KANAGAWA", "category": "カード生活費", "sub": "その他", "aug_amount": 410, "total_1_8": 410},
    {"id": "m-a33", "merchant": "CREATE SD    KANAGAWA", "category": "カード生活費", "sub": "食事", "aug_amount": 5667, "total_1_8": 5667},
    {"id": "m-a34", "merchant": "CANDO CEEU YO*", "category": "カード生活費", "sub": "その他", "aug_amount": 410, "total_1_8": 410},
    {"id": "m-a35", "merchant": "YAOKOOYOKOHAMKANAGAWA", "category": "カード生活費", "sub": "食事", "aug_amount": 3068, "total_1_8": 3068},
    {"id": "m-a36", "merchant": "MYBASKET     *", "category": "カード生活費", "sub": "その他", "aug_amount": 485, "total_1_8": 485},
    {"id": "m-a37", "merchant": "TOKYU DEPARTMYOKOHAMA-SHI", "category": "カード生活費", "sub": "食事", "aug_amount": 875, "total_1_8": 875},
    {"id": "m-a38", "merchant": "DIDI MOBILITY JAPAN TOKYO", "category": "旅行", "sub": "交通", "aug_amount": 3883, "total_1_8": 3883},
    {"id": "m-a39", "merchant": "MONTHLY SERVICE FEE", "category": "カード生活費", "sub": "その他", "aug_amount": 2220, "total_1_8": 2220},
    {"id": "m-a40", "merchant": "INTEREST CHARGED ON BANK CASH ADVAN", "category": "カード生活費", "sub": "その他", "aug_amount": 252, "total_1_8": 252},
    {"id": "m-a41", "merchant": "INTEREST CHARGED ON PURCHASES", "category": "カード生活費", "sub": "その他", "aug_amount": 314, "total_1_8": 314},
    {"id": "m-a42", "merchant": "AMEX Brilliant Dining Credit", "category": "カード生活費", "sub": "割戻", "aug_amount": -3700, "total_1_8": -3700},
    {"id": "m-a43", "merchant": "他の不動産の管理費（DF.カンリヒトウ）", "category": "現金生活費", "sub": "管理費", "aug_amount": 26530, "total_1_8": 202440},
    {"id": "m-a44", "merchant": "振込 家族（給与）", "category": "現金生活費", "sub": "家族", "aug_amount": 0, "total_1_8": 951711},
    {"id": "m-a45", "merchant": "振込 家族", "category": "現金生活費", "sub": "家族", "aug_amount": 5400, "total_1_8": 87985},
    {"id": "m-a46", "merchant": "JALカード 決済（三菱UFJニコス）", "category": "カード生活費", "sub": "カード引落", "aug_amount": 0, "total_1_8": 2200},
    {"id": "m-a47", "merchant": "振込 カ)マーケティングワークス", "category": "投資", "sub": "外注", "aug_amount": 0, "total_1_8": 54400}
  ],
  by_cat: {"現金生活費": 310343, "カード生活費": 146395, "浪費": 45769, "投資": 35615, "旅行": 25335},
  a_total: 205282,
  b_total: 563457,
  loan: 177743,
  jigyounushi_kashi: 450451,
  jigyokeihi_hoka: 105305,
  running: 768739,
  total: 1502238,
  monthly_actual_row: {
    month: "2026-08",
    total: 1502238,
    jigyounushi_kashi: 450451,
    borrow: 177743,
    one_off: 0,
    running: 768739
  },
  reconciliation: "a 205282 + b 563457 + loan 177743 + jk 450451 + 事業経費 105305 = 1502238 = MF 8月 1,502,238（0円差）"
};
if (typeof module !== "undefined" && module.exports) module.exports = ZS_JISSEKI_08;