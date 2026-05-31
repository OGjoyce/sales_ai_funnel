#!/bin/sh
set -e

echo "🤖 OpenClaw Gateway Startup"
echo "════════════════════════════════════════════════"

OPENCLAW_DIR="/home/node/.openclaw"
CONFIG="${OPENCLAW_DIR}/openclaw.json"
EXAMPLE_BAKED="/home/node/.openclaw-baked/openclaw.json.example"
EXAMPLE_MOUNT="${OPENCLAW_DIR}/openclaw.json.example"

mkdir -p "${OPENCLAW_DIR}"

# First boot: create config from example (mounted repo or image-baked)
if [ ! -f "${CONFIG}" ]; then
  echo "⚠️  openclaw.json not found — creating from example..."
  if [ -f "${EXAMPLE_MOUNT}" ]; then
    cp "${EXAMPLE_MOUNT}" "${CONFIG}"
    echo "✅ Created from ${EXAMPLE_MOUNT}"
  elif [ -f "${EXAMPLE_BAKED}" ]; then
    cp "${EXAMPLE_BAKED}" "${CONFIG}"
    echo "✅ Created from image-baked example"
  else
    echo "❌ No openclaw.json.example (mount openclaw/.openclaw/ or rebuild image)"
    exit 1
  fi
fi

echo "🔍 Validating openclaw.json..."
if node -e "JSON.parse(require('fs').readFileSync('${CONFIG}','utf8'))" 2>/dev/null; then
  echo "✅ openclaw.json is valid JSON"
else
  echo "❌ openclaw.json is invalid JSON"
  exit 1
fi

# CRM: chat completions + Lina agent + gateway token sync
echo "🔧 Bootstrapping CRM gateway (chatCompletions + agent lina)..."
export OPENCLAW_CONFIG_PATH="${CONFIG}"
node /usr/local/bin/openclaw-bootstrap.js

openclaw config set gateway.http.endpoints.chatCompletions.enabled true 2>/dev/null || true

mkdir -p /home/node/.openclaw/workspace-lina
if ! openclaw agents list 2>/dev/null | grep -qE '^- lina\b'; then
  echo "   Adding OpenClaw agent: lina"
  openclaw agents add lina --non-interactive --workspace /home/node/.openclaw/workspace-lina 2>/dev/null || true
fi

echo ""
echo "════════════════════════════════════════════════"
echo "✅ OpenClaw initialization complete"
echo "════════════════════════════════════════════════"
echo "   Config: ${CONFIG}"
echo "   Lina slug: lina (set OPENCLAW_LINA_AGENT_ID=lina in Laravel .env)"
if [ -n "${OPENCLAW_GATEWAY_TOKEN}" ]; then
  echo "   Gateway token: (from OPENCLAW_GATEWAY_TOKEN)"
else
  echo "   ⚠️  OPENCLAW_GATEWAY_TOKEN not set — sync token in openclaw.json manually"
fi
echo ""

echo "🎯 Starting OpenClaw gateway on port 18789..."
exec openclaw gateway
