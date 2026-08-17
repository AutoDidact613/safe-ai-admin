#!/usr/bin/env bash
# משחזר בסיס נתונים מקובץ גיבוי שנוצר ע"י backup.sh (מוחק נתונים קיימים ומחליף אותם)
set -euo pipefail
cd "$(dirname "$0")/.."

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "שימוש: ./backup/restore.sh backups/backup-XXXXXXXX-XXXXXX.gz"
  exit 1
fi

docker compose exec -T mongo mongorestore --archive --gzip --drop < "$FILE"
echo "השחזור מ-$FILE הושלם"
