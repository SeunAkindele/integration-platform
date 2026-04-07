#!/usr/bin/env sh
# Operation 4: send many requests through the LB and summarize instanceId counts.
# Usage: ./scripts/verify-load-balance.sh [BASE_URL] [REQUEST_COUNT]
# Example: ./scripts/verify-load-balance.sh http://127.0.0.1:8080 50

set -eu

URL="${1:-http://127.0.0.1:8080}"
N="${2:-50}"

case "$N" in
  '' | *[!0-9]*) echo "REQUEST_COUNT must be a positive integer" >&2; exit 1 ;;
esac
if [ "$N" -lt 1 ]; then
  echo "REQUEST_COUNT must be at least 1" >&2
  exit 1
fi

base="${URL%/}/"

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

i=1
while [ "$i" -le "$N" ]; do
  if command -v jq >/dev/null 2>&1; then
    id=$(curl -fsS "$base" | jq -r '.instanceId')
  else
    id=$(curl -fsS "$base" | sed -n 's/.*"instanceId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
  fi
  if [ -z "$id" ]; then
    echo "failed to parse instanceId from response (request $i)" >&2
    exit 1
  fi
  printf '%s\n' "$id" >>"$tmpdir/ids"
  i=$((i + 1))
done

echo "Requests: $N  $base"
echo "Distribution:"
sort "$tmpdir/ids" | uniq -c | sort -nr
