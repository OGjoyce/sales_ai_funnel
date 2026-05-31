#!/usr/bin/env node
/**
 * Idempotent OpenClaw config for Velora CRM (prod + local Docker).
 * - gateway.auth.token from OPENCLAW_GATEWAY_TOKEN
 * - gateway.http.endpoints.chatCompletions.enabled
 * - agents.list includes slug "lina" (Lina lead generation)
 */
const fs = require('fs');

const configPath = process.env.OPENCLAW_CONFIG_PATH || '/home/node/.openclaw/openclaw.json';

if (!fs.existsSync(configPath)) {
  console.error(`openclaw-bootstrap: missing ${configPath}`);
  process.exit(1);
}

const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

cfg.gateway = cfg.gateway || {};
cfg.gateway.mode = cfg.gateway.mode || 'local';
cfg.gateway.port = cfg.gateway.port || 18789;
cfg.gateway.bind = cfg.gateway.bind || 'lan';

const token = process.env.OPENCLAW_GATEWAY_TOKEN;
if (typeof token === 'string' && token.trim() !== '') {
  cfg.gateway.auth = cfg.gateway.auth || {};
  cfg.gateway.auth.mode = 'token';
  cfg.gateway.auth.token = token.trim();
}

cfg.gateway.http = cfg.gateway.http || {};
cfg.gateway.http.endpoints = cfg.gateway.http.endpoints || {};
cfg.gateway.http.endpoints.chatCompletions = { enabled: true };

cfg.agents = cfg.agents || {};
cfg.agents.defaults = cfg.agents.defaults || {
  workspace: '/home/node/.openclaw/workspace',
};

const list = Array.isArray(cfg.agents.list) ? cfg.agents.list : [];
const hasLina = list.some((a) => a && a.id === 'lina');
if (!hasLina) {
  list.push({
    id: 'lina',
    name: 'lina',
    workspace: '/home/node/.openclaw/workspace-lina',
    agentDir: '/home/node/.openclaw/agents/lina/agent',
  });
}
cfg.agents.list = list;

const hasMain = list.some((a) => a && a.id === 'main');
if (!hasMain) {
  list.unshift({ id: 'main' });
}

fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');
console.log('openclaw-bootstrap: chatCompletions enabled, agent "lina" ensured');
