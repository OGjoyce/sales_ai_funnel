# Velora

CRM premium con embudo tipo Kanban, catálogo de productos, base de conocimiento (RAG) por usuario, y agente IA con tools para ventas (incluye integración opcional con OpenClaw para scraping/WhatsApp/email).

---

## 🚀 Quick Start (Docker - Recommended)

**For Windows/Mac/Linux users** with Docker Desktop installed:

```bash
# 1. Clone and configure
git clone https://github.com/OGjoyce/sales_ai_funnel.git
cd sales_ai_funnel
copy .env.example .env        # Windows: use 'copy'
cp .env.example .env          # Mac/Linux: use 'cp'

# 2. Edit .env with your API keys
# - OPENAI_API_KEY (from openai.com)
# - OPENCLAW_GATEWAY_TOKEN
# - MCP_SERVICE_TOKEN

# 3. Start services
docker compose -f docker-compose.local.yml up -d

# 4. Initialize database
docker compose -f docker-compose.local.yml exec app php artisan migrate

# 5. Open browser
# http://localhost
```

**Platform-specific guides:**
- **Windows:** See [WINDOWS_SETUP.md](./WINDOWS_SETUP.md)
- **All platforms:** See [DOCKER_LOCAL_README.md](./DOCKER_LOCAL_README.md)

**Port Reference:**
| Service | URL | Purpose |
|---------|-----|---------|
| Web UI | http://localhost | React frontend + API |
| OpenClaw | http://localhost:18789 | Agent gateway |
| MCP Server | http://localhost:8001 | Claude integration |

👉 See [PORT_REFERENCE.md](./PORT_REFERENCE.md) for complete port documentation.

---

## Local Development (Without Docker)

If you prefer to run locally without Docker:

### Requisitos

- PHP 8.3+, Composer, Node.js 20+, npm
- SQLite (por defecto) o MySQL/Postgres si cambias `.env`

## Puesta en marcha rápida

```bash
cd sales_ai_funnel
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm install
php artisan storage:link
php artisan wayfinder:generate
```

Usuario de prueba tras el seed:

- **Email:** `test@example.com`
- **Contraseña:** `password`

## Levantar todos los servicios (recomendado en desarrollo)

Desde la raíz del proyecto:

```bash
composer run dev
```

Esto arranca en paralelo (ver `composer.json` script `dev`):

- `php artisan serve` — aplicación en **http://127.0.0.1:8000**
- `php artisan queue:listen` — procesa jobs (scraping, agente async si lo usas)
- `npm run dev` — Vite (HMR)
- `php artisan pail` — logs en consola

Abre el navegador en **http://127.0.0.1:8000**, inicia sesión y entra a **Embudo CRM** o **Productos** en el menú lateral.

### Si prefieres terminales separadas

1. Terminal 1: `php artisan serve`
2. Terminal 2: `npm run dev`
3. Terminal 3: `php artisan queue:work --queue=default,agent`

## Variables de entorno importantes

| Variable | Uso |
|----------|-----|
| `OPENAI_API_KEY` | Agente (`AgentService`). Sin clave, el botón "Agente" devuelve error claro. |
| `OPENAI_MODEL` | Por defecto `gpt-4o-mini` en `.env.example`. |
| `OPENCLAW_GATEWAY_URL` | Si está vacío, scraping y envíos usan **respuesta mock** para desarrollo. |
| `OPENCLAW_API_KEY` | Cabecera Bearer hacia tu gateway (si aplica). |
| `OPENCLAW_WEBHOOK_SECRET` | Cabecera `X-OpenClaw-Secret` en webhooks entrantes. |
| `MCP_SERVICE_TOKEN` | Bearer token para `/api/service/*` (MCP Python). |

Copia valores de ejemplo desde `.env.example` y define al menos `MCP_SERVICE_TOKEN` para probar el MCP.

## Cómo probar el CRM en la UI

1. **Kanban:** `/crm/kanban` — crea un lead manual, arrastra entre columnas, usa **Encolar scrape** (requiere worker de cola).
2. **Scraping:** con `OPENCLAW_GATEWAY_URL` vacío, el job crea **3 leads mock**. Con OpenClaw configurado, sustituye la lógica en `OpenClawGateway`.
3. **Productos:** `/crm/products` — alta con imagen opcional (se guarda en `storage/app/public/products`).
4. **Agente:** en una tarjeta, **Agente** o en el diálogo **Ejecutar agente** — hace una corrida **síncrona** contra OpenAI y ejecuta tools (DB + OpenClaw mock/real).

## API JSON (Sanctum, sesión web)

Con la sesión iniciada en el mismo sitio, las peticiones desde el frontend envían cookies + `X-CSRF-TOKEN` (compartido vía Inertia).

Rutas principales bajo `/api` (autenticado):

- `GET /api/funnel` — columnas y leads
- `PATCH /api/leads/{id}/stage` — mover lead
- `POST /api/leads/scrape` — encola `ScrapeLeadsJob`
- `POST /api/agent/run` — `{ "lead_id": 1, "async": false }`

Rutas de servicio (Bearer `MCP_SERVICE_TOKEN`):

- `GET /api/service/products?search=&limit=`
- `GET /api/service/leads/{id}/history`
- `PATCH /api/service/leads/{id}/stage`

Webhooks (sin sesión; requieren `X-OpenClaw-Secret` si configuraste secreto):

- `POST /api/webhooks/openclaw/whatsapp`
- `POST /api/webhooks/openclaw/email`

## Servidor MCP (Python)

```bash
cd mcp-server
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export LARAVEL_API_URL=http://127.0.0.1:8000/api
export MCP_SERVICE_TOKEN=   # mismo valor que en .env de Laravel
python server.py
```

Integra el comando en tu cliente MCP (p. ej. Cursor) según la documentación de FastMCP (transporte stdio por defecto al ejecutar `mcp.run()`).

## Tema visual

Paleta púrpura “futurista” en modo oscuro: variables `--color-crm-*` en `resources/css/app.css` y tokens aplicados en las páginas CRM.

## Tests

```bash
php artisan test
npm run types:check   # puede mostrar avisos del starter Wayfinder en rutas `.form`
```

