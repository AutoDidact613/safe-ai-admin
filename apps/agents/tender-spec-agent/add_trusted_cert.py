"""
כלי עזר חד-פעמי לפיתוח מקומי בלבד.

מוסיף תעודת שורש (root certificate) לקובץ ה-CA bundle של certifi, כדי שספריות
Python (requests / httpx, וכפועל יוצא גם google-genai) יסמכו על תעודות שהוחלפו
ע"י תוכנת סינון רשת (למשל Netfree) שמיירטת תעבורת HTTPS.

שימוש:
    python add_trusted_cert.py <נתיב לקובץ תעודה מיוצא, .cer/.pem>

לדוגמה:
    python add_trusted_cert.py C:\\Users\\me\\Downloads\\netfree-root.cer

הערה: זה עורך קובץ בתוך חבילת certifi המותקנת ב-venv הנוכחי - אם תיצרי venv
חדש בעתיד, תצטרכי להריץ את הסקריפט הזה שוב.
"""

import sys
from pathlib import Path

import certifi


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("שימוש: python add_trusted_cert.py <נתיב לקובץ תעודה>")

    cert_path = Path(sys.argv[1])
    if not cert_path.is_file():
        sys.exit(f"הקובץ לא נמצא: {cert_path}")

    cert_content = cert_path.read_text(encoding="utf-8")
    if "-----BEGIN CERTIFICATE-----" not in cert_content:
        sys.exit(
            "הקובץ לא נראה כמו תעודה תקינה בפורמט Base-64 (PEM). "
            "ודאי שייצאת אותו כ-'Base-64 encoded X.509 (.CER)' מ-certmgr.msc."
        )

    bundle_path = Path(certifi.where())
    bundle_content = bundle_path.read_text(encoding="utf-8")

    if cert_content.strip() in bundle_content:
        print(f"התעודה כבר קיימת ב-{bundle_path}, לא נעשה שינוי.")
        return

    with bundle_path.open("a", encoding="utf-8") as bundle_file:
        bundle_file.write("\n" + cert_content.strip() + "\n")

    print(f"התעודה נוספה בהצלחה ל-{bundle_path}")
    print("אפשר להריץ שוב את run_agent.py.")


if __name__ == "__main__":
    main()
