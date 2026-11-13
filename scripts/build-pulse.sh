#!/usr/bin/env bash
# Hourly pulse of the build (docs/ECONOMY-MODE.md section 5). Read-only.
# Run from the main repo folder: bash scripts/build-pulse.sh
# Prints PROGRESS or STALL. STALL = in the last 60 minutes there was no merge
# into build/next, no new green CI run and fewer than 2 slice branches with
# new commits, or the state file is older than 90 minutes.
set -u
git fetch -q origin 2>/dev/null
now=$(date +%s)
echo "Pulse $(date '+%d %b %H:%M')  build/next $(git rev-parse --short origin/build/next)"

echo "- Last CI runs on build/next:"
gh run list --branch build/next --limit 3 --json databaseId,status,conclusion,createdAt,headSha \
  --jq '.[] | "    \(.databaseId) \(.status) \(.conclusion) \(.headSha[0:8]) \(.createdAt)"' 2>/dev/null
green=$(gh run list --branch build/next --limit 5 --json conclusion,updatedAt \
  --jq '[.[] | select(.conclusion=="success") | select((.updatedAt | fromdateiso8601) > (now - 3600))] | length' 2>/dev/null)
green=${green:-0}

merges=$(git log origin/build/next --first-parent --merges --since='60 minutes ago' --format='    %h %s' | grep -vi 'origin/main' | cut -c1-110)
mcount=$(printf '%s' "$merges" | grep -c . )
echo "- Merges into build/next, last 60 min: $mcount"
[ -n "$merges" ] && echo "$merges"

active=0
names=""
for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/slice); do
  n=$(git log "$b" --no-merges --since='60 minutes ago' --oneline | wc -l)
  if [ "$n" -gt 0 ]; then active=$((active + 1)); names="$names ${b#origin/slice/}($n)"; fi
done
echo "- Slice branches with new commits, last 60 min: $active$names"

st=$(git log -1 --format=%ct origin/main -- docs/BUILD-STATE.md)
age=$(( (now - st) / 60 ))
echo "- State file last updated: $age min ago"
grep -m1 '^\*\*Next result for the owner' docs/BUILD-STATE.md 2>/dev/null | cut -c1-300

if [ "$age" -gt 90 ]; then
  echo "STALL: the state file is older than 90 minutes"
elif [ "$mcount" -eq 0 ] && [ "$green" -eq 0 ] && [ "$active" -lt 2 ]; then
  echo "STALL: no merge, no green run and fewer than 2 active slices in 60 minutes"
else
  echo "PROGRESS"
fi

# CSV row for later comparison (system trial, docs/plans/system-trial-2026-11-13.md)
csv=docs/metrics/build-pulse.csv
mkdir -p docs/metrics
[ -f "$csv" ] || echo "timestamp,merges_60min,active_slices,green_60min,red_60min,cancelled_60min,state_age_min,verdict" > "$csv"
counts=$(gh run list --branch build/next --limit 30 --json conclusion,updatedAt \
  --jq '[.[] | select((.updatedAt | fromdateiso8601) > (now - 3600))] | "\([.[]|select(.conclusion=="success")]|length),\([.[]|select(.conclusion=="failure")]|length),\([.[]|select(.conclusion=="cancelled")]|length)"' 2>/dev/null)
counts=${counts:-0,0,0}
if [ "$age" -gt 90 ]; then v=STALL
elif [ "$mcount" -eq 0 ] && [ "$green" -eq 0 ] && [ "$active" -lt 2 ]; then v=STALL
else v=PROGRESS; fi
echo "$(date '+%Y-%m-%dT%H:%M:%S%z'),$mcount,$active,$counts,$age,$v" >> "$csv"
