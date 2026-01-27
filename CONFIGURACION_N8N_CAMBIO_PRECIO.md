# 📧 Configuración N8N - Notificación de Cambios de Precio

## 🎯 Funcionalidad

Cuando un administrador cambia el precio de un producto, el sistema:
1. Busca todas las cotizaciones que contengan ese producto
2. Filtra por antigüedad según lo especificado por el admin (opcional)
3. Actualiza el precio en cada cotización afectada
4. Genera un nuevo PDF con el precio actualizado
5. Envía una notificación al webhook de N8N con toda la información

## ⚙️ Configuración en Vercel

### Variable de Entorno Requerida

Ve a **Vercel Dashboard** → Tu Proyecto → **Settings** → **Environment Variables** y agrega:

- **Key**: `N8N_PRICE_CHANGE_WEBHOOK_URL`
- **Value**: Tu URL del webhook de N8N para cambios de precio
- **Environment**: Marca todas (Production, Preview, Development)

**Ejemplo:**
```
N8N_PRICE_CHANGE_WEBHOOK_URL=https://aquispe.app.n8n.cloud/webhook/cambio-precio
```

**Nota:** Si no configuras `N8N_PRICE_CHANGE_WEBHOOK_URL`, el sistema usará `N8N_WEBHOOK_URL` como alternativa.

## 🔧 Configuración del Workflow en N8N

### 1. Crear el Webhook

1. En N8N, crea un nuevo workflow
2. Agrega un nodo **Webhook**
3. Configura:
   - **Method**: `POST`
   - **Path**: `/cambio-precio` (o el que prefieras)
   - **Response Mode**: "Respond When Last Node Finishes"
4. Copia la URL del webhook y configúrala en Vercel como `N8N_PRICE_CHANGE_WEBHOOK_URL`

### 2. Configurar el Nodo de Email

Después del webhook, agrega un nodo **Send Email** (o el nodo de email que uses):

**Campos disponibles en el webhook:**

- `event`: `"product_price_changed"` (siempre este valor)
- `name`: Nombre del cliente
- `email`: Correo del cliente
- `phone`: Teléfono/WhatsApp del cliente
- `productId`: ID del producto
- `productName`: Nombre del producto
- `oldPrice`: Precio anterior
- `newPrice`: Precio nuevo
- `quoteId`: ID de la cotización
- `quoteNumber`: Número de cotización (ej: 123)
- `quoteCreatedAt`: Fecha de creación de la cotización
- `notificationDays`: Días de antigüedad configurados (o "all" si se notifica a todos)
- `dateFilterApplied`: `"true"` o `"false"`
- `dateFilterFrom`: Fecha desde la cual se filtraron las cotizaciones (si aplica)
- `totalQuotesFound`: Total de cotizaciones revisadas
- `totalAffectedQuotes`: Total de cotizaciones afectadas
- `pdf`: Archivo PDF de la cotización actualizada (como archivo adjunto)

### 3. Ejemplo de Configuración del Email

**Asunto:**
```
Actualización de Precio - Cotización #{{ $json.quoteNumber }}
```

**Cuerpo del Email:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #22c55e; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .info-box { background-color: #f0f9ff; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; }
    .price-change { font-size: 18px; font-weight: bold; color: #22c55e; }
    .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CORPORACIÓN GRC - SERVICIOS GENERALES</h1>
  </div>
  
  <div class="content">
    <h2>Estimado/a {{ $json.name }},</h2>
    
    <p>Le informamos que el precio de uno de los productos incluidos en su cotización ha sido actualizado.</p>
    
    <div class="info-box">
      <h3>Detalles del Cambio:</h3>
      <p><strong>Producto:</strong> {{ $json.productName }}</p>
      <p><strong>Precio Anterior:</strong> S/. {{ $json.oldPrice }}</p>
      <p class="price-change">Precio Nuevo: S/. {{ $json.newPrice }}</p>
      <p><strong>Cotización:</strong> #{{ $json.quoteNumber }}</p>
    </div>
    
    <p>Se ha generado una nueva cotización actualizada con el precio modificado, la cual encontrará adjunta en este correo.</p>
    
    <p>Si tiene alguna consulta, no dude en contactarnos.</p>
    
    <p>Atentamente,<br>
    <strong>CORPORACIÓN GRC - SERVICIOS GENERALES</strong></p>
  </div>
  
  <div class="footer">
    <p>Este es un correo automático. Por favor no responda a este mensaje.</p>
  </div>
</body>
</html>
```

**Adjuntos:**
- Adjunta el archivo `pdf` que viene en el webhook

## 📋 Uso desde el Panel de Administración

### Cómo Configurar el Tiempo de Notificación

1. Ve a **Productos** → Selecciona un producto → **Editar**
2. En el formulario de edición, verás una sección azul: **"Notificar cambios de precio"**
3. Tienes dos opciones:

   **Opción 1: Notificar a TODAS las cotizaciones**
   - Deja el campo **vacío**
   - Se notificará a todos los clientes que tengan una cotización con ese producto, sin importar la fecha

   **Opción 2: Notificar solo cotizaciones recientes**
   - Ingresa el número de días (ej: `3`, `7`, `30`)
   - Solo se notificarán las cotizaciones creadas en los últimos N días
   - Ejemplos:
     - `3` = Últimos 3 días
     - `7` = Última semana
     - `30` = Último mes

4. Cambia el precio del producto
5. Guarda los cambios
6. El sistema automáticamente:
   - Buscará las cotizaciones afectadas
   - Filtrará por fecha si especificaste días
   - Actualizará los precios en las cotizaciones
   - Generará PDFs actualizados
   - Enviará las notificaciones a N8N

## 🔍 Logs y Debugging

El sistema registra información detallada en los logs:

```
🔍 [DEBUG] Variables de entorno al cambiar precio:
   N8N_PRICE_CHANGE_WEBHOOK_URL: ✅ https://...
   N8N_WEBHOOK_URL: ✅ https://...
   Webhook seleccionado: ✅ https://...

📅 Filtrando cotizaciones de los últimos 3 días (desde 24/1/2026)
📊 Resumen de cotizaciones afectadas:
   Total cotizaciones revisadas: 50
   Cotizaciones con este producto: 12
   Filtro aplicado: últimos 3 días

📤 [ENVÍO] Enviando PDF actualizado:
   URL del webhook: https://...
   Cotización ID: ...
   Cliente: cliente@email.com
   ¿Es webhook de cambio de precio?: ✅ SÍ

✅ PDF actualizado enviado para cotización ... a cliente@email.com
```

## ⚠️ Notas Importantes

1. **Actualización Automática**: Las cotizaciones se actualizan automáticamente en la base de datos con el nuevo precio antes de enviar la notificación.

2. **Procesamiento en Paralelo**: Las notificaciones se envían en paralelo para no bloquear la respuesta del API.

3. **No Bloquea la Actualización**: Si falla el envío de notificaciones, la actualización del producto se completa igualmente.

4. **Filtro de Fecha**: El filtro se aplica sobre la fecha de creación (`createdAt`) de la cotización.

5. **Valor por Defecto**: Si no especificas `notificationDays` o lo dejas vacío, se notificará a TODAS las cotizaciones con ese producto.

## 🧪 Pruebas

Para probar la funcionalidad:

1. Crea una cotización de prueba con un producto
2. Edita ese producto y cambia su precio
3. En el campo "Notificar cambios de precio", ingresa `0` para notificar solo las cotizaciones de hoy
4. Guarda los cambios
5. Verifica en los logs de Vercel que se enviaron las notificaciones
6. Verifica en N8N que recibiste el webhook con el PDF adjunto
