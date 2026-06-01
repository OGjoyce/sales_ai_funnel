#!/usr/bin/env node
/**
 * Idempotent OpenClaw config for Velora CRM (prod + local Docker).
 * - gateway.auth.token from OPENCLAW_GATEWAY_TOKEN
 * - gateway.http.endpoints.chatCompletions.enabled
 * - agents.list includes lina, fernando, invoker
 * - agents.defaults.model.primary = openai/gpt-4o (see OPENCLAW_DEFAULT_MODEL)
 */
const fs = require('fs');

const configPath = process.env.OPENCLAW_CONFIG_PATH || '/home/node/.openclaw/openclaw.json';

if (!fs.existsSync(configPath)) {
  console.error(`openclaw-bootstrap: missing ${configPath}`);
  process.exit(1);
}

const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function resolveDefaultModelId() {
  const raw =
    process.env.OPENCLAW_DEFAULT_MODEL ||
    process.env.OPENAI_MODEL ||
    'gpt-4o';
  const trimmed = String(raw).trim();
  if (trimmed === '') {
    return 'openai/gpt-4o';
  }
  if (trimmed.includes('/')) {
    return trimmed;
  }
  return `openai/${trimmed}`;
}

/** OpenClaw expects model.primary + models catalog, not a bare string on defaults. */
function applyDefaultModelConfig(defaults, modelId) {
  if (typeof defaults.model === 'string') {
    delete defaults.model;
  }
  defaults.model = defaults.model && typeof defaults.model === 'object' ? defaults.model : {};
  defaults.model.primary = modelId;
  if (!Array.isArray(defaults.model.fallbacks)) {
    defaults.model.fallbacks = ['openai/gpt-4o-mini'];
  }
  defaults.models = defaults.models && typeof defaults.models === 'object' ? defaults.models : {};
  if (!defaults.models[modelId]) {
    defaults.models[modelId] = { alias: 'GPT-4o' };
  }
  if (!defaults.models['openai/gpt-4o-mini']) {
    defaults.models['openai/gpt-4o-mini'] = { alias: 'GPT-4o mini' };
  }
}

/** Per-agent `model: "openai/..."` strings break routing; use defaults instead. */
function normalizeAgentModelFields(agent) {
  if (!agent || typeof agent !== 'object') {
    return;
  }
  if (typeof agent.model === 'string') {
    delete agent.model;
  }
}

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

const controlOrigin =
  process.env.OPENCLAW_CONTROL_UI_ORIGIN || 'https://velora.guatemalia.com';
const controlBasePath =
  process.env.OPENCLAW_CONTROL_UI_BASE_PATH || '/openclaw';
cfg.gateway.controlUi = cfg.gateway.controlUi || {};
cfg.gateway.controlUi.enabled = true;
cfg.gateway.controlUi.basePath = controlBasePath;
cfg.gateway.controlUi.allowedOrigins = [
  'http://localhost:18789',
  'http://127.0.0.1:18789',
  controlOrigin.replace(/\/$/, ''),
  controlOrigin.replace(/\/$/, '') + controlBasePath,
];
cfg.gateway.controlUi.dangerouslyDisableDeviceAuth = true;

cfg.gateway.trustedProxies = cfg.gateway.trustedProxies || [
  '127.0.0.1',
  '::1',
  '10.0.0.0/8',
  '172.16.0.0/12',
];

cfg.agents = cfg.agents || {};
cfg.agents.defaults = cfg.agents.defaults || {
  workspace: '/home/node/.openclaw/workspace',
};

const defaultModelId = resolveDefaultModelId();
applyDefaultModelConfig(cfg.agents.defaults, defaultModelId);

const list = Array.isArray(cfg.agents.list) ? cfg.agents.list : [];
function ensureAgent(id, name, workspace, agentDir) {
  const existing = list.find((a) => a && a.id === id);
  if (existing) {
    existing.name = existing.name || name;
    existing.workspace = workspace;
    existing.agentDir = existing.agentDir || agentDir;
    normalizeAgentModelFields(existing);
    return;
  }
  list.push({ id, name, workspace, agentDir });
}

ensureAgent(
  'lina',
  'lina',
  '/home/node/.openclaw/workspace-lina',
  '/home/node/.openclaw/agents/lina/agent',
);
ensureAgent(
  'fernando',
  'fernando',
  '/home/node/.openclaw/workspace-fernando',
  '/home/node/.openclaw/agents/fernando/agent',
);
ensureAgent(
  'invoker',
  'invoker',
  '/home/node/.openclaw/workspace-invoker',
  '/home/node/.openclaw/agents/invoker/agent',
);

for (const agent of list) {
  normalizeAgentModelFields(agent);
  if (agent?.id === 'invoker') {
    agent.workspace = '/home/node/.openclaw/workspace-invoker';
  }
}

const hasMain = list.some((a) => a && a.id === 'main');
if (!hasMain) {
  list.unshift({ id: 'main' });
}
cfg.agents.list = list;

fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');
console.log(
  `openclaw-bootstrap: chatCompletions on, agents ok, default model ${defaultModelId}`,
);
