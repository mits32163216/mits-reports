#!/bin/bash
# WatchPaths が発火するたびに呼ばれる薄いラッパー。
# 連続保存で何度も publish が走らないよう、30秒のデバウンスを掛ける。
# 仕組み：
#   1. /tmp/zaimu_publish_pending に、自分の起動時刻（epoch秒）を書く
#   2. 30秒スリープ
#   3. その間に別のイベントが上書きしていたら、自分は捨てて終了（新しい方が publish する）
#   4. 上書きされていなければ publish_zaimu_seiri.sh を走らせる
#
# 目的：launchd の WatchPaths は保存1回で複数イベントを吐くことがあり、
#       Mits様が連続で保存しても最後の1回だけを push したい。

set -u

PENDING="/tmp/zaimu_publish_pending"
LOG="/Users/nishidamitsuhiro/Library/Logs/zaimu_seiri_publish.log"
PUB="/Users/nishidamitsuhiro/My Drive/claude-nishida/MITS-ALL/経営プロジェクト/01_The Innovation/mits-reports/tools/publish_zaimu_seiri.sh"

mkdir -p "$(dirname "$LOG")"

# 1. 自分の起動時刻を書く
MY_TIME=$(date +%s%N)  # ナノ秒精度（連続発火の衝突を避ける）
echo "$MY_TIME" > "$PENDING"

# 2. 30秒待つ
sleep 30

# 3. ぶつかっていないか確認
CURRENT=$(cat "$PENDING" 2>/dev/null || echo "0")
if [ "${CURRENT}" != "${MY_TIME}" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] skip: 新しいイベントに置き換えられた 自分=${MY_TIME} / 最新=${CURRENT}" >> "$LOG"
  exit 0
fi

# 4. publish 実行
echo "[$(date '+%Y-%m-%d %H:%M:%S')] publish 開始 trigger=${MY_TIME}" >> "$LOG"
/bin/bash "$PUB" "自動反映: 財務整理ファイル更新" >> "$LOG" 2>&1
STATUS=$?
echo "[$(date '+%Y-%m-%d %H:%M:%S')] publish 終了 exit=${STATUS}" >> "$LOG"
echo "---" >> "$LOG"
exit "$STATUS"
