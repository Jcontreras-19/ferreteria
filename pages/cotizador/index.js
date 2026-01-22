import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { FiCheck, FiX, FiSearch, FiDownload, FiFileText, FiPackage, FiClock, FiUser, FiMail, FiPhone, FiCalendar, FiEye, FiCheckCircle, FiXCircle, FiFilter, FiChevronUp, FiChevronDown, FiAlertCircle, FiGrid, FiList, FiDollarSign, FiTrendingUp, FiTag, FiExternalLink, FiShoppingCart, FiInfo } from 'react-icons/fi'
import { checkCotizadorAuth } from '../../lib/cotizadorAuth'
import CotizadorLayout from '../../components/cotizador/CotizadorLayout'
import * as XLSX from 'xlsx'

export default function CotizadorPanel() {
  const router = useRouter()
  const { status: queryStatus } = router.query
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(queryStatus || 'all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [modalAction, setModalAction] = useState(null)
  const [estimatedDelivery, setEstimatedDelivery] = useState('')
  const [notes, setNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [processing, setProcessing] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showDateFilters, setShowDateFilters] = useState(false)
  const [viewMode, setViewMode] = useState('table') // 'cards' or 'table'

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      fetchQuotes()
    }
  }, [user, statusFilter])

  useEffect(() => {
    if (queryStatus) {
      setStatusFilter(queryStatus)
    }
  }, [queryStatus])

  const checkAuth = async () => {
    const { user: userData, error } = await checkCotizadorAuth()
    if (error || !userData) {
      router.push('/login')
      return
    }
    setUser(userData)
    setLoading(false)
  }

  const fetchQuotes = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const res = await fetch(`/api/cotizaciones/cotizador?${params.toString()}`, {
        credentials: 'include',
      })
      
      if (res.ok) {
        const data = await res.json()
        console.log('Quotes fetched:', data)
        setQuotes(data)
      } else {
        console.error('Error fetching quotes:', res.status)
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
    }
  }

  const filteredQuotes = quotes.filter(quote => {
    // Filtro por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = (
        quote.name?.toLowerCase().includes(query) ||
        quote.email?.toLowerCase().includes(query) ||
        quote.whatsapp?.includes(query) ||
        (quote.quoteNumber && quote.quoteNumber.toString().includes(query))
      )
      if (!matchesSearch) return false
    }

    // Filtro por rango de fechas
    if (dateFrom || dateTo) {
      const quoteDate = new Date(quote.createdAt)
      quoteDate.setHours(0, 0, 0, 0)
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        if (quoteDate < fromDate) return false
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (quoteDate > toDate) return false
      }
    }

    return true
  })

  const handleViewDetails = (quote) => {
    setSelectedQuote(quote)
    setShowDetailModal(true)
  }

  const handleViewPdf = async (quote) => {
    try {
      const res = await fetch(`/api/cotizaciones/${quote.id}/pdf`, {
        credentials: 'include',
      })
      
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        setPdfPreviewUrl(url)
        setShowPdfModal(true)
      } else {
        showNotification('Error al cargar el PDF', 'error')
      }
    } catch (error) {
      console.error('Error loading PDF:', error)
      showNotification('Error al cargar el PDF', 'error')
    }
  }

  const handleApprove = async () => {
    if (!selectedQuote) return

    // Validar correo del cliente
    if (!clientEmail || !clientEmail.trim()) {
      showNotification('Por favor ingresa el correo del cliente', 'error')
      return
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(clientEmail.trim())) {
      showNotification('Por favor ingresa un correo válido', 'error')
      return
    }

    setProcessing(true)
    try {
      const res = await fetch(`/api/cotizaciones/${selectedQuote.id}/aprobar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          estimatedDelivery: estimatedDelivery ? parseInt(estimatedDelivery) : null,
          notes: notes || null,
          clientEmail: clientEmail.trim(),
        }),
      })

      if (res.ok) {
        await fetchQuotes()
        setShowActionModal(false)
        setSelectedQuote(null)
        setModalAction(null)
        setEstimatedDelivery('')
        setNotes('')
        setClientEmail('')
        showNotification('Cotización aprobada exitosamente', 'success')
      } else {
        const error = await res.json()
        showNotification(`Error: ${error.error || 'No se pudo aprobar la cotización'}`, 'error')
      }
    } catch (error) {
      console.error('Error approving quote:', error)
      showNotification('Error al aprobar la cotización', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedQuote || !rejectionReason.trim()) {
      showNotification('Por favor ingresa una razón para el rechazo', 'warning')
      return
    }

    setProcessing(true)
    try {
      const res = await fetch(`/api/cotizaciones/${selectedQuote.id}/rechazar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rejectionReason: rejectionReason,
        }),
      })

      if (res.ok) {
        await fetchQuotes()
        setShowActionModal(false)
        setSelectedQuote(null)
        setModalAction(null)
        setRejectionReason('')
        showNotification('Cotización rechazada', 'success')
      } else {
        const error = await res.json()
        showNotification(`Error: ${error.error || 'No se pudo rechazar la cotización'}`, 'error')
      }
    } catch (error) {
      console.error('Error rejecting quote:', error)
      showNotification('Error al rechazar la cotización', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const openActionModal = (quote, action) => {
    setSelectedQuote(quote)
    setModalAction(action)
    setShowActionModal(true)
    if (action === 'approve') {
      setEstimatedDelivery(quote.estimatedDelivery?.toString() || '')
      setNotes(quote.notes || '')
      setClientEmail(quote.email || '')
      setRejectionReason('')
    } else {
      setRejectionReason('')
      setEstimatedDelivery('')
      setNotes('')
      setClientEmail('')
    }
  }

  const exportToExcel = () => {
    // Preparar datos
    const data = filteredQuotes.map((quote, index) => {
      let products = []
      try {
        const productsData = typeof quote.products === 'string' 
          ? JSON.parse(quote.products || '{}')
          : quote.products || {}
        products = quote.productsParsed || productsData.items || productsData
        if (!Array.isArray(products)) products = []
      } catch (e) {
        products = []
      }
      
      return {
        'N°': index + 1,
        'N° Cotización': quote.quoteNumber || 'N/A',
        'Fecha': new Date(quote.createdAt).toLocaleDateString('es-PE'),
        'Cliente': quote.name,
        'Email': quote.email,
        'WhatsApp': quote.whatsapp,
        'Estado': quote.status === 'pending' ? 'Pendiente' : 
                  quote.status === 'approved' ? 'Aprobada' : 
                  quote.status === 'rejected' ? 'Rechazada' : quote.status,
        'Total (S/.)': quote.total?.toFixed(2) || '0.00',
        'Cant. Productos': products.length,
        'Productos': products.map(p => `${p.name} (x${p.quantity || 1})`).join('; '),
        'Stock': quote.allInStock ? 'En Stock' : quote.someInStock ? 'Stock Parcial' : 'Sin Stock',
        'Tiempo Entrega (días)': quote.estimatedDelivery || 'N/A',
        'Notas': quote.notes || '',
        'Razón Rechazo': quote.rejectionReason || '',
      }
    })

    // Crear workbook
    const wb = XLSX.utils.book_new()
    
    // Crear hoja de datos
    const ws = XLSX.utils.json_to_sheet(data, { header: Object.keys(data[0] || {}) })
    
    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 5 },   // N°
      { wch: 12 },  // N° Cotización
      { wch: 12 },  // Fecha
      { wch: 25 },  // Cliente
      { wch: 30 },  // Email
      { wch: 15 },  // WhatsApp
      { wch: 12 },  // Estado
      { wch: 12 },  // Total
      { wch: 12 },  // Cant. Productos
      { wch: 50 },  // Productos
      { wch: 12 },  // Stock
      { wch: 15 },  // Tiempo Entrega
      { wch: 30 },  // Notas
      { wch: 30 },  // Razón Rechazo
    ]
    ws['!cols'] = colWidths
    
    // Agregar título y logo (usando celdas)
    XLSX.utils.sheet_add_aoa(ws, [
      ['CORPORACIÓN GRC - REPORTE DE COTIZACIONES'],
      ['ISO 9001:2015'],
      [`Fecha de exportación: ${new Date().toLocaleDateString('es-PE', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`],
      [`Total de cotizaciones: ${filteredQuotes.length}`],
      [''], // Línea vacía
    ], { origin: 'A1' })
    
    // Mover los datos hacia abajo (después del encabezado)
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    const headerRows = 5
    const newDataStart = headerRows + 1
    
    // Crear nueva hoja con el formato correcto
    const newWs = XLSX.utils.aoa_to_sheet([
      ['CORPORACIÓN GRC - REPORTE DE COTIZACIONES'],
      ['ISO 9001:2015'],
      [`Fecha de exportación: ${new Date().toLocaleDateString('es-PE', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`],
      [`Total de cotizaciones: ${filteredQuotes.length}`],
      [''], // Línea vacía
      Object.keys(data[0] || {}), // Encabezados
      ...data.map(row => Object.values(row)) // Datos
    ])
    
    // Ajustar ancho de columnas
    newWs['!cols'] = colWidths
    
    // Estilos básicos (XLSX no soporta estilos completos, pero podemos usar formato)
    // Agregar bordes y formato básico usando celdas
    const range2 = XLSX.utils.decode_range(newWs['!ref'] || 'A1')
    
    // Agregar la hoja al workbook
    XLSX.utils.book_append_sheet(wb, newWs, 'Cotizaciones')
    
    // Guardar archivo
    const fileName = `cotizaciones-${dateFrom ? dateFrom.split('T')[0] : 'todas'}-${dateTo ? dateTo.split('T')[0] : new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
    
    showNotification('Excel exportado exitosamente', 'success')
  }

  const exportToPDF = async () => {
    try {
      // Usar jsPDF para crear un PDF con todas las cotizaciones
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPos = margin

      // Colores GRC
      const greenColor = [34, 197, 94]
      const darkGreen = [22, 163, 74]

      // Encabezado
      doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2])
      doc.rect(0, 0, pageWidth, 30, 'F')
      
      // Logo GRC (círculo)
      const logoX = margin
      const logoY = 5
      const logoRadius = 10
      doc.setFillColor(greenColor[0], greenColor[1], greenColor[2])
      doc.circle(logoX + logoRadius, logoY + logoRadius, logoRadius, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('GRC', logoX + logoRadius, logoY + logoRadius + 2, { align: 'center' })
      
      // Título
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('CORPORACIÓN GRC', pageWidth - margin, 12, { align: 'right' })
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('Reporte de Cotizaciones', pageWidth - margin, 20, { align: 'right' })
      doc.setFontSize(8)
      doc.text('ISO 9001:2015', pageWidth - margin, 26, { align: 'right' })
      
      doc.setTextColor(0, 0, 0)
      yPos = 40

      // Información del reporte
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Fecha de exportación: ${new Date().toLocaleDateString('es-PE', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, margin, yPos)
      yPos += 6
      
      if (dateFrom || dateTo) {
        doc.text(`Período: ${dateFrom ? new Date(dateFrom).toLocaleDateString('es-PE') : 'Inicio'} - ${dateTo ? new Date(dateTo).toLocaleDateString('es-PE') : 'Hoy'}`, margin, yPos)
        yPos += 6
      }
      
      doc.text(`Total de cotizaciones: ${filteredQuotes.length}`, margin, yPos)
      yPos += 10

      // Tabla de cotizaciones - Mejor distribución de columnas (ajustado para que el email se vea completo)
      const colWidths = [10, 18, 22, 32, 45, 20, 20]
      const colHeaders = ['N°', 'Cotización', 'Fecha', 'Cliente', 'Email', 'Estado', 'Total (S/.)']
      const colX = [
        margin,
        margin + colWidths[0],
        margin + colWidths[0] + colWidths[1],
        margin + colWidths[0] + colWidths[1] + colWidths[2],
        margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
        margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4],
        margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5],
      ]

      // Encabezado de tabla con bordes
      const tableStartY = yPos
      doc.setFillColor(greenColor[0], greenColor[1], greenColor[2])
      doc.rect(margin, tableStartY - 8, pageWidth - (margin * 2), 8, 'F')
      
      // Bordes del encabezado
      doc.setDrawColor(255, 255, 255)
      doc.setLineWidth(0.3)
      doc.line(margin, tableStartY - 8, margin, tableStartY)
      doc.line(pageWidth - margin, tableStartY - 8, pageWidth - margin, tableStartY)
      
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      
      colHeaders.forEach((header, idx) => {
        doc.text(header, colX[idx] + 2, tableStartY - 2)
        // Líneas verticales entre columnas en el encabezado
        if (idx < colHeaders.length - 1) {
          doc.setDrawColor(255, 255, 255)
          doc.setLineWidth(0.2)
          doc.line(colX[idx + 1], tableStartY - 8, colX[idx + 1], tableStartY)
        }
      })
      
      doc.setTextColor(0, 0, 0)
      yPos = tableStartY + 6

      // Filas de datos con mejor formato y bordes
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      
      filteredQuotes.forEach((quote, index) => {
        if (yPos > pageHeight - 35) {
          doc.addPage()
          yPos = margin + 20
          // Redibujar encabezado en nueva página
          doc.setFillColor(greenColor[0], greenColor[1], greenColor[2])
          doc.rect(margin, yPos - 8, pageWidth - (margin * 2), 8, 'F')
          doc.setDrawColor(255, 255, 255)
          doc.line(margin, yPos - 8, margin, yPos)
          doc.line(pageWidth - margin, yPos - 8, pageWidth - margin, yPos)
          doc.setTextColor(255, 255, 255)
          doc.setFont('helvetica', 'bold')
          colHeaders.forEach((header, idx) => {
            doc.text(header, colX[idx] + 2, yPos - 2)
            if (idx < colHeaders.length - 1) {
              doc.setDrawColor(255, 255, 255)
              doc.setLineWidth(0.2)
              doc.line(colX[idx + 1], yPos - 8, colX[idx + 1], yPos)
            }
          })
          doc.setTextColor(0, 0, 0)
          yPos += 6
        }

        const statusText = quote.status === 'pending' ? 'Pendiente' : 
                          quote.status === 'approved' ? 'Aprobada' : 
                          quote.status === 'rejected' ? 'Rechazada' : quote.status

        // Fondo alternado para mejor legibilidad
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250)
          doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 7, 'F')
        }

        // Bordes de la fila
        doc.setDrawColor(220, 220, 220)
        doc.setLineWidth(0.2)
        // Línea inferior de la fila
        doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2)
        // Líneas verticales entre columnas
        colX.forEach((x, idx) => {
          if (idx > 0) {
            doc.line(x, yPos - 5, x, yPos + 2)
          }
        })
        // Bordes laterales
        doc.line(margin, yPos - 5, margin, yPos + 2)
        doc.line(pageWidth - margin, yPos - 5, pageWidth - margin, yPos + 2)

        // Número - centrado
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(String(index + 1), colX[0] + colWidths[0] / 2, yPos, { align: 'center' })
        
        // Cotización
        doc.text(String(quote.quoteNumber || 'N/A'), colX[1] + 2, yPos)
        
        // Fecha
        doc.text(new Date(quote.createdAt).toLocaleDateString('es-PE'), colX[2] + 2, yPos)
        
        // Cliente - truncar si es muy largo
        const clientName = (quote.name || 'N/A').substring(0, 25)
        doc.text(clientName, colX[3] + 2, yPos)
        
        // Email - tamaño normal, se ajusta automáticamente
        const email = quote.email || 'N/A'
        doc.setFontSize(7.5)
        doc.text(email, colX[4] + 2, yPos)
        doc.setFontSize(8)
        
        // Estado
        doc.text(statusText, colX[5] + 2, yPos)
        
        // Total - alineado a la derecha
        doc.setFont('helvetica', 'bold')
        doc.text(`S/. ${quote.total?.toFixed(2) || '0.00'}`, colX[6] + colWidths[6] - 2, yPos, { align: 'right' })
        doc.setFont('helvetica', 'normal')
        
        // Espaciado entre filas
        yPos += 7
      })

      // Pie de página
      const footerY = pageHeight - 15
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text('Corporación GRC - Av. José Gálvez 1322 Dpto. 302 La Perla - Callao', pageWidth / 2, footerY, { align: 'center' })
      doc.text('Tel: (511) 957 216 908 | Email: corporaciongrc@gmail.com', pageWidth / 2, footerY + 5, { align: 'center' })

      // Guardar PDF
      const fileName = `cotizaciones-${dateFrom ? dateFrom.split('T')[0] : 'todas'}-${dateTo ? dateTo.split('T')[0] : new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      
      showNotification('PDF exportado exitosamente', 'success')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      showNotification('Error al exportar PDF', 'error')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pendiente', class: 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' },
      approved: { text: 'Aprobada', class: 'bg-green-100 text-green-800 border-2 border-green-300' },
      authorized: { text: 'Autorizada', class: 'bg-blue-100 text-blue-800 border-2 border-blue-300' },
      dispatched: { text: 'Despachada', class: 'bg-purple-100 text-purple-800 border-2 border-purple-300' },
      completed: { text: 'Completada', class: 'bg-green-100 text-green-800 border-2 border-green-300' },
      rejected: { text: 'Rechazada', class: 'bg-red-100 text-red-800 border-2 border-red-300' },
    }
    return badges[status] || badges.pending
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-50 text-yellow-700 border-2 border-yellow-300',
      approved: 'bg-green-50 text-green-700 border-2 border-green-300',
      authorized: 'bg-blue-50 text-blue-700 border-2 border-blue-300',
      dispatched: 'bg-indigo-50 text-indigo-700 border-2 border-indigo-300',
      completed: 'bg-green-50 text-green-700 border-2 border-green-300',
      rejected: 'bg-red-50 text-red-700 border-2 border-red-300',
    }
    return colors[status] || 'bg-gray-50 text-gray-700 border-2 border-gray-300'
  }

  const getStatusIcon = (status) => {
    const icons = {
      pending: <FiClock size={12} />,
      approved: <FiCheckCircle size={12} />,
      authorized: <FiCheckCircle size={12} />,
      dispatched: <FiPackage size={12} />,
      completed: <FiCheckCircle size={12} />,
      rejected: <FiXCircle size={12} />,
    }
    return icons[status] || <FiAlertCircle size={12} />
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      authorized: 'Autorizada',
      dispatched: 'Despachada',
      completed: 'Completada',
      rejected: 'Rechazada',
    }
    return labels[status] || status
  }

  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    approved: quotes.filter(q => q.status === 'approved').length,
    rejected: quotes.filter(q => q.status === 'rejected').length,
    totalAmount: quotes.reduce((sum, q) => sum + (q.total || 0), 0),
  }

  const getStockBadge = (quote) => {
    if (quote.allInStock) {
      return { text: 'En Stock', class: 'bg-green-100 text-green-800' }
    } else if (quote.someInStock) {
      return { text: 'Stock Parcial', class: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { text: 'Sin Stock', class: 'bg-red-100 text-red-800' }
    }
  }

  const showNotification = (message, type = 'success') => {
    const id = Date.now()
    const notification = { id, message, type }
    setNotifications(prev => [...prev, notification])
    
    // Auto-remover después de 3 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 3000)
  }

  // Parsear productos del quote seleccionado
  const parsedQuoteData = useMemo(() => {
    if (!selectedQuote) return { products: [], notFoundProducts: [] }
    
    let products = []
    let notFoundProducts = []
    try {
      // Primero intentar usar productsParsed (ya parseado por la API)
      if (selectedQuote.productsParsed && Array.isArray(selectedQuote.productsParsed)) {
        products = selectedQuote.productsParsed
        // Si la API ya incluyó notFoundProducts, usarlo directamente
        if (selectedQuote.notFoundProducts && Array.isArray(selectedQuote.notFoundProducts)) {
          notFoundProducts = selectedQuote.notFoundProducts
        } else {
          // Si no está en el objeto, extraer del products original
          const productsData = typeof selectedQuote.products === 'string' 
            ? JSON.parse(selectedQuote.products || '{}')
            : selectedQuote.products || {}
          notFoundProducts = productsData.notFoundProducts || []
          if (!Array.isArray(notFoundProducts)) {
            notFoundProducts = []
          }
        }
      } else {
        // Si no está parseado, parsear manualmente
        const productsData = typeof selectedQuote.products === 'string' 
          ? JSON.parse(selectedQuote.products || '{}')
          : selectedQuote.products || {}
        
        // Obtener productos del formato nuevo (con items) o formato antiguo (array directo)
        const productsArray = productsData.items || productsData
        
        // Asegurarse de que es un array
        if (Array.isArray(productsArray)) {
          products = productsArray
        } else {
          products = []
        }
        
        // Extraer productos no encontrados
        notFoundProducts = productsData.notFoundProducts || []
        if (!Array.isArray(notFoundProducts)) {
          notFoundProducts = []
        }
      }
    } catch (e) {
      console.error('Error parsing products in modal:', e)
      products = []
      notFoundProducts = []
    }
    return { products, notFoundProducts }
  }, [selectedQuote])

  if (loading) {
    return (
      <CotizadorLayout user={user} loading={loading}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      </CotizadorLayout>
    )
  }

  return (
    <>
      <Head>
        <title>Panel de Cotizador - Corporación GRC</title>
      </Head>
      <CotizadorLayout user={user}>
        <div className="space-y-4">
          {/* Header Compacto con Estadísticas */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">GESTIÓN DE COTIZACIONES</h1>
                <p className="text-gray-600 text-xs mt-0.5">
                  {quotes.length} cotización{quotes.length !== 1 ? 'es' : ''} en total
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title="Vista de cards"
                >
                  <FiGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title="Vista de tabla"
                >
                  <FiList size={16} />
                </button>
              </div>
            </div>

            {/* Estadísticas Compactas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 border-2 border-yellow-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-yellow-800 text-xs font-semibold">Pendientes</span>
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-md">
                    <FiClock className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-green-800 text-xs font-semibold">Aprobadas</span>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                    <FiCheckCircle className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.approved}</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border-2 border-red-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-red-800 text-xs font-semibold">Rechazadas</span>
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                    <FiXCircle className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border-2 border-purple-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-purple-800 text-xs font-semibold">Total Ventas</span>
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                    <FiDollarSign className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-lg font-bold text-purple-900">S/. {stats.totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Filtros Compactos en una sola fila */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Título de Filtros */}
                <div className="flex items-center gap-2 mr-2">
                  <FiFilter size={16} className="text-gray-600" />
                  <h2 className="text-sm font-bold text-gray-800">Filtros</h2>
                  {(dateFrom || dateTo || statusFilter !== 'all') && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                      Filtros activos
                    </span>
                  )}
                </div>

                {/* Búsqueda */}
                <div className="relative flex-1 min-w-[200px]">
                  <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Buscar por cliente, email, WhatsApp o número..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 text-sm"
                    style={{ color: '#111827' }}
                  />
                </div>

                {/* Estado */}
                <div className="min-w-[150px]">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value)
                      router.push(`/cotizador${e.target.value !== 'all' ? `?status=${e.target.value}` : ''}`)
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white text-sm"
                    style={{ color: '#111827' }}
                  >
                    <option value="all">Todos los estados</option>
                    <option value="pending">Pendientes</option>
                    <option value="approved">Aprobadas</option>
                    <option value="rejected">Rechazadas</option>
                  </select>
                </div>

                {/* Botón Fechas */}
                <button
                  onClick={() => setShowDateFilters(!showDateFilters)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiCalendar size={14} />
                  <span>Fechas</span>
                  {showDateFilters ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                </button>

                {/* Botones de Exportar */}
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiDownload size={14} />
                  <span>Excel</span>
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiFileText size={14} />
                  <span>PDF</span>
                </button>
              </div>

              {/* Filtros de Fecha Colapsables */}
              {showDateFilters && (
                <div className="mt-3 bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
                      <div className="relative">
                        <FiCalendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-green-600" size={14} />
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white text-sm"
                          style={{ color: '#111827' }}
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
                      <div className="relative">
                        <FiCalendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-green-600" size={14} />
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white text-sm"
                          style={{ color: '#111827' }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setDateFrom('')
                        setDateTo('')
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-xs font-medium transition-colors flex items-center justify-center gap-1 h-[38px]"
                    >
                      <FiX size={14} />
                      <span>Limpiar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Contador de resultados */}
              <div className="flex items-center justify-between text-xs text-gray-600 pt-2 mt-2 border-t border-gray-200">
                <span>Mostrando {filteredQuotes.length} de {quotes.length} cotizaciones</span>
              </div>
            </div>
          </div>

          {/* Vista de Cards o Tabla */}
          {viewMode === 'cards' ? (
            filteredQuotes.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                <FiFileText className="mx-auto text-gray-400" size={48} />
                <p className="mt-4 text-gray-600 text-lg">No hay cotizaciones disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredQuotes.map((quote) => {
                const statusBadge = getStatusBadge(quote.status)
                const stockBadge = getStockBadge(quote)
                let products = []
                try {
                  products = quote.productsParsed || JSON.parse(quote.products || '[]')
                } catch (e) {
                  products = []
                }

                return (
                  <div key={quote.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200">
                    {/* Header de la Card */}
                    <div className="bg-gradient-to-br from-green-600 to-green-700 p-4 text-white">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold">
                          #{quote.quoteNumber || 'N/A'}
                        </h3>
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusBadge.class}`}>
                            {statusBadge.text}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${stockBadge.class}`}>
                            {stockBadge.text}
                          </span>
                        </div>
                      </div>
                      <div className="text-2xl font-bold">
                        S/. {quote.total?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-green-100 mt-1">
                        {new Date(quote.createdAt).toLocaleDateString('es-PE')}
                      </div>
                    </div>

                    {/* Contenido de la Card */}
                    <div className="p-4 space-y-3">
                      {/* Información del Cliente */}
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center space-x-2 text-gray-700">
                          <FiUser size={14} className="text-gray-400" />
                          <span className="font-medium truncate">{quote.name}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600 text-xs">
                          <FiMail size={14} className="text-gray-400" />
                          <span className="truncate">{quote.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600 text-xs">
                          <FiPhone size={14} className="text-gray-400" />
                          <span>{quote.whatsapp}</span>
                        </div>
                      </div>

                      {/* Productos - Resumen */}
                      <div className="border-t pt-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <FiPackage size={14} className="text-gray-400" />
                          <span className="text-xs font-semibold text-gray-700">Productos ({products.length})</span>
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-2">
                          {products.slice(0, 2).map((p, idx) => (
                            <span key={idx}>
                              {p.name} x{p.quantity || 1}
                              {idx < Math.min(products.length, 2) - 1 ? ', ' : ''}
                            </span>
                          ))}
                          {products.length > 2 && <span className="text-gray-400"> +{products.length - 2} más</span>}
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      <div className="flex flex-col space-y-2 pt-2 border-t">
                        <button
                          onClick={() => handleViewDetails(quote)}
                          className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors shadow-sm"
                        >
                          <FiEye size={16} />
                          <span>VER</span>
                        </button>
                        {quote.status === 'pending' && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => openActionModal(quote, 'approve')}
                              className="flex items-center justify-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-2 py-2 rounded-lg text-xs transition-colors shadow-sm"
                            >
                              <FiCheckCircle size={14} />
                              <span>ACEPTAR</span>
                            </button>
                            <button
                              onClick={() => openActionModal(quote, 'reject')}
                              className="flex items-center justify-center space-x-1 bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded-lg text-xs transition-colors shadow-sm"
                            >
                              <FiXCircle size={14} />
                              <span>RECHAZAR</span>
                            </button>
                          </div>
                        )}
                        {quote.status === 'approved' && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center space-x-2 text-green-800">
                              <FiCheckCircle size={14} className="text-green-600" />
                              <span className="text-xs font-semibold">Cotización Aprobada</span>
                            </div>
                            <div className="text-xs text-green-700">
                              Esperando autorización del administrador
                            </div>
                            {quote.estimatedDelivery && (
                              <div className="flex items-center space-x-2 text-green-700 text-xs">
                                <FiClock size={12} />
                                <span>Entrega: {quote.estimatedDelivery} días</span>
                              </div>
                            )}
                            {quote.notes && (
                              <div className="text-xs text-green-700 line-clamp-2">
                                <span className="font-medium">Nota: </span>
                                {quote.notes}
                              </div>
                            )}
                          </div>
                        )}
                        {quote.status === 'authorized' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center space-x-2 text-blue-800">
                              <FiCheckCircle size={14} className="text-blue-600" />
                              <span className="text-xs font-semibold">Despacho Autorizado</span>
                            </div>
                            {quote.documentType && quote.documentNumber && (
                              <div className="text-xs text-blue-700">
                                <span className="font-medium">{quote.documentType === 'factura' ? 'Factura' : 'Boleta'}: </span>
                                {quote.documentNumber}
                              </div>
                            )}
                            {quote.authorizedAt && (
                              <div className="text-xs text-blue-600">
                                Autorizada: {new Date(quote.authorizedAt).toLocaleDateString('es-PE')}
                              </div>
                            )}
                          </div>
                        )}
                        {quote.status === 'dispatched' && (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center space-x-2 text-purple-800">
                              <FiCheckCircle size={14} className="text-purple-600" />
                              <span className="text-xs font-semibold">Despachada</span>
                            </div>
                            {quote.dispatchedAt && (
                              <div className="text-xs text-purple-600">
                                Despachada: {new Date(quote.dispatchedAt).toLocaleDateString('es-PE')}
                              </div>
                            )}
                          </div>
                        )}
                        {quote.status === 'completed' && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center space-x-2 text-green-800">
                              <FiCheckCircle size={14} className="text-green-600" />
                              <span className="text-xs font-semibold">Completada</span>
                            </div>
                            <div className="text-xs text-green-600">
                              Orden finalizada
                            </div>
                          </div>
                        )}
                        {quote.status === 'rejected' && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2 text-red-800 mb-1">
                              <FiXCircle size={14} className="text-red-600" />
                              <span className="text-xs font-semibold">Cotización Rechazada</span>
                            </div>
                            {quote.rejectionReason && (
                              <div className="text-xs text-red-700 line-clamp-2">
                                {quote.rejectionReason}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              </div>
            )
          ) : (
            /* Vista de Tabla */
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-green-600 to-indigo-700">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiUser size={14} />
                          Cliente
                        </div>
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiMail size={14} />
                          Contacto
                        </div>
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiDollarSign size={14} />
                          Total
                        </div>
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiCheckCircle size={14} />
                          Estado
                        </div>
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiCalendar size={14} />
                          Fecha
                        </div>
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredQuotes.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <FiFileText className="mx-auto text-gray-400 mb-3" size={48} />
                          <p className="text-gray-600 text-lg">No hay cotizaciones disponibles</p>
                        </td>
                      </tr>
                    ) : (
                      filteredQuotes.map((quote, index) => (
                        <tr 
                          key={quote.id} 
                          className={`transition-colors ${
                            index % 2 === 0 
                              ? 'bg-white hover:bg-green-50' 
                              : 'bg-gray-50 hover:bg-green-50'
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-white font-bold text-sm">
                                  {quote.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{quote.name}</div>
                                {quote.quoteNumber && (
                                  <div className="text-xs text-gray-500 font-mono">
                                    #{quote.quoteNumber}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-gray-900">
                                <FiMail size={14} className="text-gray-400" />
                                <span className="truncate max-w-[200px]">{quote.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <FiPhone size={14} className="text-gray-400" />
                                <span>{quote.whatsapp}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="text-base font-bold text-green-600">
                              S/. {quote.total?.toFixed(2) || '0.00'}
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg ${getStatusColor(quote.status)} shadow-sm`}>
                              {getStatusIcon(quote.status)}
                              {getStatusLabel(quote.status)}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(quote.createdAt).toLocaleDateString('es-PE', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(quote.createdAt).toLocaleTimeString('es-PE', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleViewDetails(quote)}
                                className="group relative flex items-center justify-center w-9 h-9 bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 hover:border-blue-400 text-blue-600 hover:text-blue-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-110"
                                title="Ver detalles"
                              >
                                <FiEye size={18} />
                              </button>
                              <button
                                onClick={() => handleViewPdf(quote)}
                                className="group relative flex items-center justify-center w-9 h-9 bg-purple-50 hover:bg-purple-100 border-2 border-purple-300 hover:border-purple-400 text-purple-600 hover:text-purple-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-110"
                                title="Ver PDF"
                              >
                                <FiFileText size={18} />
                              </button>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a')
                                  link.href = `/api/cotizaciones/${quote.id}/pdf`
                                  link.download = `cotizacion-${quote.quoteNumber || quote.id}.pdf`
                                  link.click()
                                }}
                                className="group relative flex items-center justify-center w-9 h-9 bg-green-50 hover:bg-green-100 border-2 border-green-300 hover:border-green-400 text-green-600 hover:text-green-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-110"
                                title="Descargar PDF"
                              >
                                <FiDownload size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal de Detalles - Compacto Sin Scroll */}
        {showDetailModal && selectedQuote && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 animate-fadeIn overflow-y-auto">
            <div className="bg-white rounded-lg w-full max-w-6xl shadow-2xl border border-gray-300 flex flex-col animate-slideUp my-4" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
              {/* Header con Gradiente Colorido */}
              <div className="bg-gradient-to-r from-green-600 via-indigo-600 to-purple-600 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between border-b border-indigo-700 shadow-lg flex-shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center ring-2 ring-white/30 flex-shrink-0">
                    <FiFileText className="text-white" size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate">Detalles de Cotización</h3>
                    <p className="text-green-100 text-xs flex items-center gap-1 truncate">
                      <FiTag size={10} className="flex-shrink-0" />
                      {selectedQuote.quoteNumber 
                        ? `Cotización ${String(selectedQuote.quoteNumber).padStart(7, '0')}`
                        : `#${selectedQuote.id.slice(0, 8).toUpperCase()}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedQuote(null)
                  }}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 ring-2 ring-white/30 flex-shrink-0 ml-2"
                >
                  <FiX className="text-white" size={16} />
                </button>
              </div>

              {/* Contenido Compacto Sin Scroll con Colores */}
              <div className="p-2 sm:p-4 bg-gradient-to-br from-gray-50 to-white overflow-hidden flex-1 min-h-0">
                  <div className="grid grid-cols-12 gap-2 sm:gap-3">
                    {/* Columna Izquierda - Info Principal con Colores (Más Estrecha) */}
                    <div className="col-span-12 lg:col-span-3 space-y-2 order-2 lg:order-1">
                      {/* Total con Gradiente Verde - Más Compacto */}
                      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg border-2 border-green-400 shadow-lg p-2 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -mr-6 -mt-6"></div>
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-green-100 font-semibold flex items-center gap-1">
                              <FiDollarSign size={10} />
                              Total
                            </span>
                            <div className="w-6 h-6 bg-white/20 backdrop-blur-sm rounded flex items-center justify-center">
                              <FiDollarSign className="text-white" size={12} />
                            </div>
                          </div>
                          <p className="text-lg font-bold">S/. {selectedQuote.total?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>

                      {/* Estado con Color según Estado - Más Compacto */}
                      <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600 font-semibold flex items-center gap-1">
                            <FiTag size={10} />
                            Estado
                          </span>
                          <div className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center">
                            <FiCheckCircle className="text-purple-600" size={12} />
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg shadow-sm ${getStatusColor(selectedQuote.status)}`}>
                          {getStatusIcon(selectedQuote.status)}
                          {getStatusLabel(selectedQuote.status)}
                        </span>
                      </div>

                      {/* Stock - Más Compacto */}
                      <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600 font-semibold flex items-center gap-1">
                            <FiPackage size={10} />
                            Stock
                          </span>
                          <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                            <FiCheckCircle className="text-green-600" size={12} />
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-lg shadow-sm ${getStockBadge(selectedQuote).class}`}>
                          {getStockBadge(selectedQuote).text}
                        </span>
                      </div>

                      {/* Cliente con Color Azul - Más Compacto */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 shadow-md p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-blue-700 font-semibold flex items-center gap-1">
                            <FiUser size={10} />
                            Cliente
                          </span>
                          <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center shadow-sm">
                            <FiUser className="text-white" size={12} />
                          </div>
                        </div>
                        <p className="text-xs font-bold text-gray-900 truncate">{selectedQuote.name}</p>
                      </div>

                      {/* Contacto con Iconos Coloridos - Más Compacto */}
                      <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md p-2">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <FiMail className="text-blue-500" size={12} />
                          <span className="text-xs text-gray-600 font-semibold">Contacto</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 p-1.5 bg-blue-50 rounded border border-blue-100">
                            <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center flex-shrink-0">
                              <FiMail className="text-white" size={10} />
                            </div>
                            <p className="text-xs text-gray-900 truncate font-medium">{selectedQuote.email}</p>
                          </div>
                          <div className="flex items-center gap-1.5 p-1.5 bg-green-50 rounded border border-green-100">
                            <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center flex-shrink-0">
                              <FiPhone className="text-white" size={10} />
                            </div>
                            <p className="text-xs text-gray-900 font-medium">{selectedQuote.whatsapp}</p>
                          </div>
                        </div>
                      </div>

                      {/* Información adicional para aprobadas */}
                      {selectedQuote.status === 'approved' && (
                        <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md p-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <FiCheckCircle className="text-green-500" size={12} />
                            <span className="text-xs text-gray-600 font-semibold">Aprobación</span>
                          </div>
                          {selectedQuote.estimatedDelivery && (
                            <div className="text-xs text-gray-700 mb-1">
                              <span className="font-medium">Entrega:</span> {selectedQuote.estimatedDelivery} días
                            </div>
                          )}
                          {selectedQuote.notes && (
                            <div className="text-xs text-gray-700 line-clamp-2">
                              <span className="font-medium">Nota:</span> {selectedQuote.notes}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Razón de rechazo */}
                      {selectedQuote.status === 'rejected' && selectedQuote.rejectionReason && (
                        <div className="bg-white rounded-lg border-2 border-red-200 shadow-md p-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <FiXCircle className="text-red-500" size={12} />
                            <span className="text-xs text-gray-600 font-semibold">Rechazo</span>
                          </div>
                          <p className="text-xs text-red-700 line-clamp-3">{selectedQuote.rejectionReason}</p>
                        </div>
                      )}
                    </div>

                    {/* Columna Derecha - Tabla de Productos con Colores (Más Ancha) */}
                    <div className="col-span-12 lg:col-span-9 order-1 lg:order-2">
                      <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-2 sm:px-3 py-2 sm:py-2.5 border-b border-purple-700">
                          <h4 className="text-xs font-bold text-white flex items-center gap-2">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white/20 backdrop-blur-sm rounded flex items-center justify-center flex-shrink-0">
                              <FiPackage className="text-white" size={10} />
                            </div>
                            <span className="truncate">Productos ({parsedQuoteData.products.length})</span>
                          </h4>
                        </div>
                        <div className="max-h-64 overflow-y-auto overflow-x-auto">
                          <table className="w-full text-xs min-w-[600px]">
                            <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 border-b-2 border-gray-300">
                              <tr>
                                <th className="px-2 py-2 text-left font-bold text-gray-700">
                                  <div className="flex items-center gap-1">
                                    <FiPackage size={10} />
                                    Producto
                                  </div>
                                </th>
                                <th className="px-2 py-2 text-center font-bold text-gray-700">
                                  <div className="flex items-center justify-center gap-1">
                                    <FiShoppingCart size={10} />
                                    Cant.
                                  </div>
                                </th>
                                <th className="px-2 py-2 text-center font-bold text-gray-700">
                                  <div className="flex items-center justify-center gap-1">
                                    <FiPackage size={10} />
                                    Stock
                                  </div>
                                </th>
                                <th className="px-2 py-2 text-right font-bold text-gray-700">
                                  <div className="flex items-center justify-end gap-1">
                                    <FiDollarSign size={10} />
                                    P. Unit.
                                  </div>
                                </th>
                                <th className="px-2 py-2 text-right font-bold text-gray-700">
                                  <div className="flex items-center justify-end gap-1">
                                    <FiTrendingUp size={10} />
                                    Subtotal
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {parsedQuoteData.products.length === 0 ? (
                                <tr>
                                  <td colSpan="5" className="px-2 py-4 text-center text-gray-500">
                                    No hay productos en esta cotización
                                  </td>
                                </tr>
                              ) : (
                                parsedQuoteData.products.map((product, index) => {
                                  const stock = product.stock || 0
                                  const quantity = product.quantity || 1
                                  const hasStock = stock >= quantity
                                  const stockClass = hasStock 
                                    ? 'bg-green-50 text-green-700 border-2 border-green-300' 
                                    : stock > 0
                                    ? 'bg-yellow-50 text-yellow-700 border-2 border-yellow-300'
                                    : 'bg-red-50 text-red-700 border-2 border-red-300'
                                  
                                  return (
                                    <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-green-50' : 'bg-gray-50 hover:bg-green-50'}>
                                      <td className="px-2 py-2">
                                        <div className="flex items-start gap-2">
                                          <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <FiPackage className="text-blue-600" size={10} />
                                          </div>
                                          <div>
                                            <div className="font-semibold text-gray-900">{product.name}</div>
                                            {product.description && (
                                              <div className="text-gray-500 text-xs mt-0.5 line-clamp-1">{product.description}</div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <span className="inline-flex items-center justify-center w-7 h-7 bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs">
                                          {quantity}
                                        </span>
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded ${stockClass}`}>
                                          {stock}
                                        </span>
                                      </td>
                                      <td className="px-2 py-2 text-right text-gray-900 font-medium">S/. {product.price?.toFixed(2) || '0.00'}</td>
                                      <td className="px-2 py-2 text-right">
                                        <span className="font-bold text-green-600 text-xs">
                                          S/. {((product.price || 0) * quantity).toFixed(2)}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })
                              )}
                            </tbody>
                            <tfoot className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-300">
                              <tr>
                                <td colSpan="4" className="px-2 py-2 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <FiDollarSign className="text-green-600" size={12} />
                                    <span className="font-bold text-gray-700 text-xs">Total:</span>
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-right">
                                  <span className="font-bold text-green-600 text-sm">
                                    S/. {selectedQuote.total?.toFixed(2) || '0.00'}
                                  </span>
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      {/* Sección de Productos No Encontrados */}
                      {parsedQuoteData.notFoundProducts && parsedQuoteData.notFoundProducts.length > 0 && (
                        <div className="bg-white rounded-lg border-2 border-yellow-300 shadow-md overflow-hidden mt-2 sm:mt-3">
                          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-2 sm:px-3 py-2 sm:py-2.5 border-b border-orange-600">
                            <h4 className="text-xs font-bold text-white flex items-center gap-2">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white/20 backdrop-blur-sm rounded flex items-center justify-center flex-shrink-0">
                                <FiAlertCircle className="text-white" size={10} />
                              </div>
                              <span className="truncate">Productos No Encontrados ({parsedQuoteData.notFoundProducts.length})</span>
                            </h4>
                          </div>
                          <div className="max-h-48 overflow-y-auto overflow-x-auto">
                            <table className="w-full text-xs min-w-[500px]">
                              <thead className="bg-gradient-to-r from-yellow-100 to-orange-100 sticky top-0 border-b-2 border-yellow-300">
                                <tr>
                                  <th className="px-2 py-2 text-left font-bold text-gray-700">
                                    <div className="flex items-center gap-1">
                                      <FiPackage size={10} />
                                      Producto
                                    </div>
                                  </th>
                                  <th className="px-2 py-2 text-left font-bold text-gray-700">
                                    <div className="flex items-center gap-1">
                                      <FiFileText size={10} />
                                      Descripción
                                    </div>
                                  </th>
                                  <th className="px-2 py-2 text-center font-bold text-gray-700">
                                    <div className="flex items-center justify-center gap-1">
                                      <FiShoppingCart size={10} />
                                      Cant.
                                    </div>
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-yellow-200">
                                {parsedQuoteData.notFoundProducts.map((product, index) => (
                                  <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-yellow-50' : 'bg-yellow-50 hover:bg-yellow-100'}>
                                    <td className="px-2 py-2">
                                      <div className="flex items-start gap-2">
                                        <div className="w-6 h-6 bg-yellow-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <FiAlertCircle className="text-yellow-600" size={10} />
                                        </div>
                                        <div>
                                          <div className="font-semibold text-gray-900">{product.name || 'Sin nombre'}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-2 py-2">
                                      <div className="text-gray-600 text-xs">
                                        {product.description || 'Sin descripción'}
                                      </div>
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      <span className="inline-flex items-center justify-center w-7 h-7 bg-yellow-100 text-yellow-700 font-bold rounded-lg text-xs">
                                        {product.quantity || 1}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="bg-yellow-50 border-t border-yellow-200 px-3 py-2">
                            <p className="text-xs text-yellow-800 italic">
                              <FiInfo className="inline mr-1" size={10} />
                              Los productos no encontrados en nuestro catálogo. Nos contactaremos contigo cuando tengamos la cotización.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer con Botones Coloridos y Diseño Mejorado */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-300 px-2 sm:px-4 py-2 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 shadow-inner flex-shrink-0">
                  <div className="flex items-center gap-2 text-xs text-gray-600 bg-white px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm justify-center sm:justify-start">
                    <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
                      <FiClock className="text-green-600" size={12} />
                    </div>
                    <span className="font-medium text-center sm:text-left">{new Date(selectedQuote.createdAt).toLocaleDateString('es-PE', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowDetailModal(false)
                        handleViewPdf(selectedQuote)
                      }}
                      className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex-1 sm:flex-initial min-w-[100px]"
                    >
                      <FiExternalLink size={12} />
                      <span className="hidden sm:inline">Ver PDF</span>
                      <span className="sm:hidden">PDF</span>
                    </button>
                    <button
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = `/api/cotizaciones/${selectedQuote.id}/pdf`
                        link.download = `cotizacion-${selectedQuote.quoteNumber || selectedQuote.id}.pdf`
                        link.click()
                      }}
                      className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex-1 sm:flex-initial min-w-[100px]"
                    >
                      <FiDownload size={12} />
                      <span className="hidden sm:inline">Descargar</span>
                      <span className="sm:hidden">Desc.</span>
                    </button>
                    {selectedQuote.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setShowDetailModal(false)
                            openActionModal(selectedQuote, 'approve')
                          }}
                          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex-1 sm:flex-initial min-w-[100px]"
                        >
                          <FiCheckCircle size={12} />
                          <span>Aprobar</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowDetailModal(false)
                            openActionModal(selectedQuote, 'reject')
                          }}
                          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex-1 sm:flex-initial min-w-[100px]"
                        >
                          <FiXCircle size={12} />
                          <span>Rechazar</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setShowDetailModal(false)
                        setSelectedQuote(null)
                      }}
                      className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow flex-1 sm:flex-initial min-w-[100px]"
                    >
                      <FiX size={12} />
                      <span>Cerrar</span>
                    </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Previsualización PDF */}
        {showPdfModal && pdfPreviewUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-5xl max-h-[95vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-xl font-bold text-gray-900">Vista Previa del PDF</h3>
                <div className="flex gap-2">
                  <a
                    href={pdfPreviewUrl}
                    download={`cotizacion-${selectedQuote?.quoteNumber || selectedQuote?.id}.pdf`}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold flex items-center gap-2"
                  >
                    <FiDownload size={18} />
                    Descargar
                  </a>
                  <button
                    onClick={() => {
                      setShowPdfModal(false)
                      if (pdfPreviewUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(pdfPreviewUrl)
                      }
                      setPdfPreviewUrl(null)
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors font-semibold"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-gray-100 p-4">
                <iframe
                  src={`${pdfPreviewUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  type="application/pdf"
                  className="w-full h-full min-h-[600px] border-0"
                  title="Vista previa del PDF"
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal para Aprobar/Rechazar */}
        {showActionModal && selectedQuote && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden animate-slideUp">
              {/* Header con gradiente */}
              <div className={`bg-gradient-to-r ${modalAction === 'approve' ? 'from-green-600 via-emerald-600 to-teal-600' : 'from-red-600 via-rose-600 to-pink-600'} px-6 py-4 flex items-center gap-3`}>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center ring-2 ring-white/30">
                  {modalAction === 'approve' ? (
                    <FiCheckCircle className="text-white" size={24} />
                  ) : (
                    <FiXCircle className="text-white" size={24} />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {modalAction === 'approve' ? 'Aprobar Cotización' : 'Rechazar Cotización'}
                  </h2>
                  <p className="text-white/80 text-sm">
                    {modalAction === 'approve' 
                      ? 'Completa la información para aprobar esta cotización'
                      : 'Indica la razón del rechazo'}
                  </p>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
                {modalAction === 'approve' && (
                  <div className="space-y-5">
                    {/* Campo de Correo del Cliente */}
                    <div className="bg-white rounded-lg border-2 border-blue-200 shadow-sm p-4">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FiMail className="text-blue-600" size={16} />
                        </div>
                        <span>Correo del Cliente *</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiMail className="text-gray-400" size={18} />
                        </div>
                        <input
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="cliente@ejemplo.com"
                          required
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all"
                          style={{ color: '#111827' }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <FiInfo size={12} />
                        Correo al que se enviará la cotización cuando se autorice el despacho
                      </p>
                    </div>

                    {/* Campo de Tiempo de Entrega */}
                    <div className="bg-white rounded-lg border-2 border-purple-200 shadow-sm p-4">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <FiClock className="text-purple-600" size={16} />
                        </div>
                        <span>Tiempo de entrega estimado (días)</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiClock className="text-gray-400" size={18} />
                        </div>
                        <input
                          type="number"
                          min="1"
                          value={estimatedDelivery}
                          onChange={(e) => setEstimatedDelivery(e.target.value)}
                          placeholder="Ej: 5"
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 transition-all"
                          style={{ color: '#111827' }}
                        />
                      </div>
                    </div>

                    {/* Campo de Notas */}
                    <div className="bg-white rounded-lg border-2 border-indigo-200 shadow-sm p-4">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <FiFileText className="text-indigo-600" size={16} />
                        </div>
                        <span>Notas (opcional)</span>
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notas adicionales sobre la cotización, instrucciones especiales, etc..."
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 transition-all resize-none"
                        style={{ color: '#111827' }}
                      />
                    </div>

                    {/* Botones */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setShowActionModal(false)
                          setSelectedQuote(null)
                          setModalAction(null)
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all text-gray-700 font-medium shadow-sm hover:shadow"
                      >
                        <FiX size={18} />
                        Cancelar
                      </button>
                      <button
                        onClick={handleApprove}
                        disabled={processing}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition-all disabled:opacity-50 text-white font-semibold shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                      >
                        {processing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Procesando...
                          </>
                        ) : (
                          <>
                            <FiCheckCircle size={18} />
                            Aprobar Cotización
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

              {modalAction === 'reject' && (
                <div className="space-y-5">
                  <div className="bg-white rounded-lg border-2 border-red-200 shadow-sm p-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <FiAlertCircle className="text-red-600" size={16} />
                      </div>
                      <span>Razón del rechazo *</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Ingresa la razón por la cual rechazas esta cotización..."
                      rows={5}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 transition-all resize-none"
                      style={{ color: '#111827' }}
                    />
                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                      <FiInfo size={12} />
                      Esta información será visible para el cliente
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowActionModal(false)
                        setSelectedQuote(null)
                        setModalAction(null)
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all text-gray-700 font-medium shadow-sm hover:shadow"
                    >
                      <FiX size={18} />
                      Cancelar
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={processing || !rejectionReason.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 rounded-lg transition-all disabled:opacity-50 text-white font-semibold shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                    >
                      {processing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Procesando...
                        </>
                      ) : (
                        <>
                          <FiXCircle size={18} />
                          Rechazar Cotización
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notificaciones Toast */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => {
            const bgColor = notification.type === 'success' 
              ? 'bg-green-600' 
              : notification.type === 'error' 
              ? 'bg-red-600' 
              : 'bg-yellow-600'
            
            const icon = notification.type === 'success' 
              ? <FiCheckCircle size={20} />
              : notification.type === 'error'
              ? <FiXCircle size={20} />
              : <FiX size={20} />
            
            return (
              <div
                key={notification.id}
                className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 min-w-[300px] max-w-md animate-slide-in-right`}
                style={{
                  animation: 'slideInRight 0.3s ease-out'
                }}
              >
                {icon}
                <span className="flex-1 font-medium">{notification.message}</span>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>
            )
          })}
        </div>
      </CotizadorLayout>
    </>
  )
}
