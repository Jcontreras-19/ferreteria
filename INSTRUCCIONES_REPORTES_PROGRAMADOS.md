# 📧 Sistema de Reportes Programados de Cotizaciones

## ✅ Funcionalidades Implementadas

### 1. **Modelo de Base de Datos**
- Tabla `ReportSchedule` creada con los siguientes campos:
  - `email`: Correo destinatario del reporte
  - `scheduleType`: Tipo de programación (`daily`, `weekly`, `monthly`)
  - `time`: Hora de envío en formato HH:mm (ej: "18:00")
  - `isActive`: Estado activo/inactivo
  - `lastSent`: Última vez que se envió
  - `createdBy`: Usuario que creó la programación

### 2. **Endpoints API Creados**

#### `GET/POST /api/reportes/programaciones`
- **GET**: Obtiene todas las programaciones
- **POST**: Crea una nueva programación
  - Requiere: `email`, `scheduleType`, `time`

#### `PUT/DELETE /api/reportes/programaciones/[id]`
- **PUT**: Actualiza una programación existente
- **DELETE**: Elimina una programación

#### `POST /api/reportes/generar-resumen`
- Genera un PDF de resumen de cotizaciones para un período específico
- Requiere: `periodType`, `startDate`, `endDate`

#### `GET /api/reportes/ejecutar-programados`
- Endpoint para cron job que ejecuta los reportes programados
- Verifica la hora actual y envía reportes según la programación

### 3. **Interfaz de Administración**
- Página: `/admin/reportes-programados`
- Funcionalidades:
  - Ver todas las programaciones
  - Crear nueva programación
  - Editar programación existente
  - Eliminar programación
  - Activar/Desactivar programación
  - Ver último envío

### 4. **Generador de PDF de Resumen**
- Función `generateQuotesSummaryPDF()` en `lib/pdfGenerator.js`
- Incluye:
  - Resumen estadístico (total cotizaciones, monto total, distribución por estado)
  - Tabla detallada con todas las cotizaciones
  - Información: número de pedido, nombre de cliente, precios, estados

## 🚀 Configuración en Vercel

### 1. **Configurar Variable de Entorno para Cron**

En Vercel, agrega la variable de entorno:
- **Key**: `CRON_SECRET`
- **Value**: (genera un token secreto, ej: `tu-token-secreto-aqui`)

### 2. **Actualizar vercel.json**

El archivo `vercel.json` ya está configurado con:
```json
{
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/reportes/ejecutar-programados?secret=CRON_SECRET_PLACEHOLDER",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**⚠️ IMPORTANTE**: Reemplaza `CRON_SECRET_PLACEHOLDER` con el valor real de `CRON_SECRET` después de desplegar, o mejor aún, usa la variable de entorno directamente en el código.

### 3. **Actualizar el Endpoint para Usar Variable de Entorno**

El endpoint `/api/reportes/ejecutar-programados` ya verifica el secret token desde `process.env.CRON_SECRET`.

## 📋 Cómo Usar

### 1. **Crear una Programación**

1. Ve a `/admin/reportes-programados`
2. Haz clic en "Nueva Programación"
3. Completa el formulario:
   - **Email**: Correo donde recibirás el reporte
   - **Tipo de Reporte**: Diario, Semanal o Mensual
   - **Hora de Envío**: Hora en formato 24h (ej: 18:00)
4. Haz clic en "Crear"

### 2. **El Sistema Automáticamente**

- El cron job se ejecuta cada 5 minutos
- Verifica si hay programaciones activas
- Compara la hora actual con la hora programada
- Si coincide, genera el PDF y lo envía a N8N
- N8N recibe el PDF y lo envía por correo

### 3. **Configurar N8N para Recibir Reportes**

En N8N, configura el webhook para recibir:
- `pdf`: Archivo PDF del reporte
- `email`: Correo destinatario
- `reportType`: Tipo de reporte (daily/weekly/monthly)
- `period`: Período del reporte
- `totalQuotes`: Número total de cotizaciones
- `totalAmount`: Monto total

## 🔧 Notas Técnicas

### Cron Schedule
- Actualmente configurado para ejecutarse una vez al día (`0 0 * * *`, medianoche UTC)
- El endpoint verifica internamente si es la hora correcta para cada programación
- Esto permite múltiples programaciones con diferentes horarios

### Seguridad
- El endpoint de cron requiere un secret token (`CRON_SECRET`)
- Solo administradores pueden gestionar programaciones
- Las programaciones verifican si ya se enviaron hoy (para daily)

### Limitaciones de Vercel Cron
- Vercel Cron está disponible en planes Pro y Enterprise
- Si estás en plan Hobby, necesitarás usar un servicio externo como:
  - EasyCron
  - Cron-job.org
  - GitHub Actions con schedule

## 🔄 Alternativa: Servicio Externo de Cron

Si no tienes acceso a Vercel Cron, puedes usar un servicio externo:

1. **EasyCron** o **Cron-job.org**
2. Configura una URL:
   ```
   https://tu-dominio.vercel.app/api/reportes/ejecutar-programados?secret=TU_SECRET
   ```
3. Programa la ejecución una vez al día (por ejemplo, a medianoche)

## ✅ Próximos Pasos

1. Ejecutar la migración: `npx prisma migrate deploy` (en producción)
2. Agregar `CRON_SECRET` en Vercel
3. Configurar el webhook en N8N para recibir reportes
4. Crear tu primera programación desde el panel de administración
