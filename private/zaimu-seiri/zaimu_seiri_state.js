"use strict";
// 状態の保存ファイル（zaimu_seiri_state.js）
//
// data.js の後・render.js の前に読み込む。SAVED_STATE をベースにして、
// ブラウザの localStorage に残っている操作を「新しい方が勝ち」で重ねる。
//
// このファイルは、TOP かサブスク整理の「💾 状態をファイルに保存」ボタンで生成する。
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
      "status": "done",
      "status_date": "2026-09-19"
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
      "status": "done",
      "status_date": "2026-09-19"
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
      "status": "done",
      "status_date": "2026-09-19"
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
    },
    "k2-49": {
      "status": "keep",
      "status_date": "2026-09-19"
    },
    "k2-30": {
      "status": "done",
      "status_date": "2026-09-20"
    },
    "k2-33": {
      "status": "done",
      "status_date": "2026-09-20"
    },
    "k2-34": {
      "status": "done",
      "status_date": "2026-09-20"
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
  "saved_at": "2026-09-19T12:44:18.578Z",
  "ichirangai": {
    "m-007": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-053": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-002": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-040": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-003": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-042": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-043": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-046": {
      "status": "keep",
      "date": "2026-09-19"
    },
    "m-047": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-049": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-050": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-054": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-055": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-057": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-021": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-006": {
      "status": "keep",
      "date": "2026-09-19"
    },
    "m-022": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-051": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-019": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-005": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-041": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-025": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-009": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-016": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-017": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-018": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-k008": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-k012": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k015": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k031": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-k041": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k037": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k173": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k143": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k085": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k075": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k065": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k061": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k057": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k056": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k052": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k050": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k048": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k046": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k042": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k016": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k027": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k032": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k080": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-044": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-k047": {
      "status": "once",
      "date": "2026-09-19"
    },
    "m-k070": {
      "status": "cut",
      "date": "2026-09-19"
    },
    "m-008": {
      "status": "once",
      "date": "2026-09-19"
    }
  },
  "ichirangai_plan": {}
};
