# PayPal — prueba 7 días y suscripción Pro

## Flujo en Velora

1. Al registrarse, el usuario recibe **7 días gratis** (`VELORA_TRIAL_DAYS`, por defecto 7).
2. Durante la prueba puede usar el CRM con normalidad; verá un aviso con días restantes.
3. Al terminar la prueba, el middleware redirige a **`/billing`**.
4. El usuario pulsa **「Pagar con PayPal / tarjeta」** → checkout PayPal (acepta tarjeta sin cuenta PayPal).
5. Tras aprobar, `subscription_status` pasa a **`active`** y recupera acceso.

## Configuración en PayPal Developer

1. Crear app en [developer.paypal.com](https://developer.paypal.com) (Sandbox para pruebas).
2. **Productos y suscripciones** → crear producto + plan mensual (ej. USD 500).
3. Copiar el **Plan ID** (`P-...`) → `PAYPAL_PLAN_ID` en `.env`.
4. Copiar **Client ID** y **Secret** → `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`.
5. **Webhooks** → URL: `https://tu-dominio.com/webhooks/paypal`  
   Eventos:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
6. Copiar **Webhook ID** → `PAYPAL_WEBHOOK_ID`.

## Variables `.env`

```env
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_PLAN_ID=P-...
PAYPAL_WEBHOOK_ID=...
PAYPAL_PLAN_LABEL=Velora Pro
PAYPAL_PLAN_PRICE=500
PAYPAL_CURRENCY=USD
VELORA_TRIAL_DAYS=7
```

En producción: `PAYPAL_MODE=live` y credenciales Live.

## Migración

```bash
php artisan migrate
```

Añade `paypal_subscription_id` y `subscription_ends_at` en `users`.

## Probar en local

Con ngrok o similar, expón `https://xxx.ngrok.io/webhooks/paypal` en el webhook de Sandbox.

Return URL: `https://tu-app/billing/paypal/return` (automática vía `route()`).
