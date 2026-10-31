#!/usr/bin/env bash
# Morning check: everything that can be tested without a phone, in one go.
#
#   npm run check:morning
#
# Runs typecheck, lint, format, unit tests, builds the iOS, Android and web
# JS bundles, then the headless smoke test on the web build. Every step runs
# even if an earlier one fails; the summary lands in
# test-results/morning/summary.md and the exit code is non-zero if any
# required step failed. expo-doctor is informational (it needs the Expo API).
set -uo pipefail

cd "$(dirname "$0")/.."
OUT=test-results/morning
rm -rf "$OUT"
mkdir -p "$OUT/logs"
SUMMARY="$OUT/summary.md"
failed=()

{
  echo "# Guardrr morning check"
  echo
  echo "- Date: $(date -u '+%Y-%m-%d %H:%M UTC')"
  echo "- Commit: $(git rev-parse --short HEAD 2>/dev/null || echo unknown) — $(git log -1 --format=%s 2>/dev/null || true)"
  echo
  echo "| Step | Result | Time |"
  echo "| --- | --- | --- |"
} > "$SUMMARY"

# step <name> <required|optional> <command...>
step() {
  local name="$1" kind="$2"
  shift 2
  local log="$OUT/logs/${name// /-}.log" start end result
  echo "▶ $name"
  start=$(date +%s)
  if "$@" > "$log" 2>&1; then
    result="✅ pass"
  elif [ "$kind" = required ]; then
    result="❌ FAIL"
    failed+=("$name")
    tail -n 40 "$log"
  else
    result="⚠️ skipped/failed (optional)"
  fi
  end=$(date +%s)
  echo "| $name | $result | $((end - start))s |" >> "$SUMMARY"
  echo "  $result"
}

export CI=1
step "typecheck" required npx tsc --noEmit
step "lint" required npx eslint .
step "format" required npx prettier --check .
step "unit tests" required npx jest --ci
step "ios bundle" required npx expo export --platform ios --output-dir "$OUT/dist-ios"
step "android bundle" required npx expo export --platform android --output-dir "$OUT/dist-android"
step "web bundle" required npx expo export --platform web --output-dir "$OUT/dist-web"
step "smoke test" required node e2e/smoke.js "$OUT/dist-web" "$OUT"
step "expo-doctor" optional timeout 120 npx expo-doctor

# Test count and smoke results for the summary.
tests=$(grep -E '^Tests:' "$OUT/logs/unit-tests.log" | head -1 | tr -s ' ')
{
  echo
  [ -n "$tests" ] && echo "Unit tests: ${tests#Tests: }."
  echo
  echo "## Smoke checks"
  echo
  grep -E '^(✓|✗) ' "$OUT/logs/smoke-test.log" | sed 's/^/- /'
  echo
  if [ ${#failed[@]} -eq 0 ]; then
    echo "**All required checks passed.**"
  else
    echo "**Failed: ${failed[*]}** — see $OUT/logs/."
  fi
} >> "$SUMMARY"

rm -rf "$OUT"/dist-ios "$OUT"/dist-android
echo
cat "$SUMMARY"
[ ${#failed[@]} -eq 0 ]
