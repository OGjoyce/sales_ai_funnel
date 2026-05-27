#!/bin/sh
set -e

echo "🤖 OpenClaw Gateway Startup"
echo "════════════════════════════════════════════════"

# Check if openclaw.json exists
if [ ! -f "/home/node/.openclaw/openclaw.json" ]; then
  echo "⚠️  openclaw.json not found at /home/node/.openclaw/openclaw.json"
  echo "   Creating from example..."

  if [ -f "/home/node/.openclaw/openclaw.json.example" ]; then
    cp /home/node/.openclaw/openclaw.json.example /home/node/.openclaw/openclaw.json
    echo "✅ Created openclaw.json from example"
    echo "   ⚠️  Please update with your configuration!"
  else
    echo "❌ No openclaw.json.example found"
    echo "   Please provide openclaw/.openclaw/openclaw.json"
    exit 1
  fi
fi

# Verify JSON is valid
echo "🔍 Validating openclaw.json..."
if node -e "require('/home/node/.openclaw/openclaw.json')" 2>/dev/null; then
  echo "✅ openclaw.json is valid"
else
  echo "⚠️  openclaw.json validation warning (may still work)"
fi

echo ""
echo "════════════════════════════════════════════════"
echo "✅ OpenClaw initialization complete"
echo "════════════════════════════════════════════════"
echo ""
echo "📍 Gateway Config:"
echo "   Config file: /home/node/.openclaw/openclaw.json"
echo "   Token: ${OPENCLAW_GATEWAY_TOKEN:-(not set)}"
echo ""

# Start OpenClaw gateway
echo "🎯 Starting OpenClaw gateway on port 18789..."
exec openclaw gateway
