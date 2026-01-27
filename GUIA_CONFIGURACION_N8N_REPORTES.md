# 📋 Guía Paso a Paso - Configuración N8N Reportes Programados

## 🎯 Configuración del Nodo Webhook

### 1. Configurar el Nodo "REPORTE COTIZACIONES"

1. **Haz clic en el nodo "REPORTE COTIZACIONES"** (el nodo de la izquierda con el icono de webhook)

2. **En la configuración del nodo, verifica:**
   - **HTTP Method**: `POST` ✅
   - **Path**: `/reportes-cotizaciones` (o el que tengas configurado)
   - **Response Mode**: `Last Node` o `When Last Node Finishes`
   - **Authentication**: `None` (a menos que quieras agregar seguridad)

3. **Copia la URL del webhook** que aparece arriba del nodo
   - Ejemplo: `https://aquispe.app.n8n.cloud/webhook/reportes-cotizaciones`
   - Esta URL debe coincidir con la que configuraste en Vercel como `N8N_REPORTES_WEBHOOK_URL`

4. **Haz clic en "Execute Node"** para probar que el webhook está funcionando
   - Deberías ver los datos de prueba que llegan

---

## 📧 Configuración del Nodo Gmail "ENVIO REPORTE"

### 1. Configurar la Conexión de Gmail

1. **Haz clic en el nodo "ENVIO REPORTE"** (el nodo de la derecha con el icono de sobre)

2. **Si no tienes Gmail conectado:**
   - Haz clic en "Connect" o "Add Credential"
   - Selecciona tu cuenta de Gmail
   - Autoriza los permisos necesarios
   - Guarda la conexión

### 2. Configurar los Campos del Email

#### **From Email (De):**
```
corporaciongrc@gmail.com
```
O el correo que uses para enviar reportes.

#### **To Email (Para):**
```
{{ $json["body"]["email"] || $json["email"] }}
```
Esto tomará el email del destinatario que viene en el webhook.

#### **Subject (Asunto):**
```
📊 Reporte {{ $json["body"]["reportTypeLabel"] || "Diario" }} de Cotizaciones - {{ $json["body"]["period"] || $json["period"] }}
```

O más simple:
```
Reporte de Cotizaciones - {{ $json["body"]["period"] || $json["period"] }}
```

#### **Email Type (Tipo de Email):**
Selecciona: **HTML**

#### **Message (Mensaje):**

Copia y pega este HTML completo:

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
      padding: 12px;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 5px;
      font-weight: 600;
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
            <div class="stat-value" style="font-size: 16px;">{{ $json["body"]["reportTypeLabel"] || "Diario" }}</div>
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
      
      <h2 style="color: #0a6fb7; text-align: center; margin: 20px 0;">¡Gracias por tu preferencia!</h2>
      
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

### 3. Configurar el Adjunto del PDF

**⚠️ IMPORTANTE: El PDF viene en el FormData**

En el nodo Gmail, busca la sección **"Attachments"** o **"Adjuntos"**:

#### **Opción 1: Si N8N parsea automáticamente el FormData**

1. Haz clic en **"Add Attachment"** o **"Agregar Adjunto"**
2. En **"File Name"** (Nombre del archivo):
   ```
   reporte-cotizaciones-{{ $json["body"]["reportType"] || "daily" }}-{{ $now.format('YYYY-MM-DD') }}.pdf
   ```
3. En **"File Data"** (Datos del archivo):
   ```
   {{ $binary.pdf.data }}
   ```
   O si no funciona:
   ```
   {{ $binary.data }}
   ```

#### **Opción 2: Si necesitas procesar el PDF manualmente**

Si el PDF no se adjunta automáticamente, agrega un nodo **"Code"** entre el Webhook y Gmail:

1. **Agrega un nodo "Code"** entre los dos nodos
2. **Selecciona "JavaScript"**
3. **Pega este código:**

