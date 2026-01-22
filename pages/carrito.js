import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { FiPlus, FiMinus, FiTrash2, FiShoppingBag, FiX, FiFileText, FiUser, FiMail, FiPhone, FiCheckCircle } from 'react-icons/fi'

export default function Carrito() {
  const router = useRouter()
  const { cart, removeFromCart, updateQuantity, getTotal, clearCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const [documentType, setDocumentType] = useState('boleta') // 'boleta' o 'factura'
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    ruc: '',
    businessName: '',
    address: '',
  })
  const [notFoundProducts, setNotFoundProducts] = useState([{ name: '', quantity: '', description: '' }])
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [quoteId, setQuoteId] = useState(null)
  const [notifications, setNotifications] = useState([])

  // Debug: Log cuando cambien las notificaciones
  useEffect(() => {
    console.log('📢 Estado de notificaciones actualizado:', notifications.length, notifications)
    if (notifications.length > 0) {
      console.log('📢 Notificaciones activas:', notifications)
      // Forzar re-renderizado
      const element = document.querySelector('[data-notification-container]')
      if (element) {
        console.log('📢 Contenedor de notificaciones encontrado en DOM')
      } else {
        console.warn('⚠️ Contenedor de notificaciones NO encontrado en DOM')
      }
    }
  }, [notifications])

  // Cargar datos del usuario si está autenticado
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        whatsapp: user.phone || '',
        ruc: '',
        businessName: '',
        address: '',
      })
    }
  }, [isAuthenticated, user])

  const handleCheckout = () => {
    if (cart.length === 0) return
    // Guardar el tipo de documento seleccionado
    localStorage.setItem('documentType', documentType)
    router.push('/registro')
  }

  const handleQuoteClick = async () => {
    if (cart.length === 0) return
    setShowQuoteModal(true)
    await generatePdfPreview()
  }

  const generatePdfPreview = async (customFormData = null) => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      let yPos = 0
      const dataToUse = customFormData || formData

      // Función auxiliar para dibujar ondas
      const drawWave = (y, isTop) => {
        const waveHeight = 15
        const waveColor = [0, 102, 204]
        const waveColorLight = [51, 153, 255]
        doc.setFillColor(waveColor[0], waveColor[1], waveColor[2])
        doc.rect(0, y, pageWidth, waveHeight, 'F')
        doc.setFillColor(waveColorLight[0], waveColorLight[1], waveColorLight[2])
        doc.rect(0, y + (isTop ? 0 : waveHeight / 2), pageWidth, waveHeight / 2, 'F')
      }

      // Función auxiliar para dibujar logo
      const drawLogo = (x, y, w, h) => {
        doc.setFillColor(0, 102, 204)
        doc.roundedRect(x, y, w, h, 3, 3, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('LOGO', x + w / 2, y + h / 2 + 2, { align: 'center' })
        doc.setTextColor(0, 0, 0)
      }

      // Encabezado azul sólido
      const headerHeight = 20
      doc.setFillColor(0, 102, 204)
      doc.rect(0, 0, pageWidth, headerHeight, 'F')
      yPos = headerHeight / 2

      // Logo
      drawLogo(margin, 3, 40, 14)

      // Título grande (en blanco)
      doc.setFontSize(28)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      const docTitle = documentType === 'factura' ? 'FACTURA' : 'BOLETA'
      doc.text(docTitle, pageWidth - margin, yPos + 2, { align: 'right' })
      doc.setTextColor(0, 0, 0)

      yPos = headerHeight + 15
      const leftColumnX = margin
      const rightColumnX = pageWidth / 2 + 10

      // Detalles de la cotización (izquierda)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('DETALLES DE LA COTIZACIÓN', leftColumnX, yPos)
      yPos += 7
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const quoteNumber = `COT-${Date.now().toString().slice(-8)}`
      // El número se generará cuando se cree la cotización (previsualización)
      doc.text(`Número: Cotización (Pendiente)`, leftColumnX, yPos)
      yPos += 6
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}`, leftColumnX, yPos)
      yPos += 6
      doc.text('Estado: PENDIENTE', leftColumnX, yPos)

      // Datos del cliente (derecha)
      let rightYPos = 35
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('DATOS DEL CLIENTE', rightColumnX, rightYPos)
      rightYPos += 7
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Nombre: ${dataToUse.name || 'N/A'}`, rightColumnX, rightYPos)
      rightYPos += 6
      if (documentType === 'factura' && dataToUse.ruc) {
        doc.text(`RUC: ${dataToUse.ruc}`, rightColumnX, rightYPos)
        rightYPos += 6
        doc.text(`Razón Social: ${dataToUse.businessName || 'N/A'}`, rightColumnX, rightYPos)
        rightYPos += 6
        doc.text(`Dirección: ${dataToUse.address || 'N/A'}`, rightColumnX, rightYPos)
        rightYPos += 6
      }
      doc.text(`Teléfono: ${dataToUse.whatsapp || 'N/A'}`, rightColumnX, rightYPos)
      rightYPos += 6
      doc.text(`Email: ${dataToUse.email || 'N/A'}`, rightColumnX, rightYPos)

      yPos = Math.max(yPos, rightYPos) + 15

      // Tabla de productos con encabezado azul
      const tableStartY = yPos
      const tableHeaderHeight = 8
      doc.setFillColor(0, 102, 204)
      doc.rect(margin, tableStartY - tableHeaderHeight, pageWidth - (margin * 2), tableHeaderHeight, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      const colWidths = [90, 25, 30, 30]
      const colX = [
        margin + 5,
        margin + colWidths[0] + 5,
        margin + colWidths[0] + colWidths[1] + 5,
        margin + colWidths[0] + colWidths[1] + colWidths[2] + 5
      ]
      doc.text('ITEM DESCRIPTION', colX[0], tableStartY - 2)
      doc.text('CANT.', colX[1], tableStartY - 2, { align: 'center' })
      doc.text('PRECIO', colX[2], tableStartY - 2, { align: 'right' })
      doc.text('TOTAL', colX[3], tableStartY - 2, { align: 'right' })

      doc.setTextColor(0, 0, 0)
      yPos = tableStartY + 3

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      let itemNumber = 1

      cart.forEach((product) => {
        if (yPos > pageHeight - 100) {
          doc.addPage()
          yPos = margin + 20
        }
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)

        const nameAndDesc = doc.splitTextToSize(
          `${itemNumber}. ${product.name || 'Sin nombre'}`,
          colWidths[0] - 5
        )
        doc.text(nameAndDesc, colX[0], yPos)
        doc.text(String(product.quantity || 0), colX[1], yPos, { align: 'center' })
        doc.text(`S/. ${(product.price || 0).toFixed(2)}`, colX[2], yPos, { align: 'right' })
        doc.text(`S/. ${((product.price || 0) * (product.quantity || 0)).toFixed(2)}`, colX[3], yPos, { align: 'right' })
        yPos += Math.max(nameAndDesc.length * 4, 8)
        itemNumber++
      })

      // Productos no encontrados
      const validNotFoundProducts = notFoundProducts.filter(p => p.name && p.name.trim() !== '')
      if (validNotFoundProducts.length > 0) {
        if (yPos > pageHeight - 100) {
          doc.addPage()
          yPos = margin + 20
        }
        doc.setDrawColor(200, 200, 200)
        doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)
        yPos += 5
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text('PRODUCTOS NO ENCONTRADOS (Solicitar cotización)', margin + 5, yPos)
        yPos += 6
        doc.setFont('helvetica', 'normal')
        validNotFoundProducts.forEach((product) => {
          if (yPos > pageHeight - 100) {
            doc.addPage()
            yPos = margin + 20
          }
          const nameText = doc.splitTextToSize(
            `${itemNumber}. ${product.name}${product.description ? ' - ' + product.description : ''}`,
            colWidths[0] + colWidths[1] - 5
          )
          doc.text(nameText, colX[0], yPos)
          doc.text(product.quantity || '1', colX[1], yPos, { align: 'center' })
          doc.text('Cotizar', colX[2], yPos, { align: 'right' })
          doc.text('-', colX[3], yPos, { align: 'right' })
          yPos += Math.max(nameText.length * 4, 8)
          itemNumber++
        })
      }

      // Resumen (SUB TOTAL, IGV, TOTAL)
      const summaryStartX = pageWidth - margin - 80
      const summaryY = yPos + 10
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text('SUB TOTAL:', summaryStartX, summaryY, { align: 'right' })
      doc.text(`S/. ${getTotal().toFixed(2)}`, pageWidth - margin - 5, summaryY, { align: 'right' })
      doc.text('IGV (18%):', summaryStartX, summaryY + 6, { align: 'right' })
      const igv = getTotal() * 0.18
      doc.text(`S/. ${igv.toFixed(2)}`, pageWidth - margin - 5, summaryY + 6, { align: 'right' })
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.line(summaryStartX - 10, summaryY + 10, pageWidth - margin - 5, summaryY + 10)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('TOTAL:', summaryStartX, summaryY + 18, { align: 'right' })
      const totalWithTax = getTotal() + igv
      doc.text(`S/. ${totalWithTax.toFixed(2)}`, pageWidth - margin - 5, summaryY + 18, { align: 'right' })

      // Información de pago y términos
      const bottomY = summaryY + 30
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('INFORMACIÓN DE PAGO', leftColumnX, bottomY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('Cuenta: Por definir', leftColumnX, bottomY + 7)
      doc.text('Banco: Por definir', leftColumnX, bottomY + 12)
      doc.text('Detalles: Contactar para información', leftColumnX, bottomY + 17)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('TÉRMINOS Y CONDICIONES', leftColumnX, bottomY + 30)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      const terms = doc.splitTextToSize(
        'Esta es una cotización válida por 30 días. Los precios están sujetos a disponibilidad de stock.',
        pageWidth / 2 - margin - 5
      )
      doc.text(terms, leftColumnX, bottomY + 37)

      // Firma
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.line(rightColumnX, bottomY + 15, rightColumnX + 60, bottomY + 15)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('FIRMA AUTORIZADA', rightColumnX + 30, bottomY + 20, { align: 'center' })

      // Footer azul sólido
      const footerHeight = 25
      const footerY = pageHeight - footerHeight
      doc.setFillColor(0, 102, 204)
      doc.rect(0, footerY, pageWidth, footerHeight, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('GRACIAS POR SU PREFERENCIA', margin + 10, footerY + 8)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(`Teléfono: ${dataToUse.whatsapp || 'N/A'}`, pageWidth - margin - 10, footerY + 5, { align: 'right' })
      doc.text(`Email: ${dataToUse.email || 'N/A'}`, pageWidth - margin - 10, footerY + 10, { align: 'right' })
      doc.text('www.ferreteria.com', pageWidth - margin - 10, footerY + 15, { align: 'right' })

      const pdfBlob = doc.output('blob')
      const url = URL.createObjectURL(pdfBlob)
      setPdfPreviewUrl(url)
    } catch (error) {
      console.error('Error generating PDF preview:', error)
    }
  }

  const handleFormChange = async (e) => {
    const newFormData = {
      ...formData,
      [e.target.name]: e.target.value,
    }
    setFormData(newFormData)
    // Regenerar PDF si el modal está abierto
    if (showQuoteModal) {
      await generatePdfPreview(newFormData)
    }
  }

  // Regenerar PDF cuando cambien los productos no encontrados o el tipo de documento
  useEffect(() => {
    if (showQuoteModal && pdfPreviewUrl) {
      const timer = setTimeout(() => {
        generatePdfPreview()
      }, 500) // Debounce para evitar regenerar demasiado rápido
      return () => clearTimeout(timer)
    }
  }, [notFoundProducts, documentType])

  const handleNotFoundProductChange = async (index, field, value) => {
    const updated = [...notFoundProducts]
    updated[index][field] = value
    setNotFoundProducts(updated)
    // Regenerar PDF si el modal está abierto
    if (showQuoteModal) {
      // Usar setTimeout para evitar regenerar en cada tecla
      setTimeout(async () => {
        await generatePdfPreview()
      }, 300)
    }
  }

  const addNotFoundProduct = () => {
    setNotFoundProducts([...notFoundProducts, { name: '', quantity: '', description: '' }])
  }

  const removeNotFoundProduct = (index) => {
    if (notFoundProducts.length > 1) {
      setNotFoundProducts(notFoundProducts.filter((_, i) => i !== index))
    }
  }

  const handleSubmitQuote = async () => {
    setError('')
    setLoading(true)

    // Validación
    if (!formData.name || !formData.email || !formData.whatsapp) {
      setError('Por favor completa todos los campos requeridos')
      setLoading(false)
      return
    }

    if (documentType === 'factura') {
      if (!formData.ruc || !formData.businessName || !formData.address) {
        setError('Para factura es necesario completar RUC, Razón Social y Dirección')
        setLoading(false)
        return
      }
      if (!/^\d{11}$/.test(formData.ruc.replace(/\D/g, ''))) {
        setError('El RUC debe tener 11 dígitos')
        setLoading(false)
        return
      }
    }

    if (cart.length === 0) {
      setError('Tu carrito está vacío')
      setLoading(false)
      return
    }

    try {
      // Filtrar productos no encontrados válidos
      const validNotFoundProducts = notFoundProducts.filter(
        (p) => p.name && p.name.trim() !== ''
      )

      // Determinar si el usuario es admin o cotizador
      const adminRoles = ['admin', 'superadmin', 'editor', 'viewer']
      const cotizadorRoles = ['cotizador', 'vendedor']
      const isAdminOrCotizador = user && (adminRoles.includes(user.role) || cotizadorRoles.includes(user.role))
      
      // Si es cliente, enviar al N8N. Si es admin/cotizador, NO enviar (solo cuando el admin autorice)
      const skipWebhook = isAdminOrCotizador

      console.log('📤 Enviando cotización...')
      console.log('   Cliente:', formData.name, formData.email)
      console.log('   Productos:', cart.length)
      console.log('   Total:', getTotal())
      console.log('   Usuario actual:', user?.name, `(${user?.role || 'cliente'})`)
      console.log('   Enviar a N8N:', !skipWebhook ? 'SÍ' : 'NO (solo cuando admin autorice)')

      const response = await fetch('/api/cotizacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          products: cart,
          notFoundProducts: validNotFoundProducts,
          total: getTotal(),
          documentType: documentType,
          skipWebhook: skipWebhook, // No enviar al webhook si es admin/cotizador
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ Cotización creada exitosamente')
        console.log('   Quote ID:', data.quoteId)
        
        setSuccess(true)
        setQuoteId(data.quoteId)
        clearCart()
        
        // Mostrar notificación flotante de éxito inmediatamente
        const notificationId = Date.now()
        console.log('📢 [NOTIFICACIÓN] Intentando mostrar notificación:', notificationId)
        console.log('📢 [NOTIFICACIÓN] Estado actual de notificaciones:', notifications.length)
        
        // Usar función de actualización para asegurar que el estado se actualice
        const newNotification = {
          id: notificationId,
          type: 'success',
          message: '¡Tu cotización ha sido enviada correctamente!'
        }
        
        console.log('📢 [NOTIFICACIÓN] Nueva notificación creada:', newNotification)
        
        setNotifications([newNotification])
        
        // Verificar que se actualizó después de un momento
        setTimeout(() => {
          console.log('📢 [NOTIFICACIÓN] Verificando después de 100ms - Estado:', notifications.length)
          const container = document.querySelector('[data-notification-container]')
          if (container) {
            console.log('📢 [NOTIFICACIÓN] Contenedor encontrado en DOM')
            const notificationElements = container.querySelectorAll('div[class*="bg-green-600"]')
            console.log('📢 [NOTIFICACIÓN] Elementos de notificación encontrados:', notificationElements.length)
          } else {
            console.error('❌ [NOTIFICACIÓN] Contenedor NO encontrado en DOM')
          }
        }, 100)
        
        // Auto-eliminar la notificación después de 5 segundos
        setTimeout(() => {
          console.log('🗑️ [NOTIFICACIÓN] Eliminando notificación:', notificationId)
          setNotifications(prev => {
            const filtered = prev.filter(n => n.id !== notificationId)
            console.log('🗑️ [NOTIFICACIÓN] Notificaciones después de eliminar:', filtered.length)
            return filtered
          })
        }, 5000)
        
        // Cerrar el modal después de 3 segundos (dar tiempo para ver la notificación)
        setTimeout(() => {
          console.log('🚪 [MODAL] Cerrando modal después de 3 segundos')
          setShowQuoteModal(false)
          setError('')
          setSuccess(false)
        }, 3000)
      } else {
        console.error('❌ Error al crear cotización:', data.error)
        setError(data.error || 'Error al enviar la cotización')
      }
    } catch (error) {
      console.error('❌ Error en la petición:', error)
      console.error('   Detalles:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      setError('Error al enviar la cotización. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuantityChange = (id, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(id)
    } else {
      updateQuantity(id, newQuantity)
    }
  }

  if (cart.length === 0) {
    return (
      <>
        <Head>
          <title>Carrito - Ferretería</title>
        </Head>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 pt-20 pb-8">
            <div className="container mx-auto px-4 py-12">
              <h1 className="text-3xl font-bold mb-6">Carrito de Compras</h1>
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <p className="text-gray-600 text-xl mb-4">Tu carrito está vacío</p>
                <a
                  href="/productos"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
                >
                  Ver Productos
                </a>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Carrito - Ferretería</title>
      </Head>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20 pb-8">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Carrito de Compras</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Lista de productos */}
              <div className="lg:col-span-2 space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row">
                    {/* Imagen */}
                      <div className="relative w-full sm:w-40 h-40 sm:h-auto bg-gradient-to-br from-gray-50 to-gray-100 flex-shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                            className="object-contain p-3"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <div className="text-center">
                              <div className="text-5xl mb-2">📦</div>
                              <div className="text-xs text-gray-500">Sin imagen</div>
                            </div>
                        </div>
                      )}
                    </div>

                      {/* Información y controles */}
                      <div className="flex-1 p-5 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                        {item.name}
                      </h3>
                          <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-sm text-gray-500">Precio unitario:</span>
                            <span className="text-2xl font-bold text-green-600">
                              S/. {item.price.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
                      {/* Controles de cantidad */}
                          <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                              Cantidad:
                            </label>
                            <div className="flex items-center border-2 border-blue-200 rounded-xl overflow-hidden bg-white shadow-sm">
                          <button
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white w-11 h-11 flex items-center justify-center transition-all duration-200 hover:shadow-md"
                                aria-label="Disminuir cantidad"
                          >
                                <FiMinus size={18} />
                          </button>
                              <span className="w-16 text-center font-bold text-gray-900 bg-green-50 py-2.5 text-lg">
                            {item.quantity}
                          </span>
                          <button
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white w-11 h-11 flex items-center justify-center transition-all duration-200 hover:shadow-md"
                                aria-label="Aumentar cantidad"
                          >
                                <FiPlus size={18} />
                          </button>
                        </div>
                          </div>

                          {/* Subtotal y eliminar */}
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-1">Subtotal</p>
                              <p className="text-xl font-bold text-gray-900">
                                S/. {(item.price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                              className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105"
                              aria-label="Eliminar producto"
                        >
                              <FiTrash2 size={18} />
                              <span className="hidden sm:inline">Eliminar</span>
                        </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 sticky top-24">
                  <h2 className="text-2xl font-bold mb-5 text-gray-900 border-b border-gray-200 pb-3">
                    Resumen de Compra
                  </h2>

                  {/* Detalle de productos */}
                  <div className="mb-4 border-b pb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Productos en el carrito:</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                      {cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-start text-sm bg-gray-50 p-2 rounded">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 line-clamp-1">{item.name}</p>
                            <p className="text-gray-500 text-xs">
                              {item.quantity} x S/. {item.price.toFixed(2)}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-800 ml-2">
                            S/. {(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/productos"
                      className="w-full bg-white hover:bg-green-50 text-green-600 py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm border-2 border-green-500 hover:border-green-600 hover:shadow-md"
                    >
                      <FiShoppingBag size={18} />
                      Agregar Más Productos
                    </Link>
                  </div>

                  {/* Totales */}
                  <div className="space-y-3 mb-5 bg-gradient-to-br from-blue-50 to-gray-50 p-4 rounded-xl border border-blue-100">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Subtotal:</span>
                      <span className="font-bold text-gray-900 text-lg">S/. {getTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Envío:</span>
                      <span className="text-sm text-gray-500 italic">Calculado al finalizar</span>
                    </div>
                    <div className="border-t-2 border-blue-200 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900">Total:</span>
                        <span className="text-2xl font-extrabold text-green-600">S/. {getTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="space-y-3">
                    <button
                      onClick={handleQuoteClick}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3.5 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Cotizar Productos
                    </button>
                    <button
                      onClick={clearCart}
                      className="w-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 py-2.5 rounded-xl transition-all duration-200 font-semibold border border-gray-300 hover:border-gray-400"
                    >
                      Vaciar Carrito
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />

        {/* Modal de Cotización */}
        {showQuoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header del Modal */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Cotizar Productos</h2>
                <button
                  onClick={() => {
                    setShowQuoteModal(false)
                    setError('')
                    setSuccess(false)
                  }}
                  className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX size={24} />
                </button>
              </div>

              {/* Contenido del Modal */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Columna Izquierda: Formulario y Productos No Encontrados */}
                  <div className="space-y-6">
                    {/* Datos del Cliente */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FiUser size={20} />
                        Datos del Cliente
                      </h3>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Nombre Completo *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleFormChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                            placeholder="Juan Pérez"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Correo Electrónico *
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleFormChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                            placeholder="juan@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            WhatsApp *
                          </label>
                          <input
                            type="tel"
                            name="whatsapp"
                            value={formData.whatsapp}
                            onChange={handleFormChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                            placeholder="+1 234 567 890"
                          />
                        </div>

                        {/* Campos adicionales para factura */}
                        {documentType === 'factura' && (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">
                                RUC *
                              </label>
                              <input
                                type="text"
                                name="ruc"
                                value={formData.ruc}
                                onChange={async (e) => {
                                  const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                                  const newFormData = { ...formData, ruc: value }
                                  setFormData(newFormData)
                                  if (showQuoteModal) {
                                    await generatePdfPreview(newFormData)
                                  }
                                }}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                placeholder="20123456789"
                                maxLength={11}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Razón Social *
                              </label>
                              <input
                                type="text"
                                name="businessName"
                                value={formData.businessName}
                                onChange={handleFormChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                placeholder="Nombre de la empresa"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Dirección Fiscal *
                              </label>
                              <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleFormChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                                placeholder="Calle, número, distrito"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Productos No Encontrados */}
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FiShoppingBag size={20} />
                        Productos No Encontrados
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Si buscas algún producto que no está en nuestro catálogo, agrégalo aquí:
                      </p>
                      <div className="space-y-3">
                        {notFoundProducts.map((product, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-yellow-300">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="flex-1 space-y-2">
                                <input
                                  type="text"
                                  placeholder="Nombre del producto"
                                  value={product.name}
                                  onChange={(e) => handleNotFoundProductChange(index, 'name', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-800 text-sm"
                                />
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    placeholder="Cantidad"
                                    value={product.quantity}
                                    onChange={(e) => handleNotFoundProductChange(index, 'quantity', e.target.value)}
                                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-800 text-sm"
                                    min="1"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Descripción (opcional)"
                                    value={product.description}
                                    onChange={(e) => handleNotFoundProductChange(index, 'description', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-800 text-sm"
                                  />
                                </div>
                              </div>
                              {notFoundProducts.length > 1 && (
                                <button
                                  onClick={() => removeNotFoundProduct(index)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  type="button"
                                >
                                  <FiX size={20} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={addNotFoundProduct}
                          type="button"
                          className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm border border-yellow-300"
                        >
                          <FiPlus size={18} />
                          Agregar Otro Producto
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Previsualización del PDF */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FiFileText size={20} />
                      Previsualización del PDF
                    </h3>
                    {pdfPreviewUrl ? (
                      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
                        <iframe
                          src={pdfPreviewUrl}
                          className="w-full h-[600px] border-0"
                          title="Vista previa del PDF"
                        />
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg border border-gray-300 h-[600px] flex items-center justify-center">
                        <p className="text-gray-500">Generando previsualización...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer del Modal */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
                    ¡Cotización enviada exitosamente! Redirigiendo...
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowQuoteModal(false)
                      setError('')
                      setSuccess(false)
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition-colors"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmitQuote}
                    disabled={loading || success}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    {loading ? 'Enviando...' : success ? 'Enviado' : 'Enviar Cotización'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notificaciones flotantes en la esquina superior derecha - FUERA del modal */}
        <div 
          className="fixed top-4 right-4 z-[99999] space-y-2 pointer-events-none" 
          style={{ 
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 99999
          }}
          data-notification-container
        >
          {notifications.length > 0 && notifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3 min-w-[350px] max-w-md pointer-events-auto border-2 border-green-700"
              style={{ 
                zIndex: 99999,
                position: 'relative',
                animation: 'slideInRight 0.3s ease-out forwards',
                transform: 'translateX(0)',
                opacity: 1
              }}
            >
              <FiCheckCircle size={24} className="flex-shrink-0" />
              <span className="flex-1 font-semibold text-lg">{notification.message}</span>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="text-white hover:text-green-200 transition-colors flex-shrink-0 p-1 rounded hover:bg-green-700"
                aria-label="Cerrar notificación"
              >
                <FiX size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

