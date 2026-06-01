# Velora — Guía rápida

## Acceso

1. Regístrate en `/register` o inicia sesión en `/login`.
2. Verifica tu email (enlace en el correo) antes de usar el CRM.
3. Tras verificar, recibirás un correo de bienvenida con enlaces útiles.

## Activación comercial

- Objetivo: plan **Pro** (desde USD $500/mes) u **Ops** (WhatsApp-first custom).
- Pantalla `/billing` y Calendly para cerrar con ventas.
- Fernando (este agente) vende planes pagos; ver `VELORA_SALES.md`.

## CRM principal

| Ruta | Uso |
|------|-----|
| `/crm/kanban` | Embudo de ventas, arrastrar leads, Lina, lead manual |
| `/crm/products` | Catálogo de productos |
| `/crm/agent` | Estado de integraciones (OpenAI, OpenClaw) |
| `/crm/training` | Subir PDF/MD para RAG privado del usuario |
| `/crm/playground` | Probar agente con herramientas + KB |
| `/?chat=fernando` | Chat público con Fernando (burbuja en landing) |

## Lina (leads)

1. En kanban: **Agregar leads** → elige productos y notas.
2. Requiere cola: `php artisan queue:work` (o worker en Docker).
3. OpenClaw agente `lina` + `OPENAI_API_KEY` en el gateway.

## Cola de trabajos

Sin worker, Lina y scrape quedan en cola:

```bash
docker compose -f docker-compose.prod.yml exec app php artisan queue:work
```

## Ayuda

- Fernando en la landing: `/?chat=fernando`
- Calendly: consulta 15 min (ver landing)
- Soporte: email/WhatsApp en configuración del servidor (`VELORA_*` en `.env`)
