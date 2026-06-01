#!/bin/sh
# Sync Velora markdown into Fernando's OpenClaw workspace docs/
# Usage: sync-fernando-docs.sh [dest_dir]
# Env: REPO_ROOT (default: parent of docker/ or /app in openclaw image)

set -e

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="${REPO_ROOT:-$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)}"
DEST="${1:-${OPENCLAW_FERNANDO_DOCS:-/home/node/.openclaw/workspace-fernando/docs}}"

mkdir -p "${DEST}"

DOCS="README.md PROD_DEPLOY.md START_HERE.md DOCKER_LOCAL_README.md"

for f in ${DOCS}; do
  if [ -f "${REPO_ROOT}/${f}" ]; then
    cp "${REPO_ROOT}/${f}" "${DEST}/"
    echo "sync-fernando-docs: ${f}"
  fi
done

for extra in VELORA_QUICKSTART.md VELORA_SALES.md; do
  SRC="${REPO_ROOT}/openclaw/workspace-fernando/docs/${extra}"
  if [ -f "${SRC}" ]; then
    cp "${SRC}" "${DEST}/${extra}"
    echo "sync-fernando-docs: ${extra}"
  fi
done

# SOUL / AGENTS from repo template
WS="${REPO_ROOT}/openclaw/workspace-fernando"
TARGET_WS="$(dirname "${DEST}")"
if [ -d "${WS}" ] && [ -n "${TARGET_WS}" ]; then
  mkdir -p "${TARGET_WS}"
  for f in SOUL.md AGENTS.md; do
    if [ -f "${WS}/${f}" ]; then
      cp "${WS}/${f}" "${TARGET_WS}/${f}"
      echo "sync-fernando-docs: ${f} -> workspace root"
    fi
  done
fi

echo "sync-fernando-docs: done -> ${DEST}"
