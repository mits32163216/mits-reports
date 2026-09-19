#!/bin/bash
# 財務整理 一式を social 用の非公開URL（reports.7years.life/private/zaimu-seiri/）に出す
# 手順：ローカル正本 → コピー → 伏字（Akiya様→家族カード・PayPay 5914310→PayPay 14310）
#        → noindex 追加 → index.html 作成 → git add/commit/push
# 元の正本は絶対に触らない（コピー先で処理する）
#
# 使い方：bash publish_zaimu_seiri.sh [commit_message]
# コミットメッセージを渡さない場合は "財務整理: 最新版で出し直し" になる

set -eu

SRC="/Users/nishidamitsuhiro/My Drive/00_TOP_仕事/E_財務・会計/04_口座・明細"
DST="/Users/nishidamitsuhiro/My Drive/claude-nishida/MITS-ALL/経営プロジェクト/01_The Innovation/mits-reports/private/zaimu-seiri"
REPO="/Users/nishidamitsuhiro/My Drive/claude-nishida/MITS-ALL/経営プロジェクト/01_The Innovation/mits-reports"

MSG="${1:-財務整理: 最新版で出し直し}"

# 対象11本（HTML 6本＋JS 5本）。参照は grep で確認済み・これ以外は無い
FILES=(
  "財務整理_TOP.html"
  "財務整理_TOP_年額.html"
  "財務整理_進捗表.html"
  "継続経費.html"
  "借入の返済.html"
  "一覧外_上限と判定.html"
  "zaimu_seiri_data.js"
  "zaimu_seiri_render.js"
  "zaimu_seiri_state.js"
  "zaimu_seiri_ichirangai_meisai.js"
  "zaimu_seiri_kijun.js"
)

# 1. 存在確認
for f in "${FILES[@]}"; do
  if [ ! -f "$SRC/$f" ]; then
    echo "ERROR: $SRC/$f が無い" >&2
    exit 1
  fi
done

# 2. 置き先を作る
mkdir -p "$DST"

# 3. コピー
for f in "${FILES[@]}"; do
  cp "$SRC/$f" "$DST/$f"
done

# 3b. ブラウザの古い控えを使わせない：HTML の中の js 読み込みに版番号を付ける
VER=$(date +%s)
for f in "${FILES[@]}"; do
  case "$f" in *.html) LC_ALL=C sed -i '' -E 's#src="(zaimu_seiri_[a-z_]+\.js)(\?v=[0-9]+)?"#src="\1?v='"$VER"'"#g' "$DST/$f" ;; esac
done

# 4. 伏字件数を数えてから置換（報告用）
AKIYA_COUNT=0
PAYPAY_COUNT=0
for f in "${FILES[@]}"; do
  a=$(grep -o "Akiya様" "$DST/$f" 2>/dev/null | wc -l | tr -d ' ')
  p=$(grep -o "PayPay 5914310" "$DST/$f" 2>/dev/null | wc -l | tr -d ' ')
  AKIYA_COUNT=$((AKIYA_COUNT + a))
  PAYPAY_COUNT=$((PAYPAY_COUNT + p))
done

# 5. 伏字（macOS BSD sed）
for f in "${FILES[@]}"; do
  # Akiya様 → 家族カード
  LC_ALL=C sed -i '' -e 's|Akiya様|家族カード|g' "$DST/$f"
  # PayPay 5914310（7桁）→ PayPay 14310（末尾5桁）
  LC_ALL=C sed -i '' -e 's|PayPay 5914310|PayPay 14310|g' "$DST/$f"
done

# 6. noindex を全 HTML に入れる（既に入っていればスキップ）
for f in "${FILES[@]}"; do
  case "$f" in
    *.html)
      if ! grep -q 'name="robots"' "$DST/$f"; then
        # <head> の直後に noindex を挿入
        LC_ALL=C sed -i '' -e 's|<head>|<head>\
<meta name="robots" content="noindex,nofollow">|' "$DST/$f"
      fi
      ;;
  esac
done

# 7. index.html 作成（財務整理_TOP.html へ meta refresh）
cat > "$DST/index.html" <<'HTML'
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex,nofollow">
<meta http-equiv="refresh" content="0; url=%E8%B2%A1%E5%8B%99%E6%95%B4%E7%90%86_TOP.html">
<title>財務整理</title>
</head>
<body>
<p>移動中：<a href="財務整理_TOP.html">財務整理 TOP</a></p>
</body>
</html>
HTML

# 8. 検算：noindex 件数 = HTML 総本数（TOP・進捗表・継続経費・一覧外の経費・借入の返済 + index = 6本）
HTML_TOTAL=$(ls "$DST"/*.html | wc -l | tr -d ' ')
NOINDEX_TOTAL=$(grep -l 'name="robots"' "$DST"/*.html | wc -l | tr -d ' ')
echo "---"
echo "html 総本数: $HTML_TOTAL"
echo "noindex 本数: $NOINDEX_TOTAL"
echo "Akiya様 → 家族カード: $AKIYA_COUNT 箇所"
echo "PayPay 5914310 → PayPay 14310: $PAYPAY_COUNT 箇所"

if [ "$HTML_TOTAL" != "$NOINDEX_TOTAL" ]; then
  echo "ERROR: noindex 未反映の html がある" >&2
  exit 1
fi

# 9. git add / commit / push（このフォルダのみ）
cd "$REPO"
git add "private/zaimu-seiri/"
git add "tools/publish_zaimu_seiri.sh"

if git diff --cached --quiet; then
  echo "変更なし。commit しない。"
else
  git commit -m "$MSG"
  git push origin main
  echo "---"
  echo "commit: $(git rev-parse --short HEAD)"
fi

echo "---"
echo "公開URL: https://reports.7years.life/private/zaimu-seiri/"
