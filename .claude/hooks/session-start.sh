#!/bin/bash
# =============================================================================
#  SessionStart-Hook — installiert Abhängigkeiten für Claude Code on the web,
#  damit Build/Preview/MCP sofort laufen. Idempotent, nicht-interaktiv.
# =============================================================================
set -euo pipefail

# Nur in der Remote-Umgebung (Web) nötig; lokal überspringen.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# npm install (nicht ci) profitiert vom Container-Cache.
npm install --no-audit --no-fund
