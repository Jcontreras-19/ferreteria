# 🔗 Configuración del Webhook N8N - INSTRUCCIONES RÁPIDAS

## ✅ URL del Webhook Configurada

```
https://aquispe.app.n8n.cloud/webhook/envio-cotizaciones
```

## 🚀 Pasos para Activar el Webhook

### 1. Configurar en Vercel (Producción)

1. Ve a https://vercel.com y selecciona tu proyecto
2. Ve a **Settings** → **Environment Variables**
3. Busca o crea la variable:
   - **Key:** `N8N_WEBHOOK_URL`
   - **Value:** `https://aquispe.app.n8n.cloud/webhook/envio-cotizaciones`
   - **Environment:** Marca todas (Production, Preview, Development)
4. Haz clic en **Save**
5. **⚠️ IMPORTANTE:** Ve a **Deployments** y haz clic en **Redeploy** en el último deployment para aplicar los cambios

### 2. Configurar en Desarrollo Local

1. Crea o edita el archivo `.env.local` en la raíz del proyecto
2. Agrega esta línea:

```env
N8N_WEBHOOK_URL=https://aquispe.app.n8n.cloud/webhook/envio-cotizaciones
```

3. Reinicia el servidor: `npm run dev`

## ✅ Verificar que Funciona

### Opción 1: Usar el Endpoint de Diagnóstico

Abre la consola del navegador (F12) y ejecuta:

```javascript
fetch('/api/diagnostico-webhook')
  .then(r => r.json())
  .then(data => {
    console.log('📊 Diagnóstico del Webhook:')
    console.log(data)
    if (data.webhookConfigurado && data.testConexion?.exitoso) {
      console.log('✅ ¡Webhook configurado y funcionando!')
    } else {
      console.log('❌ Hay un problema con la configuración')
    }
  })
```

### Opción 2: Probar Enviando una Cotización

1. Crea una cotización de prueba desde el carrito
2. Abre la consola del navegador (F12 → Console)
3. Deberías ver estos mensajes:
   - `📤 Enviando cotización...`
   - `📥 Respuesta del servidor:`
   - `✅ Cotización creada exitosamente`
4. En los logs del servidor (Vercel → Functions → Logs) deberías ver:
   - `📤 Enviando cotización a N8N webhook...`
   - `✅ Webhook N8N respondió exitosamente`

## 📤 Formato de Datos que se Envían

El webhook recibe un JSON con esta estructura:

```json
{
  "cliente": {
    "nombre": "Jerry Contreras Niño",
    "email": "jcontreras@efc.com.pe",
    "whatsapp": "959842369"
  },
  "carrito": [
    {
      "nombre": "Destornillador Phillips #2",
      "cantidad": 2,
      "precio": 8.50
    }
  ],
  "productosNoEncontrados": [],
  "quoteId": "clx...",
  "quoteNumber": 1,
  "numeroCotizacion": "#1",
  "total": 51.88,
  "documentType": "boleta",
  "ruc": null,
  "businessName": null,
  "address": null,
  "createdAt": "2026-01-21T10:30:00.000Z"
}
```

## ⚠️ IMPORTANTE: Configuración del Email en N8N

### Problema: "No recipients defined" o "To Email: undefined"

Cuando se envía el PDF usando `multipart/form-data`, el campo `body` llega como un **string JSON**, no como un objeto parseado.

**Solución en N8N:**

En el nodo de email, cambia el campo **"To Email"** de:
```
{{ $json.body.cliente.email }}
```

A una de estas opciones:

**Opción 1 (RECOMENDADA):** Usar el campo directo
```
{{ $json.email }}
```

**Opción 2:** Parsear el JSON
```
{{ JSON.parse($json.body).cliente.email }}
```

### Campos Disponibles en N8N

- `{{ $json.name }}` - Nombre del cliente
- `{{ $json.email }}` - Email del cliente ⭐ **USA ESTE**
- `{{ $json.phone }}` - Teléfono/WhatsApp
- `{{ JSON.parse($json.body).cliente.email }}` - Email parseado del JSON
- `{{ JSON.parse($json.body).carrito }}` - Array de productos
- `{{ JSON.parse($json.body).total }}` - Total de la cotización

## 🔍 Solución de Problemas

### ❌ "N8N_WEBHOOK_URL no está configurada"

**Solución:**
- Verifica que agregaste la variable en Vercel
- Asegúrate de haber hecho **Redeploy** después de agregar la variable
- Verifica que el nombre de la variable sea exactamente `N8N_WEBHOOK_URL` (sin espacios)

### ❌ "Error de conexión" o "Timeout"

**Solución:**
- Verifica que la URL del webhook sea correcta: `https://aquispe.app.n8n.cloud/webhook/envio-cotizaciones`
- Verifica que el webhook de N8N esté activo y funcionando
- Revisa los logs de N8N para ver si está recibiendo las peticiones

### ❌ El webhook no se ejecuta pero la cotización se crea

**Solución:**
- El webhook puede fallar silenciosamente (no bloquea la creación de la cotización)
- Revisa los logs del servidor en Vercel para ver el error específico
- Usa el endpoint de diagnóstico para verificar la conexión

## 📝 Notas Importantes

- El webhook se ejecuta **después** de crear la cotización en la base de datos
- Si el webhook falla, la cotización **sí se crea** (no se bloquea el proceso)
- Los errores del webhook se registran en los logs pero no se muestran al usuario
- El timeout del webhook es de 30 segundos

## 🎯 Cambios Realizados en el Código

1. ✅ Optimizado el formato del payload para webhooks estándar de N8N
2. ✅ Mejorado el manejo de errores y timeouts
3. ✅ Agregado endpoint de diagnóstico (`/api/diagnostico-webhook`)
4. ✅ Agregado logs detallados en frontend y backend
5. ✅ Simplificado el formato del payload (arrays directos en lugar de JSON strings)
