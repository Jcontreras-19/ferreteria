# 📧 Configuración de N8N para Reportes Programados

## 🎯 Objetivo

Crear un nuevo workflow en N8N que:
1. Reciba los reportes programados de cotizaciones (con PDF adjunto)
2. Envíe el PDF por correo electrónico al destinatario configurado

## 📋 Paso a Paso

### 1. Crear Nuevo Workflow en N8N

1. En N8N, haz clic en **"Add workflow"** o **"Nuevo workflow"**
2. Nombra el workflow: **"Reportes Programados Cotizaciones"** o **"REPORTE COTIZACIONES"**

### 2. Agregar Nodo Webhook (Trigger)

1. Haz clic en **"+"** para agregar un nodo
2. Busca y selecciona **"Webhook"**
3. Configura el nodo:
   - **HTTP Method**: `POST`
   - **Path**: `reportes-cotizaciones` (o el nombre que prefieras)
   - **Response Mode**: `Last Node` (o `When Last Node Finishes`)
   - **Authentication**: `None` (o `Header Auth` si quieres más seguridad)

4. **IMPORTANTE**: Copia la URL completa del webhook que aparece arriba del nodo
   - Ejemplo: `https://aquispe.app.n8n.cloud/webhook/reportes-cotizaciones`
   - Esta URL la necesitarás para configurar en Vercel como `N8N_WEBHOOK_URL`

### 3. Agregar Nodo "Set" (Opcional - Para Debug)

1. Agrega un nodo **"Set"** después del Webhook
2. Esto te permitirá ver los datos que llegan
3. Configura para mostrar:
   - `{{ $json.email }}` - Email destinatario
   - `{{ $json.reportType }}` - Tipo de reporte (daily/weekly/monthly)
   - `{{ $json.period }}` - Período del reporte
   - `{{ $json.totalQuotes }}` - Total de cotizaciones
   - `{{ $json.totalAmount }}` - Monto total

### 4. Agregar Nodo "Send Email"

1. Agrega un nodo **"Send Email"** (o **"Gmail"** / **"Outlook"** según tu proveedor)
2. Conecta el nodo Webhook directamente al nodo Send Email (o pasa por el nodo Set si lo agregaste)

### 5. Configurar el Nodo Send Email

#### Configuración Básica:
- **From Email**: Tu correo (ej: `noreply@ferreteria-grc.com` o `corporaciongrc@gmail.com`)
- **To Email**: `{{ $json.email }}` (el email que viene del webhook)
- **Subject**: 
  ```
  Reporte de Cotizaciones {{ $json.reportType }} - {{ $json.period }}
  ```
  O más detallado:
  ```
  📊 Reporte {{ $json.reportType === 'daily' ? 'Diario' : $json.reportType === 'weekly' ? 'Semanal' : 'Mensual' }} de Cotizaciones - {{ $json.period }}
  ```

#### Configuración del Cuerpo del Email:
- **Email Type**: `HTML`
- **Message**:
  ```html
  <h2>Reporte de Cotizaciones</h2>
  <p>Estimado/a,</p>
  <p>Se adjunta el reporte de cotizaciones correspondiente al período:</p>
  <ul>
    <li><strong>Tipo:</strong> {{ $json.reportType === 'daily' ? 'Diario' : $json.reportType === 'weekly' ? 'Semanal' : 'Mensual' }}</li>
    <li><strong>Período:</strong> {{ $json.period }}</li>
    <li><strong>Total de Cotizaciones:</strong> {{ $json.totalQuotes }}</li>
    <li><strong>Monto Total:</strong> S/. {{ $json.totalAmount }}</li>
  </ul>
  <p>El PDF con el detalle completo se encuentra adjunto.</p>
  <p>Saludos,<br>Corporación GRC</p>
  ```

#### Configuración del PDF Adjunto:
- **Attachments**: Haz clic en **"Add Attachment"**
- **File Name**: `reporte-cotizaciones-{{ $json.reportType }}-{{ $now.format('YYYY-MM-DD') }}.pdf`
- **File Data**: `{{ $binary.data }}` (el PDF viene como binary data en el campo `pdf`)

