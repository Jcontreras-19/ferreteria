# 📧 Configuración N8N - Reportes Programados

## 🎯 Funcionalidad

Cuando se ejecuta el cron job de reportes programados, el sistema:
1. Verifica todas las programaciones activas
2. Genera el PDF del reporte con las cotizaciones del rango de fechas configurado
3. Envía una notificación al webhook de N8N con toda la información y el PDF adjunto
4. N8N envía el correo electrónico con el PDF al destinatario configurado

## ⚙️ Configuración en Vercel

### Variable de Entorno Requerida

Ve a **Vercel Dashboard** → Tu Proyecto → **Settings** → **Environment Variables** y agrega:

- **Key**: `N8N_REPORTES_WEBHOOK_URL`
- **Value**: Tu URL del webhook de N8N para reportes programados
- **Environment**: Marca todas (Production, Preview, Development)

**Ejemplo:**
```
N8N_REPORTES_WEBHOOK_URL=https://aquispe.app.n8n.cloud/webhook/reportes-programados
```

**Nota:** Si no configuras `N8N_REPORTES_WEBHOOK_URL`, el sistema usará `N8N_WEBHOOK_URL` como alternativa (que ya está configurado para el envío de cotizaciones).

## 🔧 Configuración del Workflow en N8N

### 1. Crear el Webhook

1. En N8N, crea un nuevo workflow
2. Agrega un nodo **Webhook**
3. Configura:
   - **Method**: `POST`
   - **Path**: `/reportes-programados` (o el que prefieras)
   - **Response Mode**: "Respond When Last Node Finishes"
4. Copia la URL del webhook y configúrala en Vercel como `N8N_REPORTES_WEBHOOK_URL`

### 2. Configurar el Nodo de Email

Después del webhook, agrega un nodo **Send Email** (o el nodo de email que uses):

**Campos disponibles en el webhook:**

Los datos vienen en dos formatos:
- **Formato estructurado** (recomendado): `{{ $json["body"]["email"] }}`
- **Formato directo** (compatibilidad): `{{ $json["email"] }}`

**Campos del objeto `body`:**
- `event`: `"scheduled_report"` (siempre este valor)
- `email`: Correo destinatario del reporte
- `reportType`: Tipo de reporte (`daily`, `weekly`, `monthly`)
- `reportTypeLabel`: Etiqueta del tipo (`"Diario"`, `"Semanal"`, `"Mensual"`)
- `period`: Período formateado (ej: "27 de enero de 2026 - 27 de enero de 2026")
- `periodFrom`: Fecha desde formateada
- `periodTo`: Fecha hasta formateada
- `dateFrom`: Fecha desde en ISO (para cálculos)
- `dateTo`: Fecha hasta en ISO (para cálculos)
- `totalQuotes`: Total de cotizaciones en el reporte
- `totalAmount`: Monto total en formato decimal (ej: "5000.00")
- `approvedQuotes`: Cantidad de cotizaciones aprobadas
- `pendingQuotes`: Cantidad de cotizaciones pendientes
- `sendDate`: Fecha de envío programada (si está configurada)
- `sendTime`: Hora de envío (ej: "18:00")
- `scheduleId`: ID de la programación
- `pdf`: Archivo PDF del reporte (como archivo adjunto)

### 3. Ejemplo de Configuración del Email

**Asunto:**
```
📊 Reporte {{ $json["body"]["reportTypeLabel"] || "Diario" }} de Cotizaciones - {{ $json["body"]["period"] || $json["period"] }}
```

