#!/usr/bin/env bash
# BPV-07 nightly Bombadil run (decision BPV-D09: nightly, not the PR gate).
# It runs locally, on the host or inside the docker/bombadil container. It does not run on GitHub.
#
# Every target runs even when an earlier one fails. The run ends with exit 1 if any
# deterministic check or target failed. Everything lands in bombadil-output/nightly-<UTC time>/:
#   summary.md   targets, exit codes, violations and quiescence warnings
#   coverage.md  asserted, explored-only and never-fired transitions (BPV-D11)
#   <target>.log and one Bombadil output directory per target
#
# Budgets: TIME_LIMIT (spa, lab-smoke; default 5m), WORKBENCH_TIME_LIMIT (10m),
# PAGE_LOAD_TIME_LIMIT (2m per entry), CANARY_TIME_LIMIT (2m per canary run), MIN_FIRINGS (20).
# SKIP_BUILD=1 reuses dist/.
set -u
cd "$(dirname "$0")/../.."

TIME_LIMIT="${TIME_LIMIT:-5m}"
WORKBENCH_TIME_LIMIT="${WORKBENCH_TIME_LIMIT:-10m}"
PAGE_LOAD_TIME_LIMIT="${PAGE_LOAD_TIME_LIMIT:-2m}"
MIN_FIRINGS="${MIN_FIRINGS:-20}"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
NIGHTLY_DIR="${NIGHTLY_DIR:-bombadil-output/nightly-${STAMP}}"

mkdir -p "$NIGHTLY_DIR"
SUMMARY="$NIGHTLY_DIR/summary.md"
failed=()

{
  echo "# Bombadil nightly ${STAMP}"
  echo
  echo "Budgets: spa and lab-smoke ${TIME_LIMIT}, page-load ${PAGE_LOAD_TIME_LIMIT} per entry, workbench ${WORKBENCH_TIME_LIMIT}, firing bound ${MIN_FIRINGS}."
  echo
  echo "The canary's violations are its seeded bug: the canary step passes when it finds them."
  echo
  echo "| Step | Exit | Violations | Quiescence warnings |"
  echo "| --- | --- | --- | --- |"
} > "$SUMMARY"

step() {
  local name="$1"; shift
  local log="$NIGHTLY_DIR/$name.log"
  echo "[nightly] $name"
  "$@" > "$log" 2>&1
  local code=$?
  local violations quiescence
  violations="$(grep -c 'was violated' "$log")"
  quiescence="$(grep -c 'quiescence timer' "$log")"
  echo "| $name | $code | $violations | $quiescence |" >> "$SUMMARY"
  echo "[nightly] $name exit=$code violations=$violations quiescence=$quiescence"
  if [ "$code" -ne 0 ]; then failed+=("$name"); fi
}

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  step build npm run build:astro
fi
step check-bombadil-nets npm run check:bombadil-nets
step check-explorable-gui npm run check:explorable-gui
step canary node scripts/bombadil/canary.mjs --time-limit "${CANARY_TIME_LIMIT:-2m}"
step spa node scripts/bombadil/run.mjs spa --time-limit "$TIME_LIMIT" --output-path "$NIGHTLY_DIR/spa"
step lab-smoke node scripts/bombadil/run.mjs lab-smoke --time-limit "$TIME_LIMIT" --output-path "$NIGHTLY_DIR/lab-smoke"
step page-load node scripts/bombadil/run.mjs page-load --time-limit "$PAGE_LOAD_TIME_LIMIT" --output-path "$NIGHTLY_DIR/page-load"
step workbench node scripts/bombadil/run.mjs workbench --time-limit "$WORKBENCH_TIME_LIMIT" --output-path "$NIGHTLY_DIR/workbench"
step workbench-firings node scripts/bombadil/trace-to-net.mjs "$NIGHTLY_DIR/workbench" --min-firings "$MIN_FIRINGS"

# Coverage uses this nightly's traces only. The canary seeds a bug on purpose and writes elsewhere.
node scripts/check-net.mjs --bombadil-traces "$NIGHTLY_DIR" --markdown > "$NIGHTLY_DIR/coverage.md" 2> "$NIGHTLY_DIR/coverage-rejected.log"

{
  echo
  if [ "${#failed[@]}" -eq 0 ]; then
    echo "Result: clean."
  else
    echo "Result: failed steps: ${failed[*]}."
    echo
    echo "Shrink each violation, read it with \`bombadil browser inspect\`, promote it to tests/features/ and record it in docs/sprints/_active/DECISIONS.tsv."
  fi
  echo
  echo "Coverage: coverage.md. Traces the net rejected: coverage-rejected.log ($(wc -l < "$NIGHTLY_DIR/coverage-rejected.log" | tr -d ' ') lines)."
} >> "$SUMMARY"

echo "[nightly] summary: $SUMMARY"
cat "$SUMMARY"
[ "${#failed[@]}" -eq 0 ]
