#!/usr/bin/env bash
# Resume un fallo de CI como anotaciones del check, que se leen sin abrir los registros.
# Uso: scripts/ci-fallo.sh ci.log
log="${1:-ci.log}"
[ -f "$log" ] || exit 0
esc() { sed -e 's/%/%25/g' -e 's/\r/%0D/g' | awk 'BEGIN { ORS = "%0A" } { print }'; }
errors=$(grep -E '^e: |error:|ERROR|FAILED' "$log" | grep -v 'npm warn' | head -n 30 || true)
[ -n "$errors" ] && echo "::error title=Errores::$(printf '%s\n' "$errors" | esc)"
wrong=$(awk '/What went wrong/ { f = 1 } /^\* Try:/ { f = 0 } f' "$log" | head -n 40 || true)
[ -n "$wrong" ] && echo "::error title=Gradle::$(printf '%s\n' "$wrong" | esc)"
echo "::error title=Final del registro::$(tail -n 60 "$log" | esc)"