**Cuerpo del Email (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header { 
      background-color: #22c55e; 
      color: white; 
      padding: 30px 20px; 
      text-align: center; 
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content { 
      padding: 30px 20px; 
    }
    .info-box { 
      background-color: #f0f9ff; 
      border-left: 4px solid #22c55e; 
      padding: 20px; 
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box h3 {
      margin-top: 0;
      color: #0a6fb7;
    }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 15px 0;
    }
    .stat-item {
      background: white;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 18px;
      font-weight: bold;
      color: #111827;
    }
    .footer { 
      background-color: #f3f4f6; 
      padding: 20px; 
      text-align: center; 
      font-size: 12px; 
      color: #6b7280; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CORPORACIÓN GRC</h1>
      <p style="margin: 5px 0 0 0; font-size: 14px;">SERVICIOS GENERALES</p>
    </div>
    
    <div class="content">
      <h2 style="color: #0a6fb7; margin-top: 0;">Reporte {{ $json["body"]["reportTypeLabel"] || "Diario" }} de Cotizaciones</h2>
      
      <p>Estimado/a,</p>
      
      <p>Se adjunta el reporte de cotizaciones correspondiente al período configurado.</p>
      
      <div class="info-box">
        <h3>Resumen del Reporte:</h3>
        <div class="stats">
          <div class="stat-item">
            <div class="stat-label">Tipo de Reporte</div>
            <div class="stat-value">{{ $json["body"]["reportTypeLabel"] || "Diario" }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Período</div>
            <div class="stat-value" style="font-size: 14px;">{{ $json["body"]["period"] || $json["period"] }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Total Cotizaciones</div>
            <div class="stat-value">{{ $json["body"]["totalQuotes"] || $json["totalQuotes"] }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Monto Total</div>
            <div class="stat-value">S/. {{ $json["body"]["totalAmount"] || $json["totalAmount"] }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Aprobadas</div>
            <div class="stat-value">{{ $json["body"]["approvedQuotes"] || 0 }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Pendientes</div>
            <div class="stat-value">{{ $json["body"]["pendingQuotes"] || 0 }}</div>
          </div>
        </div>
      </div>
      
      <p>El PDF con el detalle completo de todas las cotizaciones se encuentra adjunto a este correo.</p>
      
      <p>Si tiene alguna consulta, no dude en contactarnos.</p>
      
      <p>Atentamente,<br>
      <strong>CORPORACIÓN GRC - SERVICIOS GENERALES</strong><br>
      <span style="font-size: 12px; color: #6b7280;">SERVICIOS DE APOYO A LAS EMPRESAS</span></p>
    </div>
    
    <div class="footer">
      <p>Este es un correo automático. Por favor no responda a este mensaje.</p>
      <p style="margin-top: 10px;">Av. José Gálvez 1322 Dpto. 302 La Perla - Callao</p>
    </div>
  </div>
</body>
</html>
```

**Adjuntos:**
- Adjunta el archivo `pdf` que viene en el webhook
- Nombre del archivo: `{{ $json["body"]["reportType"] || "daily" }}-reporte-{{ $now.format('YYYY-MM-DD') }}.pdf`

### 4. Configuración del Adjunto PDF

En el nodo Send Email, configura el adjunto:

**Opción 1: Si N8N parsea automáticamente el FormData**
- **File Name**: `reporte-cotizaciones-{{ $json["body"]["reportType"] || "daily" }}-{{ $now.format('YYYY-MM-DD') }}.pdf`
- **File Data**: `{{ $binary.pdf.data }}` o `{{ $binary.data }}`

**Opción 2: Si necesitas procesar manualmente**

Agrega un nodo **Code** antes del Send Email:

```javascript
// El PDF viene en el campo 'pdf' del FormData
const pdfData = $input.item.binary?.pdf?.data || $input.item.json.pdf;

// Obtener datos del body
const bodyData = typeof $input.item.json.body === 'string' 
  ? JSON.parse($input.item.json.body) 
  : $input.item.json.body || $input.item.json;

return {
  json: {
    email: bodyData.email || $input.item.json.email,
    reportType: bodyData.reportType || $input.item.json.reportType,
    reportTypeLabel: bodyData.reportTypeLabel || 'Diario',
    period: bodyData.period || $input.item.json.period,
    totalQuotes: bodyData.totalQuotes || $input.item.json.totalQuotes,
    totalAmount: bodyData.totalAmount || $input.item.json.totalAmount,
    approvedQuotes: bodyData.approvedQuotes || 0,
    pendingQuotes: bodyData.pendingQuotes || 0
  },
  binary: {
    pdf: {
      data: pdfData,
      mimeType: 'application/pdf',
      fileName: `reporte-cotizaciones-${bodyData.reportType || 'daily'}-${new Date().toISOString().split('T')[0]}.pdf`
    }
  }
};
```

## 📋 Uso desde el Panel de Administración

### Cómo Programar un Reporte

1. Ve a **Reportes Programados** en el panel de administración
2. Haz clic en **"+ Nueva Programación"**
3. Completa el formulario:
   - **Correo Electrónico**: Email donde se enviará el reporte
   - **Rango de Fechas**: Fechas desde y hasta para el reporte (por defecto: día actual)
   - **Fecha de Envío**: Fecha en que se enviará el reporte
   - **Hora de Envío**: Hora exacta (formato 24h, ej: 18:00)
4. Opcionalmente, haz clic en **"Previsualizar Reporte PDF"** para ver cómo se verá
5. Haz clic en **"Crear Programación"**
6. El sistema automáticamente:
   - Guardará la programación
   - El cron job ejecutará el reporte a la hora programada
   - Se enviará el PDF al correo configurado vía N8N

## 🔍 Logs y Debugging

El sistema registra información detallada en los logs:

```
📅 [REPORTE] Ejecutando reporte programado:
   Schedule ID: ...
   Email: ejemplo@correo.com
   Tipo: daily
   Rango: 2026-01-27 - 2026-01-27
   Cotizaciones encontradas: 15

📊 [ESTADÍSTICAS] Resumen del reporte:
   Total: 15
   Aprobadas: 8
   Pendientes: 7
   Monto Total: S/. 5000.00

📤 [ENVÍO] Enviando a N8N:
   URL: https://...
   Email: ejemplo@correo.com
   PDF generado: reporte-cotizaciones-daily-2026-01-27.pdf

✅ Reporte enviado exitosamente a ejemplo@correo.com
```

## ⚠️ Notas Importantes

1. **Ejecución Automática**: El cron job se ejecuta cada minuto y verifica si hay reportes programados para enviar.

2. **Hora de Envío**: El reporte se enviará exactamente a la hora configurada (formato 24h).

3. **Rango de Fechas**: Si no se especifica un rango personalizado, se usa el día actual para reportes diarios.

4. **PDF Generado**: El PDF se genera dinámicamente con todas las cotizaciones del rango de fechas configurado.

5. **Actualización de lastSent**: Después de enviar exitosamente, se actualiza el campo `lastSent` para evitar envíos duplicados.

## 🧪 Pruebas

Para probar la funcionalidad:

1. Crea una programación de prueba con hora actual + 1 minuto
2. Espera a que se ejecute el cron job
3. Verifica en los logs de Vercel que se envió el reporte
4. Verifica en N8N que recibiste el webhook con el PDF adjunto
5. Verifica que el correo llegó al destinatario configurado

## 🔗 Relación con el Sistema de Cambio de Precios

Este sistema sigue el mismo patrón que el sistema de cambio de precios:
- Usa `FormData` con un objeto `body` estructurado
- Envía el PDF como archivo adjunto
- N8N procesa los datos y envía el correo

La diferencia principal es que este sistema:
- Se ejecuta automáticamente mediante cron job
- Genera reportes de múltiples cotizaciones
- Incluye estadísticas agregadas del período
