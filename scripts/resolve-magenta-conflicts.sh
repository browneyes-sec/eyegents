#!/usr/bin/env bash
set -euo pipefail

# Accept feature branch version for conflicted magenta files
# Run from the repository root

FILES=(
  magenta/agents/base.py
  magenta/api/routes/__init__.py
  magenta/api/routes/approvals.py
  magenta/api/routes/health.py
  magenta/api/server.py
  magenta/config.py
  magenta/core/models.py
  magenta/core/swarm.py
  magenta/integration/sentinel.py
  magenta/integration/splunk.py
  magenta/models/base.py
  magenta/models/router.py
  magenta/orchestration/dispatcher.py
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Use git to checkout the incoming (theirs) version
    git checkout --theirs -- "$file" 2>/dev/null || true
    git add "$file"
  fi
done

echo "✅ Resolved conflicts by accepting feature branch versions."
