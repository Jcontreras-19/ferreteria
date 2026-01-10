import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { 
  FiCheck, FiX, FiSearch, FiDownload, FiFileText, FiPackage, FiClock, FiUser, FiMail, FiPhone, 
  FiCalendar, FiEye, FiCheckCircle, FiXCircle, FiFilter, FiAlertCircle, FiInfo, FiChevronDown, FiChevronUp
} from 'react-icons/fi'
import * as XLSX from 'xlsx'

export default function AutorizarDespachos() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [documentType, setDocumentType] = useState('boleta')
  const [processing, setProcessing] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showDateFilters, setShowDateFilters] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      fetchQuotes()
    }
  }, [user])

  const showNotification = (message, type = 'success') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (res.ok) {
        const userData = await res.json()
        const adminRoles = ['admin', 'superadmin']
        if (!adminRoles.includes(userData.role)) {
          window.location.href = '/'
          return
        }
        setUser(userData)
      } else {
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Auth error:', error)
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }

  const fetchQuotes = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (dateFrom) {
        params.append('dateFrom', dateFrom)
      }
      if (dateTo) {
        params.append('dateTo', dateTo)
      }

      const res = await fetch(`/api/cotizaciones/autorizar?${params.toString()}`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setQuotes(data)
      } else {
        showNotification('Error al cargar cotizaciones', 'error')
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
      showNotification('Error al cargar cotizaciones', 'error')
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    if (user) {
      fetchQuotes()
    }
  }, [user, fetchQuotes])

  const getStockBadge = (quote) => {
    if (quote.allInStock) {
      return { text: 'En Stock', class: 'bg-green-100 text-green-800' }
    } else if (quote.someInStock) {
      return { text: 'Stock Parcial', class: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { text: 'Sin Stock', class: 'bg-red-100 text-red-800' }
    }
  }

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = searchQuery === '' ||
      quote.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.whatsapp?.includes(searchQuery) ||
      (quote.quoteNumber && quote.quoteNumber.toString().includes(searchQuery))
    
    return matchesSearch
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
        const url = URL.createObjectURL(blob)
        setPdfPreviewUrl(url)
        setShowPdfModal(true)
      } else {
        showNotification('Error al generar PDF', 'error')
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      showNotification('Error al generar PDF', 'error')
    }
  }

  const handleAuthorize = async () => {
    if (!selectedQuote) return

    setProcessing(true)
    try {
      const res = await fetch(`/api/cotizaciones/${selectedQuote.id}/autorizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ documentType }),
      })

      const data = await res.json()

      if (res.ok) {
        showNotification(data.message || 'Despacho autorizado exitosamente', 'success')
        setShowActionModal(false)
        setShowDetailModal(false)
        fetchQuotes()
      } else {
        showNotification(data.error || 'Error al autorizar despacho', 'error')
      }
    } catch (error) {
      console.error('Error authorizing dispatch:', error)
      showNotification('Error de red al autorizar despacho', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const openActionModal = (quote) => {
    setSelectedQuote(quote)
    setDocumentType('boleta')
    setShowActionModal(true)
  }

  const exportToExcel = () => {
    const data = filteredQuotes.map(quote => {
      let products = []
      try {
        products = quote.productsParsed || JSON.parse(quote.products || '[]')
      } catch (e) {
        products = []
      }
      return {
        'N° Cotización': quote.quoteNumber || 'N/A',
        'Cliente': quote.name,
        'Email': quote.email,
        'WhatsApp': quote.whatsapp,
        'Total': quote.total,
        'Productos': products.map(p => `${p.name} (x${p.quantity || 1})`).join(', '),
        'Stock Disponible': quote.allInStock ? 'Sí' : quote.someInStock ? 'Parcial' : 'No',
        'Tiempo Entrega (días)': quote.estimatedDelivery || 'N/A',
        'Notas': quote.notes || '',
        'Fecha Aprobación': new Date(quote.updatedAt).toLocaleDateString('es-PE'),
      }
    })

    const wb = XLSX.utils.book_new()
    const newWs = XLSX.utils.aoa_to_sheet([
      ['CORPORACIÓN GRC - REPORTE DE AUTORIZACIÓN DE DESPACHOS'],
      ['ISO 9001:2015'],
      [`Fecha de exportación: ${new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`],
      (dateFrom || dateTo) ? [`Período: ${dateFrom ? new Date(dateFrom).toLocaleDateString('es-PE') : 'Inicio'} - ${dateTo ? new Date(dateTo).toLocaleDateString('es-PE') : 'Hoy'}`] : [''],
      [`Total de cotizaciones: ${filteredQuotes.length}`],
      [''],
      Object.keys(data[0] || {}),
      ...data.map(row => Object.values(row))
    ])

    const colWidths = [
      { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 15 }
    ]
    newWs['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, newWs, 'Autorizaciones')
    const fileName = `autorizaciones-${dateFrom ? dateFrom.split('T')[0] : 'todas'}-${dateTo ? dateTo.split('T')[0] : new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
    showNotification('Excel exportado exitosamente', 'success')
  }

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPos = margin

      const blueColor = [37, 99, 235] // blue-600
      const darkBlue = [29, 78, 216] // blue-700

      doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2])
      doc.rect(0, 0, pageWidth, 30, 'F')

      const logoX = margin
      const logoY = 5
      const logoRadius = 10
      doc.setFillColor(blueColor[0], blueColor[1], blueColor[2])
      doc.circle(logoX + logoRadius, logoY + logoRadius, logoRadius, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('GRC', logoX + logoRadius, logoY + logoRadius + 2, { align: 'center' })

      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('CORPORACIÓN GRC', pageWidth - margin, 12, { align: 'right' })
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('Reporte de Autorización de Despachos', pageWidth - margin, 20, { align: 'right' })
      doc.setFontSize(8)
      doc.text('ISO 9001:2015', pageWidth - margin, 26, { align: 'right' })

      doc.setTextColor(0, 0, 0)
      yPos = 40

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

      const tableStartY = yPos
      doc.setFillColor(blueColor[0], blueColor[1], blueColor[2])
      doc.rect(margin, tableStartY - 8, pageWidth - (margin * 2), 8, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)

      colHeaders.forEach((header, idx) => {
        doc.text(header, colX[idx] + 2, tableStartY - 2)
        if (idx < colHeaders.length - 1) {
          doc.setDrawColor(255, 255, 255)
          doc.setLineWidth(0.2)
          doc.line(colX[idx + 1], tableStartY - 8, colX[idx + 1], tableStartY)
        }
      })

      doc.setTextColor(0, 0, 0)
      yPos = tableStartY + 6

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)

      filteredQuotes.forEach((quote, index) => {
        if (yPos > pageHeight - 35) {
          doc.addPage()
          yPos = margin + 20
          doc.setFillColor(blueColor[0], blueColor[1], blueColor[2])
          doc.rect(margin, yPos - 8, pageWidth - (margin * 2), 8, 'F')
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

        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250)
          doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 7, 'F')
        }

        doc.setDrawColor(220, 220, 220)
        doc.setLineWidth(0.2)
        doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2)
        colX.forEach((x, idx) => {
          if (idx > 0) {
            doc.line(x, yPos - 5, x, yPos + 2)
          }
        })
        doc.line(margin, yPos - 5, margin, yPos + 2)
        doc.line(pageWidth - margin, yPos - 5, pageWidth - margin, yPos + 2)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(String(index + 1), colX[0] + colWidths[0] / 2, yPos, { align: 'center' })
        doc.text(String(quote.quoteNumber || 'N/A'), colX[1] + 2, yPos)
        doc.text(new Date(quote.createdAt).toLocaleDateString('es-PE'), colX[2] + 2, yPos)
        const clientName = (quote.name || 'N/A').substring(0, 25)
        doc.text(clientName, colX[3] + 2, yPos)
        const email = quote.email || 'N/A'
        doc.setFontSize(7.5)
        doc.text(email, colX[4] + 2, yPos)
        doc.setFontSize(8)
        doc.text('Pendiente', colX[5] + 2, yPos)
        doc.setFont('helvetica', 'bold')
        doc.text(`S/. ${quote.total?.toFixed(2) || '0.00'}`, colX[6] + colWidths[6] - 2, yPos, { align: 'right' })
        doc.setFont('helvetica', 'normal')

        yPos += 7
      })

      const footerY = pageHeight - 20
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text('Corporación GRC - Av. José Gálvez 1322 Dpto. 302 La Perla - Callao', margin, footerY)
      doc.text('Email: corporaciongrc@gmail.com | WhatsApp: (511) 957 216 908', margin, footerY + 5)
      doc.text(`Página ${doc.internal.getNumberOfPages()}`, pageWidth - margin, footerY + 5, { align: 'right' })

      const pdfBlob = doc.output('blob')
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-autorizaciones-${dateFrom ? dateFrom.split('T')[0] : 'todas'}-${dateTo ? dateTo.split('T')[0] : new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showNotification('PDF exportado exitosamente', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showNotification('Error al generar reporte PDF', 'error')
    }
  }

  if (loading || !user) {
    return (
      <AdminLayout user={user} loading={loading}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const stats = {
    total: quotes.length,
    withStock: quotes.filter(q => q.allInStock).length,
    partialStock: quotes.filter(q => q.someInStock && !q.allInStock).length,
    noStock: quotes.filter(q => !q.allInStock && !q.someInStock).length,
  }

  return (
    <AdminLayout user={user} loading={false}>
      <Head>
        <title>Autorizar Despachos - Panel Admin</title>
      </Head>

      <div className="space-y-4">
        {/* Header Compacto con Estadísticas */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">AUTORIZAR DESPACHOS</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                {quotes.length} cotización{quotes.length !== 1 ? 'es' : ''} pendiente{quotes.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Estadísticas Compactas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-2 border-blue-300 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-blue-800 text-xs font-semibold">Pendientes</span>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                  <FiClock className="text-white" size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-300 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-green-800 text-xs font-semibold">Con Stock</span>
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                  <FiCheckCircle className="text-white" size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-green-900">{stats.withStock}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 border-2 border-yellow-300 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-yellow-800 text-xs font-semibold">Stock Parcial</span>
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-md">
                  <FiAlertCircle className="text-white" size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-yellow-900">{stats.partialStock}</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border-2 border-red-300 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-red-800 text-xs font-semibold">Sin Stock</span>
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                  <FiXCircle className="text-white" size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-red-900">{stats.noStock}</p>
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
              </div>

              {/* Búsqueda */}
              <div className="relative flex-1 min-w-[200px]">
                <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Buscar por cliente, email, WhatsApp o número..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                  style={{ color: '#111827' }}
                />
              </div>

              {/* Botón de Fechas */}
              <button
                onClick={() => setShowDateFilters(!showDateFilters)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  showDateFilters 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiCalendar size={14} />
                <span>Fechas</span>
                {showDateFilters ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
              </button>

              {/* Botones de Exportar */}
              <button
                onClick={exportToPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
              >
                <FiFileText size={14} />
                <span>PDF</span>
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
              >
                <FiDownload size={14} />
                <span>Excel</span>
              </button>
            </div>

            {/* Filtros de Fecha - Colapsable */}
            {showDateFilters && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
                    <div className="relative">
                      <FiCalendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-blue-600" size={14} />
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                        style={{ color: '#111827' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
                    <div className="relative">
                      <FiCalendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-blue-600" size={14} />
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                        style={{ color: '#111827' }}
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setDateFrom('')
                        setDateTo('')
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-xs font-medium transition-colors flex items-center justify-center gap-1"
                    >
                      <FiX size={14} />
                      <span>Limpiar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Contador de resultados */}
            <div className="flex items-center justify-between text-xs text-gray-600 pt-2 mt-2 border-t border-gray-200">
              <span>Mostrando {filteredQuotes.length} de {quotes.length} cotizaciones</span>
            </div>
          </div>
        </div>

        {/* Cards de Cotizaciones - 4 columnas */}
        {filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FiCheckCircle className="mx-auto text-gray-400" size={48} />
            <p className="mt-4 text-gray-600 text-lg">No hay cotizaciones pendientes de autorización</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredQuotes.map((quote) => {
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
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold">
                        #{quote.quoteNumber || 'N/A'}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${stockBadge.class}`}>
                        {stockBadge.text}
                      </span>
                    </div>
                    <div className="text-2xl font-bold">
                      S/. {quote.total?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-xs text-blue-100 mt-1">
                      {new Date(quote.createdAt).toLocaleDateString('es-PE')}
                    </div>
                  </div>

                  {/* Contenido de la Card */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center space-x-2 text-gray-700 text-sm mb-1">
                        <FiUser size={14} className="text-gray-400" />
                        <span className="font-semibold">{quote.name}</span>
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
                      <button
                        onClick={() => openActionModal(quote)}
                        className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors shadow-sm"
                      >
                        <FiCheckCircle size={16} />
                        <span>AUTORIZAR</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalles */}
      {showDetailModal && selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full my-8 shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    Cotización #{selectedQuote.quoteNumber || 'N/A'}
                  </h2>
                  <p className="text-blue-100 mt-1">{selectedQuote.name}</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Cliente</label>
                  <p className="text-gray-900">{selectedQuote.name}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Email</label>
                  <p className="text-gray-900">{selectedQuote.email}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">WhatsApp</label>
                  <p className="text-gray-900">{selectedQuote.whatsapp}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Total</label>
                  <p className="text-green-600 font-bold text-lg">S/. {selectedQuote.total?.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Productos</h3>
                <div className="space-y-2">
                  {(() => {
                    try {
                      const productsData = typeof selectedQuote.products === 'string'
                        ? JSON.parse(selectedQuote.products)
                        : selectedQuote.products
                      const products = productsData.items || productsData

                      return products.map((product, idx) => {
                        const stock = product.stock || 0
                        const quantity = product.quantity || 1
                        const hasStock = stock >= quantity
                        const stockStatus = hasStock ? 'Disponible' : stock > 0 ? `Stock Insuficiente (Faltan ${quantity - stock})` : 'Sin Stock'
                        const stockClass = hasStock 
                          ? 'bg-green-100 text-green-800 border-green-300' 
                          : stock > 0
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          : 'bg-red-100 text-red-800 border-red-300'

                        return (
                          <div key={idx} className={`border-2 rounded-lg p-4 ${stockClass}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">{product.name || 'Sin nombre'}</div>
                                <div className="text-sm text-gray-600 mt-1">
                                  Cantidad: <span className="font-semibold">{quantity}</span> | 
                                  Precio: <span className="font-semibold">S/. {product.price?.toFixed(2) || '0.00'}</span> | 
                                  Subtotal: <span className="font-semibold text-green-600">S/. {((product.price || 0) * quantity).toFixed(2)}</span>
                                </div>
                                <div className="text-xs mt-2 font-medium">
                                  Stock disponible: {stock} | {stockStatus}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    } catch (e) {
                      return <p className="text-red-600">Error al cargar productos</p>
                    }
                  })()}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-between">
              <button
                onClick={() => handleViewPdf(selectedQuote)}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <FiFileText size={18} />
                <span>Ver PDF</span>
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    openActionModal(selectedQuote)
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Autorizar Despacho
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Autorización */}
      {showActionModal && selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white rounded-t-lg">
              <h3 className="text-xl font-bold">Autorizar Despacho</h3>
              <p className="text-green-100 text-sm mt-1">Cotización #{selectedQuote.quoteNumber || 'N/A'}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Documento
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                >
                  <option value="boleta">Boleta</option>
                  <option value="factura">Factura</option>
                </select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <FiAlertCircle className="text-yellow-600 mt-0.5" size={20} />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Al autorizar:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Se generará automáticamente la {documentType === 'factura' ? 'factura' : 'boleta'}</li>
                      <li>Se descontará el stock de los productos</li>
                      <li>La cotización cambiará a estado "Autorizada"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end space-x-2">
              <button
                onClick={() => setShowActionModal(false)}
                disabled={processing}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAuthorize}
                disabled={processing}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <FiCheck size={18} />
                    <span>Autorizar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de PDF */}
      {showPdfModal && pdfPreviewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold">Vista Previa del PDF</h3>
              <button
                onClick={() => {
                  setShowPdfModal(false)
                  URL.revokeObjectURL(pdfPreviewUrl)
                  setPdfPreviewUrl(null)
                }}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              <iframe
                src={pdfPreviewUrl}
                className="w-full"
                style={{ height: 'calc(90vh - 120px)', minHeight: '600px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Notificaciones */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 ${
              notification.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <FiCheckCircle size={20} />
            ) : (
              <FiX size={20} />
            )}
            <span>{notification.message}</span>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
