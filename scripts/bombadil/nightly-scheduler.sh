#!/usr/bin/env bash
# Runs scripts/bombadil/nightly.sh once a day at NIGHTLY_AT (HH:MM, container time zone TZ,
# default 02:30), forever. Used by the bombadil-scheduler service in
# docker/bombadil/compose.yml. RUN_ON_START=1 also runs one nightly right away.
set -u
cd "$(dirname "$0")/../.."

NIGHTLY_AT="${NIGHTLY_AT:-02:30}"
if ! [[ "$NIGHTLY_AT" =~ ^([01][0-9]|2[0-3]):[0-5][0-9]$ ]]; then
  echo "[scheduler] NIGHTLY_AT must be HH:MM, got '$NIGHTLY_AT'" >&2
  exit 2
fi

run_nightly() {
  echo "[scheduler] nightly starting at $(date)"
  bash scripts/bombadil/nightly.sh
  echo "[scheduler] nightly finished with exit $? at $(date)"
}

seconds_until_next() {
  local now target
  if date -d "today ${NIGHTLY_AT}" +%s >/dev/null 2>&1; then
    now="$(date +%s)"
    target="$(date -d "today ${NIGHTLY_AT}" +%s)"
    if [ "$target" -le "$now" ]; then target="$(date -d "tomorrow ${NIGHTLY_AT}" +%s)"; fi
    echo $((target - now))
    return
  fi
  node -e '
    const [hh, mm] = process.argv[1].split(":").map(Number);
    const now = new Date();
    const target = new Date(now);
    target.setHours(hh, mm, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    console.log(Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 1000)));
  ' "$NIGHTLY_AT"
}

if [ "${RUN_ON_START:-0}" = "1" ]; then run_nightly; fi

while true; do
  wait_s="$(seconds_until_next)"
  echo "[scheduler] next nightly in ${wait_s}s (at ${NIGHTLY_AT} ${TZ:-UTC})"
  sleep "$wait_s"
  run_nightly
done
