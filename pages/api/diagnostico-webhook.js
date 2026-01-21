// Endpoint de diagnóstico para verificar el estado del webhook N8N
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL

  const diagnostico = {
    webhookConfigurado: !!n8nWebhookUrl,
    webhookUrl: n8nWebhookUrl || 'NO CONFIGURADA',
    timestamp: new Date().toISOString(),
  }

  // Si está configurado, intentar hacer una petición de prueba
  if (n8nWebhookUrl) {
    try {
      const testPayload = {
        params: {},
        query: {},
        body: {
          test: true,
          message: 'Prueba de conexión desde diagnóstico',
          timestamp: new Date().toISOString(),
        },
        webhookUrl: n8nWebhookUrl,
        executionMode: 'production'
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos para diagnóstico

      try {
        const testResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testPayload),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        diagnostico.testConexion = {
          exitoso: testResponse.ok,
          status: testResponse.status,
          statusText: testResponse.statusText,
        }

        if (testResponse.ok) {
          diagnostico.testConexion.mensaje = '✅ Conexión exitosa con N8N'
        } else {
          const errorText = await testResponse.text()
          diagnostico.testConexion.mensaje = `⚠️ N8N respondió con error: ${testResponse.status}`
          diagnostico.testConexion.error = errorText
        }
      } catch (testError) {
        clearTimeout(timeoutId)

        if (testError.name === 'AbortError') {
          diagnostico.testConexion = {
            exitoso: false,
            mensaje: '❌ Timeout: N8N no respondió en 10 segundos',
            error: 'Timeout',
          }
        } else if (testError.code === 'ENOTFOUND' || testError.code === 'ECONNREFUSED') {
          diagnostico.testConexion = {
            exitoso: false,
            mensaje: '❌ Error de conexión: No se pudo conectar con N8N',
            error: testError.message,
            codigo: testError.code,
          }
        } else {
          diagnostico.testConexion = {
            exitoso: false,
            mensaje: '❌ Error al probar conexión',
            error: testError.message,
          }
        }
      }
    } catch (error) {
      diagnostico.testConexion = {
        exitoso: false,
        mensaje: '❌ Error al ejecutar prueba',
        error: error.message,
      }
    }
  } else {
    diagnostico.testConexion = {
      mensaje: '⚠️ No se puede probar: N8N_WEBHOOK_URL no está configurada',
    }
  }

  return res.status(200).json(diagnostico)
}
