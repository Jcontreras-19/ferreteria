# 🔧 Solución: N8N no recibe los datos correctamente

## ❌ Problema Detectado

El nodo "ENVIO REPORTE" muestra:
- `{{ $json.email }}` = `undefined`
- `{{ $json.reportType }}` = vacío
- `{{ $json.period }}` = vacío

Esto significa que N8N no está parseando correctamente el FormData que enviamos.

## ✅ Solución: Agregar Nodo "Code" para Procesar FormData

### Paso 1: Agregar Nodo "Code" entre Webhook y Send Email

1. **Elimina la conexión** entre Webhook y Send Email (si ya está conectado)
2. **Agrega un nodo "Code"** entre ellos
3. **Conecta**: Webhook → Code → Send Email

### Paso 2: Configurar el Nodo Code

1. **Selecciona el nodo Code**
2. **Language**: `JavaScript`
3. **Código**:

```javascript
// N8N recibe FormData, necesitamos extraer los datos
const items = $input.all();

return items.map(item => {
  // Los datos pueden venir en diferentes formatos según cómo N8N parsea FormData
  const json = item.json || {};
  const binary = item.binary || {};
  
  // Intentar obtener los datos del FormData parseado
  // N8N puede parsear FormData de diferentes maneras
  const email = json.email || json.body?.email || json.data?.email;
  const reportType = json.reportType || json.body?.reportType || json.data?.reportType;
  const period = json.period || json.body?.period || json.data?.period;
  const totalQuotes = json.totalQuotes || json.body?.totalQuotes || json.data?.totalQuotes;
  const totalAmount = json.totalAmount || json.body?.totalAmount || json.data?.totalAmount;
  
  // El PDF puede venir en binary o en json.pdf
  let pdfData = null;
  let pdfFileName = `reporte-cotizaciones-${reportType || 'unknown'}.pdf`;
  
  // Intentar obtener el PDF de diferentes ubicaciones
  if (binary.pdf) {
    pdfData = binary.pdf.data;
    pdfFileName = binary.pdf.fileName || pdfFileName;
  } else if (json.pdf) {
    pdfData = json.pdf;
  } else if (json.body?.pdf) {
    pdfData = json.body.pdf;
  }
  
  return {
    json: {
      email: email || 'correo-no-encontrado@ejemplo.com',
      reportType: reportType || 'unknown',
      period: period || 'N/A',
      totalQuotes: totalQuotes || '0',
      totalAmount: totalAmount || '0.00'
    },
    binary: pdfData ? {
      pdf: {
        data: pdfData,
        mimeType: 'application/pdf',
        fileName: pdfFileName
      }
    } : {}
  };
});
```

### Paso 3: Verificar los Datos

1. **Ejecuta el nodo Code** haciendo clic en "Execute step"
2. **Revisa la salida** para ver si los datos se están extrayendo correctamente
3. Si aún muestra `undefined`, necesitamos ver cómo N8N está recibiendo los datos

## 🔍 Alternativa: Ver qué datos recibe N8N

### Opción 1: Agregar Nodo "Set" para Debug

1. Agrega un nodo **"Set"** después del Webhook
2. Configura para mostrar TODOS los datos:
   - Agrega un campo: `allData` = `{{ $json }}`
   - Agrega un campo: `binaryKeys` = `{{ Object.keys($binary) }}`
3. Ejecuta el nodo y revisa qué datos llegan realmente

### Opción 2: Revisar el Webhook directamente

1. En el nodo **Webhook**, haz clic en "Test step"
2. Esto te mostrará exactamente qué datos está recibiendo N8N
3. Con esa información, ajustamos el nodo Code

## 📝 Código Alternativo (Si el anterior no funciona)

Si el código anterior no funciona, prueba este que es más robusto:

```javascript
const item = $input.item;

// N8N puede recibir FormData de diferentes formas
// Intentamos todas las posibilidades

let email, reportType, period, totalQuotes, totalAmount, pdfData;

// Método 1: Datos directos en json
if (item.json.email) {
  email = item.json.email;
  reportType = item.json.reportType;
  period = item.json.period;
  totalQuotes = item.json.totalQuotes;
  totalAmount = item.json.totalAmount;
  pdfData = item.binary?.pdf?.data;
}
// Método 2: Datos en json.body (si N8N parsea FormData así)
else if (item.json.body) {
  const body = typeof item.json.body === 'string' ? JSON.parse(item.json.body) : item.json.body;
  email = body.email;
  reportType = body.reportType;
  period = body.period;
  totalQuotes = body.totalQuotes;
  totalAmount = body.totalAmount;
  pdfData = item.binary?.pdf?.data;
}
// Método 3: Datos en json.data
else if (item.json.data) {
  email = item.json.data.email;
  reportType = item.json.data.reportType;
  period = item.json.data.period;
  totalQuotes = item.json.data.totalQuotes;
  totalAmount = item.json.data.totalAmount;
  pdfData = item.binary?.pdf?.data;
}
// Método 4: Intentar desde las claves del objeto
else {
  email = item.json.email || item.json['email'];
  reportType = item.json.reportType || item.json['reportType'];
  period = item.json.period || item.json['period'];
  totalQuotes = item.json.totalQuotes || item.json['totalQuotes'];
  totalAmount = item.json.totalAmount || item.json['totalAmount'];
  pdfData = item.binary?.pdf?.data || item.binary?.data;
}

// Si aún no tenemos el PDF, intentar desde binary
if (!pdfData && item.binary) {
  const binaryKeys = Object.keys(item.binary);
  if (binaryKeys.length > 0) {
    pdfData = item.binary[binaryKeys[0]].data;
  }
}

return {
  json: {
    email: email || 'correo-no-encontrado@ejemplo.com',
    reportType: reportType || 'unknown',
    period: period || 'N/A',
    totalQuotes: totalQuotes || '0',
    totalAmount: totalAmount || '0.00'
  },
  binary: pdfData ? {
    pdf: {
      data: pdfData,
      mimeType: 'application/pdf',
      fileName: `reporte-cotizaciones-${reportType || 'unknown'}.pdf`
    }
  } : {}
};
```

## 🎯 Pasos Recomendados

1. **Primero**: Agrega un nodo "Set" después del Webhook para ver qué datos llegan
2. **Segundo**: Ejecuta el Webhook con "Test step" para ver la estructura exacta
3. **Tercero**: Usa esa información para ajustar el nodo Code
4. **Cuarto**: Conecta Code → Send Email y verifica que los datos lleguen correctamente

## 📧 Configuración Final del Send Email

Una vez que el nodo Code funcione, el Send Email debería recibir:
- `{{ $json.email }}` → El correo destinatario
- `{{ $json.reportType }}` → daily/weekly/monthly
- `{{ $json.period }}` → Período del reporte
- `{{ $json.totalQuotes }}` → Total de cotizaciones
- `{{ $json.totalAmount }}` → Monto total
- `{{ $binary.pdf.data }}` → El PDF adjunto
