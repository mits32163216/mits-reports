"use strict";
// 状態の保存ファイル（zaimu_seiri_state.js）
//
// data.js の後・render.js の前に読み込む。SAVED_STATE をベースにして、
// ブラウザの localStorage に残っている操作を「新しい方が勝ち」で重ねる。
//
// このファイルは、TOP か進捗表の「💾 状態をファイルに保存」ボタンで生成する。
// Chrome の Downloads に落ちるので、参謀が 04_口座・明細/ に手動で移す。

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
      "status": "keep",
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
    },
    "k2-38": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k3-06": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k4-01": {
      "status": "done",
      "status_date": "2026-09-18"
    },
    "k2-16": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-01": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "k2-08": {
      "status": "keep",
      "status_date": "2026-09-18"
    }
  },
  "outside": {
    "o-01": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "o-02": {
      "status": "keep",
      "status_date": "2026-09-18"
    },
    "o-03": {
      "status": "keep",
      "status_date": "2026-09-18"
    }
  },
  "notes": {
    "k2-33": "Call our Customer Care department at 1-888-550-2159 or chat with a live agent. We are here to assist you every day of the week:\n\nMonday - Friday, 8AM to 8PM CT\nSaturday, 8AM to 5PM CT\nSunday, Noon to 6PM CT",
    "k2-34": "営業時間に電話",
    "k2-38": "下げると40日しか見られない　過去ログの為",
    "k2-30": "pixelの残債　払ってしまう"
  },
  "saved_at": "2026-09-19T06:28:18.063Z"
};
