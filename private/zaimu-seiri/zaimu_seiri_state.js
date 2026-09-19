"use strict";
// 状態の保存ファイル（zaimu_seiri_state.js）
//
// data.js の後・render.js の前に読み込む。SAVED_STATE をベースにして、
// ブラウザの localStorage に残っている操作を「新しい方が勝ち」で重ねる。
//
// 「💾 状態をファイルに保存」ボタンで、ブラウザから最新の SAVED_STATE を
// ダウンロードして、このファイルを丸ごと差し替える運用。
//
// 初期値は 2026-09-19 時点の data.js の status を機械的に抜いたもの。
// data.js は BS-keiri が編集するので、こちらに status を書かない（唯一のソース＝この state.js）。

var SAVED_STATE = {
  "progress": {
    "k3-01": {
      "status": "excluded",
      "status_date": "2026-09-18"
    },
    "k2-46": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-45": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-44": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-43": {
      "status": "done",
      "status_date": "2026-09-18"
    },
    "k2-42": {
      "status": "done",
      "status_date": "2026-09-18"
    },
    "k2-40": {
      "status": "done",
      "status_date": "2026-09-18"
    },
    "k2-36": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-35": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-32": {
      "status": "done",
      "status_date": "2026-09-18"
    },
    "k2-29": {
      "status": "handled",
      "status_date": "2026-09-18"
    },
    "k2-28": {
      "status": "done",
      "status_date": "2026-09-18"
    },
    "k2-26": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-25": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-24": {
      "status": "done",
      "status_date": "2026-09-18"
    },
    "k2-22": {
      "status": "done",
      "status_date": "2026-09-18"
    },
    "k2-23": {
      "status": "done",
      "status_date": "2026-09-18"
    },
    "k2-21": {
      "status": "done",
      "status_date": "2026-09-18"
    },
    "k2-19": {
      "status": "done",
      "status_date": "2026-09-18"
    },
    "k2-27": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-15": {
      "status": "handled",
      "status_date": "2026-09-18"
    },
    "k2-11": {
      "status": "hold",
      "status_date": "2026-09-18"
    },
    "k2-10": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-07": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-05": {
      "status": "handled",
      "status_date": "2026-09-18"
    },
    "k2-04": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-03": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-02": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-37": {
      "status": "done",
      "status_date": "2026-09-18"
    },
    "k2-31": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-09": {
      "status": "done",
      "status_date": "2026-09-18"
    },
    "k2-17": {
      "status": "done",
      "status_date": "2026-09-18"
    },
    "k2-06": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-12": {
      "status": "done",
      "status_date": "2026-09-18"
    },
    "k2-39": {
      "status": "done",
      "status_date": "2026-09-18"
    }
  },
  "outside": {},
  "notes": {},
  "saved_at": "2026-09-19T06:00:47.582Z"
};
