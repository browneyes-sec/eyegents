#!/usr/bin/env bash
# Scripts/run-aider-task.sh
# Run Aider with a specific task
# Usage: scripts/run-aider-task.sh "task description" [files...]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ $# -lt 1 ]; then
  echo "❌ Usage: $0 \"task description\" [files...]"
  exit 1
fi

TASK="$1"
shift

# Auto-run mode detection if needed
if [ -z "${EYEGENTS_MODE:-}" ]; then
  if [ -x "scripts/eyegents-doctor.sh" ]; then
    scripts/eyegents-doctor.sh >/dev/null 2>&1 || true
  fi
  if command -v docker >/dev/null; then
    if [ -f "/proc/meminfo" ]; then
      MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
      MEM_GB=$((MEM_KB / 1024 / 1024))
      if [ "$MEM_GB" -ge 8 ]; then
        export EYEGENTS_MODE="full"
      else
        export EYEGENTS_MODE="thin"
      fi
    else
      export EYEGENTS_MODE="thin"
    fi
  else
    export EYEGENTS_MODE="thin"
  fi
fi

echo "🤖 Running Aider task (mode: $EYEGENTS_MODE)"
echo "   Task: $TASK"

# Run Aider with task
./scripts/start-aider.sh "$TASK" "$@"