```javascript
// Obtener datos del body (puede venir como string o objeto)
const bodyData = typeof $input.item.json.body === 'string' 
  ? JSON.parse($input.item.json.body) 
  : $input.item.json.body || $input.item.json;

// Obtener el PDF del binary data
const pdfData = $input.item.binary?.pdf?.data || 
                $input.item.binary?.data || 
                $input.item.json.pdf;

// Retornar datos estructurados
return {
  json: {
    email: bodyData.email || $input.item.json.email,
    reportType: bodyData.reportType || $input.item.json.reportType || 'daily',
    reportTypeLabel: bodyData.reportTypeLabel || 'Diario',
    period: bodyData.period || $input.item.json.period || 'N/A',
    totalQuotes: bodyData.totalQuotes || $input.item.json.totalQuotes || 0,
    totalAmount: bodyData.totalAmount || $input.item.json.totalAmount || '0.00',
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

4. **Luego en el nodo Gmail**, usa:
   - **File Name**: `{{ $json.reportType }}-reporte-{{ $now.format('YYYY-MM-DD') }}.pdf`
   - **File Data**: `{{ $binary.pdf.data }}`

---

## ✅ Verificar la Configuración

### 1. Probar el Workflow

1. **Haz clic en "Execute Workflow"** o el botón de play
2. N8N simulará recibir datos del webhook
3. Verifica que:
   - El webhook recibe los datos correctamente
   - El email se genera con el HTML correcto
   - El PDF se adjunta (si está configurado)

### 2. Activar el Workflow

1. **Haz clic en el botón "Active"** en la esquina superior derecha
2. El workflow ahora está activo y escuchando en el webhook
3. Cuando el cron job ejecute un reporte, automáticamente:
   - Llegará al webhook
   - Se enviará el email con el PDF adjunto

---

## 🔍 Datos que Recibe el Webhook

El sistema envía estos datos en FormData:

**En el objeto `body` (JSON stringificado):**
- `event`: `"scheduled_report"`
- `email`: Correo destinatario
- `reportType`: `"daily"`, `"weekly"` o `"monthly"`
- `reportTypeLabel`: `"Diario"`, `"Semanal"` o `"Mensual"`
- `period`: Período formateado (ej: "27 de enero de 2026 - 27 de enero de 2026")
- `totalQuotes`: Número total de cotizaciones
- `totalAmount`: Monto total (ej: "5000.00")
- `approvedQuotes`: Cantidad de cotizaciones aprobadas
- `pendingQuotes`: Cantidad de cotizaciones pendientes
- `sendDate`: Fecha de envío programada
- `sendTime`: Hora de envío (ej: "18:00")

**También como campos directos (compatibilidad):**
- `email`
- `reportType`
- `period`
- `totalQuotes`
- `totalAmount`

**Archivo PDF:**
- Campo `pdf` con el archivo PDF como binary data

---

## 🐛 Troubleshooting

### El PDF no se adjunta:
1. Verifica que el campo en Gmail sea `{{ $binary.pdf.data }}`
2. Si no funciona, agrega el nodo Code como se explicó arriba
3. Revisa los logs del webhook en N8N para ver qué datos llegan

### El email no se envía:
1. Verifica la conexión de Gmail
2. Revisa que el campo "To Email" tenga `{{ $json["body"]["email"] || $json["email"] }}`
3. Verifica que el workflow esté activo

### Los datos no llegan correctamente:
1. Haz clic en el nodo Webhook y luego "Execute Node" para ver qué datos llegan
2. Verifica que la URL en Vercel coincida con la del webhook
3. Revisa los logs en Vercel Functions

---

## 📝 Resumen de Campos Clave

**Para el Email:**
- **To**: `{{ $json["body"]["email"] || $json["email"] }}`
- **Subject**: `📊 Reporte {{ $json["body"]["reportTypeLabel"] || "Diario" }} de Cotizaciones`
- **Body**: Usa el HTML completo de arriba

**Para el PDF:**
- **File Name**: `reporte-cotizaciones-{{ $json["body"]["reportType"] || "daily" }}-{{ $now.format('YYYY-MM-DD') }}.pdf`
- **File Data**: `{{ $binary.pdf.data }}`

¡Listo! Tu workflow debería funcionar correctamente. 🎉
