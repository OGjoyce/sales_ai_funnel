#!/bin/bash
set -e

echo "🤖 MCP Service Startup"
echo "════════════════════════════════════════════════"

# Wait for Laravel API to be ready
echo "⏳ Waiting for Laravel API..."
LARAVEL_API_URL=${LARAVEL_API_URL:-http://app:8000/api}

until curl -s "${LARAVEL_API_URL}/health" > /dev/null 2>&1 || timeout 2 curl -s "http://app:8000/api" > /dev/null 2>&1; do
  echo "   Laravel API is unavailable - sleeping..."
  sleep 2
done
echo "✅ Laravel API is ready"

# Check MCP_SERVICE_TOKEN
if [ -z "$MCP_SERVICE_TOKEN" ]; then
  echo "⚠️  WARNING: MCP_SERVICE_TOKEN is not set"
  echo "   MCP tools won't authenticate with Laravel API"
fi

echo ""
echo "════════════════════════════════════════════════"
echo "✅ MCP initialization complete"
echo "════════════════════════════════════════════════"
echo ""
echo "📍 MCP Server Config:"
echo "   API URL: ${LARAVEL_API_URL}"
echo "   Token: ${MCP_SERVICE_TOKEN:-(not set)}"
echo ""

# Start MCP server
echo "🎯 Starting MCP server on port 8001..."
exec python server.py
