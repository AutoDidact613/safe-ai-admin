#!/usr/bin/env bash
# יוצר גיבוי מלא של בסיס הנתונים (Mongo הרץ בתוך docker compose) לקובץ יחיד
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
FILE="backups/backup-$TIMESTAMP.gz"

docker compose exec -T mongo mongodump --archive --gzip --db=pedagogical_system > "$FILE"
echo "הגיבוי נשמר ב-$FILE"
