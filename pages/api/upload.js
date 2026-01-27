// NO importar writeFile ni mkdir - no los necesitamos en producción
import { getCurrentUser } from '../../lib/auth'
import formidable from 'formidable'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

// Inicializar Supabase directamente aquí para asegurar que funcione en el servidor
const PRODUCTS_BUCKET = 'products-images'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// Desactivar el body parser por defecto de Next.js
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    // Configurar formidable (usar directorio temporal del sistema, NO intentar crear directorios)
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      filter: (part) => {
        return part.mimetype?.startsWith('image/') || false
      },
      // NO especificar uploadDir - dejar que formidable use el directorio temporal del sistema
    })

    // Parsear el formulario
    const [fields, files] = await form.parse(req)

    const file = Array.isArray(files.file) ? files.file[0] : files.file

    if (!file) {
      return res.status(400).json({ error: 'No se proporcionó archivo de imagen' })
    }

    // Verificar configuración de Supabase ANTES de procesar el archivo
    console.log('🔍 Verificando Supabase:', {
      hasSupabase: !!supabase,
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing',
      keyLength: supabaseKey ? supabaseKey.length : 0
    })

    if (!supabase || !supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase no está configurado correctamente')
      console.error('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'MISSING')
      console.error('   SUPABASE_URL:', process.env.SUPABASE_URL ? 'present' : 'MISSING')
      console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'MISSING')
      console.error('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'present' : 'MISSING')
      
      return res.status(500).json({ 
        error: 'Supabase Storage no está configurado',
        details: `URL: ${supabaseUrl ? 'OK' : 'MISSING'}, Key: ${supabaseKey ? 'OK' : 'MISSING'}`,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
          SUPABASE_URL: process.env.SUPABASE_URL ? 'present' : 'missing',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
          SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'present' : 'missing'
        }
      })
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now()
    const originalName = file.originalFilename || 'imagen'
    const extension = originalName.split('.').pop()
    const fileName = `product-${timestamp}.${extension}`

    // Leer el archivo como buffer
    const fileBuffer = await fs.promises.readFile(file.filepath)
    const fileMimeType = file.mimetype || 'image/jpeg'

    try {
      console.log('📤 Intentando subir a Supabase Storage:', fileName)
      const { data, error } = await supabase.storage
        .from(PRODUCTS_BUCKET)
        .upload(fileName, fileBuffer, {
          contentType: fileMimeType,
          upsert: false,
        })

      if (error) {
        console.error('❌ Error subiendo a Supabase:', error)
        return res.status(500).json({ 
          error: 'Error al subir a Supabase Storage',
          details: error.message || JSON.stringify(error),
          code: error.statusCode || 'UNKNOWN'
        })
      }

      console.log('✅ Imagen subida exitosamente:', data)

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(PRODUCTS_BUCKET)
        .getPublicUrl(fileName)

      // Limpiar archivo temporal
      await fs.promises.unlink(file.filepath).catch(() => {})

      return res.status(200).json({
        url: urlData.publicUrl,
        message: 'Imagen subida exitosamente a Supabase',
      })
    } catch (supabaseError) {
      console.error('❌ Error con Supabase:', supabaseError)
      // En producción, no podemos usar almacenamiento local
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ 
          error: 'Error al subir a Supabase Storage',
          details: supabaseError.message || 'Verifica las variables de entorno y las políticas de Supabase',
          stack: process.env.NODE_ENV === 'development' ? supabaseError.stack : undefined
        })
      }
      // Continuar con almacenamiento local solo en desarrollo
    }

    // En producción, NO usar almacenamiento local (Vercel es read-only)
    return res.status(500).json({ 
      error: 'Supabase Storage no está configurado correctamente',
      details: 'No se pudo subir la imagen. Verifica las variables de entorno en Vercel.',
      debug: {
        hasSupabase: !!supabase,
        supabaseUrl: supabaseUrl ? 'present' : 'missing',
        supabaseKey: supabaseKey ? 'present' : 'missing',
        nodeEnv: process.env.NODE_ENV
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'La imagen debe ser menor a 5MB' })
    }
    
    if (error.message?.includes('mimetype')) {
      return res.status(400).json({ error: 'Solo se permiten archivos de imagen' })
    }

    return res.status(500).json({ error: 'Error al subir archivo' })
  }
}