**⚠️ IMPORTANTE**: El PDF viene en el campo `pdf` del FormData. En N8N, necesitas acceder a él como:
- Si N8N parsea automáticamente: `{{ $binary.pdf.data }}` o `{{ $json.pdf }}`
- Si necesitas parsear manualmente: Usa un nodo "Code" para extraer el binary data

### 6. Manejo del PDF (Si no se adjunta automáticamente)

Si el PDF no se adjunta automáticamente, agrega un nodo **"Code"** antes del Send Email:

1. Agrega nodo **"Code"**
2. Selecciona **"JavaScript"**
3. Código:
   ```javascript
   // El PDF viene en el campo 'pdf' del FormData
   const pdfData = $input.item.json.pdf || $input.item.binary?.pdf?.data;
   
   return {
     json: {
       email: $input.item.json.email,
       reportType: $input.item.json.reportType,
       period: $input.item.json.period,
       totalQuotes: $input.item.json.totalQuotes,
       totalAmount: $input.item.json.totalAmount,
       pdf: pdfData
     },
     binary: {
       pdf: {
         data: pdfData,
         mimeType: 'application/pdf',
         fileName: `reporte-cotizaciones-${$input.item.json.reportType}-${new Date().toISOString().split('T')[0]}.pdf`
       }
     }
   };
   ```

### 7. Activar el Workflow

1. Haz clic en el botón **"Active"** en la esquina superior derecha
2. El workflow ahora está activo y escuchando en el webhook

### 8. Configurar en Vercel

1. Ve a Vercel → Tu Proyecto → **Settings** → **Environment Variables**
2. Agrega:
   - **Key**: `N8N_WEBHOOK_URL`
   - **Value**: La URL completa del webhook que copiaste (ej: `https://aquispe.app.n8n.cloud/webhook/reportes-cotizaciones`)
   - **Environments**: All Environments
3. Haz clic en **Save**
4. Ve a **Deployments** → Haz clic en **Redeploy** en el último deployment

## ✅ Estructura del Workflow Final

```
[Webhook: reportes-cotizaciones]
    ↓
[Set: Ver datos] (Opcional)
    ↓
[Code: Procesar PDF] (Solo si es necesario)
    ↓
[Send Email: Enviar reporte con PDF]
```

## 🧪 Probar el Workflow

### Opción 1: Desde el Panel de Admin
1. Ve a `/admin/reportes-programados`
2. Crea una programación de prueba con hora actual + 1 minuto
3. Espera a que se ejecute el cron job

### Opción 2: Probar Manualmente
Puedes probar el webhook directamente desde la terminal o Postman:

```bash
curl -X POST https://aquispe.app.n8n.cloud/webhook/reportes-cotizaciones \
  -F "email=tu-email@ejemplo.com" \
  -F "reportType=daily" \
  -F "period=2024-01-01 - 2024-01-31" \
  -F "totalQuotes=10" \
  -F "totalAmount=5000.00" \
  -F "pdf=@ruta/al/archivo.pdf"
```

## 📝 Datos que Recibe el Webhook

El endpoint `/api/reportes/ejecutar-programados` envía los siguientes datos:

- **email**: Correo destinatario
- **reportType**: Tipo de reporte (`daily`, `weekly`, `monthly`)
- **period**: Período del reporte (ej: "01/01/2024 - 31/01/2024")
- **totalQuotes**: Número total de cotizaciones
- **totalAmount**: Monto total en formato decimal
- **pdf**: Archivo PDF como binary data (multipart/form-data)

## 🔧 Troubleshooting

### El PDF no se adjunta:
- Verifica que el campo en Send Email sea `{{ $binary.pdf.data }}` o `{{ $binary.data }}`
- Asegúrate de que el nombre del archivo esté configurado
- Revisa los logs del webhook en N8N para ver qué datos llegan

### El email no se envía:
- Verifica la configuración de tu proveedor de email (Gmail, Outlook, etc.)
- Revisa que el campo "To Email" tenga `{{ $json.email }}`
- Verifica que el workflow esté activo

### El webhook no recibe datos:
- Verifica que la URL en Vercel sea correcta
- Revisa los logs en Vercel Functions para ver si hay errores
- Asegúrate de que el cron job esté configurado correctamente
