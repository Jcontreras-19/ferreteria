import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { 
  FiEye, FiCheck, FiX, FiDownload, FiFileText, FiSearch, FiFilter, FiCalendar, 
  FiUser, FiMail, FiPhone, FiDollarSign, FiTrendingUp, FiClock, FiCheckCircle,
  FiChevronDown, FiChevronUp, FiGrid, FiList, FiPrinter, FiPackage, FiShoppingCart,
  FiTag, FiExternalLink, FiXCircle
} from 'react-icons/fi'
import * as XLSX from 'xlsx'

export default function AdminCotizaciones() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState([])
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDateFilters, setShowDateFilters] = useState(false)
  const [viewMode, setViewMode] = useState('table') // 'cards' or 'table'

  useEffect(() => {
    checkAuth()
    fetchQuotes()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (res.ok) {
        const userData = await res.json()
        const adminRoles = ['admin', 'superadmin', 'editor', 'viewer']
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

  const fetchQuotes = async () => {
    try {
      const res = await fetch('/api/cotizaciones')
      if (res.ok) {
        const data = await res.json()
        setQuotes(data)
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
    }
  }

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = searchQuery === '' ||
      quote.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.whatsapp?.includes(searchQuery) ||
      (quote.quoteNumber && quote.quoteNumber.toString().includes(searchQuery))
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter
    
    const matchesDate = (!dateFrom && !dateTo) || (
      (!dateFrom || new Date(quote.createdAt) >= new Date(dateFrom)) &&
      (!dateTo || new Date(quote.createdAt) <= new Date(dateTo + 'T23:59:59'))
    )
    
    return matchesSearch && matchesStatus && matchesDate
  })

  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    completed: quotes.filter(q => q.status === 'completed').length,
    totalAmount: quotes.reduce((sum, q) => sum + (q.total || 0), 0),
    avgAmount: quotes.length > 0 ? quotes.reduce((sum, q) => sum + (q.total || 0), 0) / quotes.length : 0,
  }

  const handleViewQuote = (quote) => {
    try {
      const products = typeof quote.products === 'string' ? JSON.parse(quote.products) : quote.products
      const items = products.items || products
      setSelectedQuote({ ...quote, products: items })
      setShowModal(true)
    } catch (error) {
      console.error('Error parsing products:', error)
      setSelectedQuote({ ...quote, products: [] })
      setShowModal(true)
    }
  }

  const handleViewPdf = async (quote) => {
    try {
      const pdfUrl = `/api/cotizaciones/${quote.id}/pdf`
      setPdfUrl(pdfUrl)
      setShowPdfModal(true)
    } catch (error) {
      console.error('Error loading PDF:', error)
      alert('Error al cargar el PDF: ' + error.message)
    }
  }

  const handleDownloadPdf = async (quote) => {
    try {
      window.open(`/api/cotizaciones/${quote.id}/pdf?download=1`, '_blank')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Error al descargar el PDF')
    }
  }

  const exportToExcel = () => {
    const data = filteredQuotes.map(quote => {
      let products = []
      try {
        const parsed = typeof quote.products === 'string' ? JSON.parse(quote.products) : quote.products
        products = parsed.items || parsed
      } catch (e) {
        products = []
      }
      return {
        'N° Cotización': quote.quoteNumber || 'N/A',
        'Cliente': quote.name,
        'Email': quote.email,
        'WhatsApp': quote.whatsapp,
        'Total': quote.total,
        'Estado': getStatusLabel(quote.status),
        'Productos': products.map(p => `${p.name} (x${p.quantity || 1})`).join(', '),
        'Fecha': new Date(quote.createdAt).toLocaleDateString('es-PE'),
      }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, 'Cotizaciones')
    XLSX.writeFile(wb, `cotizaciones-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPos = margin

      // Encabezado
      doc.setFillColor(37, 99, 235) // blue-600
      doc.rect(0, 0, pageWidth, 30, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('CORPORACIÓN GRC', pageWidth - margin, 12, { align: 'right' })
      doc.setFontSize(14)
      doc.text('Reporte de Cotizaciones', pageWidth - margin, 20, { align: 'right' })
      doc.setFontSize(10)
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
      doc.text(`Total de cotizaciones: ${filteredQuotes.length}`, margin, yPos)
      yPos += 10

      // Tabla
      const colWidths = [20, 50, 35, 25, 30]
      const colHeaders = ['N°', 'Cliente', 'Email', 'Total', 'Estado']
      const colX = [
        margin,
        margin + colWidths[0],
        margin + colWidths[0] + colWidths[1],
        margin + colWidths[0] + colWidths[1] + colWidths[2],
        margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
      ]

      // Encabezado de tabla
      doc.setFillColor(59, 130, 246) // blue-500
      doc.rect(margin, yPos - 8, pageWidth - (margin * 2), 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      colHeaders.forEach((header, idx) => {
        doc.text(header, colX[idx] + 2, yPos - 2)
      })
      doc.setTextColor(0, 0, 0)
      yPos += 5

      // Filas
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      filteredQuotes.forEach((quote, index) => {
        if (yPos > pageHeight - 30) {
          doc.addPage()
          yPos = margin + 20
          doc.setFillColor(59, 130, 246)
          doc.rect(margin, yPos - 8, pageWidth - (margin * 2), 8, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          colHeaders.forEach((header, idx) => {
            doc.text(header, colX[idx] + 2, yPos - 2)
          })
          doc.setTextColor(0, 0, 0)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          yPos += 5
        }

        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245)
          doc.rect(margin, yPos - 4, pageWidth - (margin * 2), 6, 'F')
        }

        doc.text(String(index + 1), colX[0] + 2, yPos)
        doc.text(quote.name, colX[1] + 2, yPos)
        doc.setFontSize(7.5)
        doc.text(quote.email, colX[2] + 2, yPos)
        doc.setFontSize(8)
        doc.text(`S/. ${quote.total.toFixed(2)}`, colX[3] + 2, yPos)
        doc.text(getStatusLabel(quote.status), colX[4] + 2, yPos)
        yPos += 7
      })

      // Pie de página
      const footerY = pageHeight - 20
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text('Corporación GRC - Av. José Gálvez 1322 Dpto. 302 La Perla - Callao', margin, footerY)
      doc.text('Email: corporaciongrc@gmail.com | WhatsApp: (511) 957 216 908', margin, footerY + 5)

      const pdfBlob = doc.output('blob')
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-cotizaciones-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error al generar PDF')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-2 border-emerald-400 shadow-sm'
      case 'sent':
        return 'bg-cyan-50 text-cyan-700 border-2 border-cyan-400 shadow-sm'
      case 'approved':
        return 'bg-violet-50 text-violet-700 border-2 border-violet-400 shadow-sm'
      case 'authorized':
        return 'bg-blue-50 text-blue-700 border-2 border-blue-400 shadow-sm'
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-2 border-rose-400 shadow-sm'
      default:
        return 'bg-amber-50 text-amber-700 border-2 border-amber-400 shadow-sm'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle size={14} className="inline mr-1" />
      case 'sent':
        return <FiFileText size={14} className="inline mr-1" />
      case 'approved':
        return <FiCheckCircle size={14} className="inline mr-1" />
      case 'authorized':
        return <FiCheckCircle size={14} className="inline mr-1" />
      case 'rejected':
        return <FiX size={14} className="inline mr-1" />
      default:
        return <FiClock size={14} className="inline mr-1" />
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completada'
      case 'sent':
        return 'Enviada'
      case 'approved':
        return 'Aprobada'
      case 'authorized':
        return 'Autorizada'
      case 'rejected':
        return 'Rechazada'
      default:
        return 'Pendiente'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Cotizaciones - Panel Administrador</title>
      </Head>
      <AdminLayout user={user}>
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
                  className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title="Vista de cards"
                >
                  <FiGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title="Vista de tabla"
                >
                  <FiList size={16} />
                </button>
              </div>
            </div>

            {/* Estadísticas Compactas con Mejor Contraste */}
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
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-2 border-blue-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-blue-800 text-xs font-semibold">Enviadas</span>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                    <FiCheckCircle className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.sent}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-green-800 text-xs font-semibold">Completadas</span>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                    <FiTrendingUp className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
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
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
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
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                    style={{ color: '#111827' }}
                  />
                </div>

                {/* Estado */}
                <div className="min-w-[150px]">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                    style={{ color: '#111827' }}
                  >
                    <option value="all">Todos los estados</option>
                    <option value="pending">Pendientes</option>
                    <option value="sent">Enviadas</option>
                    <option value="approved">Aprobadas</option>
                    <option value="authorized">Autorizadas</option>
                    <option value="completed">Completadas</option>
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
                <div className="mt-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[150px]">
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
                    <div className="flex-1 min-w-[150px]">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredQuotes.length === 0 ? (
                <div className="col-span-full bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                  <FiFileText className="mx-auto text-gray-400" size={48} />
                  <p className="mt-4 text-gray-600 text-lg">No hay cotizaciones disponibles</p>
                </div>
              ) : (
                filteredQuotes.map((quote) => {
                  let products = []
                  try {
                    const parsed = typeof quote.products === 'string' ? JSON.parse(quote.products) : quote.products
                    products = parsed.items || parsed
                  } catch (e) {
                    products = []
                  }

                  return (
                    <div key={quote.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden group">
                      {/* Header de la Card */}
                      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-4 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-8 -mb-8"></div>
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/30">
                                <FiUser size={18} />
                              </div>
                              <div>
                                <h3 className="font-bold text-sm truncate max-w-[120px]">{quote.name}</h3>
                                <p className="text-xs text-blue-100 font-mono">#{quote.quoteNumber || quote.id.slice(0, 8)}</p>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-md ${getStatusColor(quote.status)} flex items-center gap-1`}>
                              {getStatusIcon(quote.status)}
                              {getStatusLabel(quote.status)}
                            </span>
                          </div>
                          <div className="text-2xl font-bold mt-2">
                            S/. {quote.total?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </div>

                      {/* Contenido de la Card */}
                      <div className="p-4 space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FiMail size={14} className="text-gray-400" />
                            <span className="truncate">{quote.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FiPhone size={14} className="text-gray-400" />
                            <span>{quote.whatsapp}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <FiCalendar size={12} className="text-gray-400" />
                            <span>{new Date(quote.createdAt).toLocaleDateString('es-PE', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                        </div>

                        <div className="border-t pt-2">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span className="font-semibold">Productos ({products.length})</span>
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

                        {/* Botones de Acción Mejorados */}
                        <div className="flex flex-col gap-2 pt-2 border-t">
                          <button
                            onClick={() => handleViewQuote(quote)}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-2.5 rounded-lg text-sm transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                          >
                            <div className="p-1 bg-white/20 rounded">
                              <FiEye size={14} />
                            </div>
                            <span>VER DETALLES</span>
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleViewPdf(quote)}
                              className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-2 py-2 rounded-lg text-xs transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                            >
                              <FiFileText size={14} />
                              <span>VER PDF</span>
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(quote)}
                              className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-2 py-2 rounded-lg text-xs transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                            >
                              <FiDownload size={14} />
                              <span>DESCARGAR</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            /* Vista de Tabla Mejorada */
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-600 to-indigo-700">
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
                              ? 'bg-white hover:bg-blue-50' 
                              : 'bg-gray-50 hover:bg-blue-50'
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
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
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleViewQuote(quote)}
                                className="group relative flex items-center justify-center w-8 h-8 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded transition-all duration-150"
                                title="Ver detalles"
                              >
                                <FiEye size={16} />
                              </button>
                              <button
                                onClick={() => handleViewPdf(quote)}
                                className="group relative flex items-center justify-center w-8 h-8 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded transition-all duration-150"
                                title="Ver PDF"
                              >
                                <FiFileText size={16} />
                              </button>
                              <button
                                onClick={() => handleDownloadPdf(quote)}
                                className="group relative flex items-center justify-center w-8 h-8 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded transition-all duration-150"
                                title="Descargar PDF"
                              >
                                <FiDownload size={16} />
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
        {showModal && selectedQuote && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-lg w-full max-w-6xl shadow-2xl border border-gray-300 flex flex-col animate-slideUp" style={{ maxHeight: '90vh' }}>
              {/* Header Compacto */}
              <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <FiFileText className="text-white" size={18} />
                  <div>
                    <h3 className="text-base font-bold text-white">Detalles de Cotización</h3>
                    <p className="text-gray-300 text-xs">
                      {selectedQuote.quoteNumber 
                        ? `Cotización ${String(selectedQuote.quoteNumber).padStart(7, '0')}`
                        : `#${selectedQuote.id.slice(0, 8).toUpperCase()}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setSelectedQuote(null)
                  }}
                  className="w-7 h-7 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center transition-colors"
                >
                  <FiX className="text-white" size={16} />
                </button>
              </div>

              {/* Contenido Compacto Sin Scroll */}
              <div className="p-4 bg-white overflow-hidden">
                <div className="grid grid-cols-12 gap-3">
                  {/* Columna Izquierda - Info Principal */}
                  <div className="col-span-12 lg:col-span-4 space-y-3">
                    {/* Total */}
                    <div className="bg-gray-50 rounded border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 font-medium">Total</span>
                        <FiDollarSign className="text-gray-400" size={14} />
                      </div>
                      <p className="text-xl font-bold text-gray-900">S/. {selectedQuote.total?.toFixed(2) || '0.00'}</p>
                    </div>

                    {/* Estado */}
                    <div className="bg-gray-50 rounded border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 font-medium">Estado</span>
                        <FiTag className="text-gray-400" size={14} />
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded ${getStatusColor(selectedQuote.status)}`}>
                        {getStatusIcon(selectedQuote.status)}
                        {getStatusLabel(selectedQuote.status)}
                      </span>
                    </div>

                    {/* Cliente */}
                    <div className="bg-gray-50 rounded border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 font-medium">Cliente</span>
                        <FiUser className="text-gray-400" size={14} />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{selectedQuote.name}</p>
                    </div>

                    {/* Contacto */}
                    <div className="bg-gray-50 rounded border border-gray-200 p-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FiMail className="text-gray-400" size={12} />
                          <p className="text-xs text-gray-900 truncate">{selectedQuote.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiPhone className="text-gray-400" size={12} />
                          <p className="text-xs text-gray-900">{selectedQuote.whatsapp}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha - Tabla de Productos Compacta */}
                  <div className="col-span-12 lg:col-span-8">
                    <div className="bg-gray-50 rounded border border-gray-200 overflow-hidden">
                      <div className="bg-gray-200 px-3 py-2 border-b border-gray-300">
                        <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1">
                          <FiPackage size={12} />
                          Productos ({selectedQuote.products?.length || 0})
                        </h4>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Producto</th>
                              <th className="px-2 py-1.5 text-center font-semibold text-gray-700">Cant.</th>
                              <th className="px-2 py-1.5 text-right font-semibold text-gray-700">P. Unit.</th>
                              <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedQuote.products?.map((product, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-2 py-1.5">
                                  <div className="font-medium text-gray-900">{product.name}</div>
                                  {product.description && (
                                    <div className="text-gray-500 text-xs mt-0.5 line-clamp-1">{product.description}</div>
                                  )}
                                </td>
                                <td className="px-2 py-1.5 text-center text-gray-900">{product.quantity}</td>
                                <td className="px-2 py-1.5 text-right text-gray-900">S/. {product.price?.toFixed(2) || '0.00'}</td>
                                <td className="px-2 py-1.5 text-right font-semibold text-gray-900">
                                  S/. {((product.price || 0) * (product.quantity || 0)).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                            <tr>
                              <td colSpan="3" className="px-2 py-1.5 text-right font-semibold text-gray-700">Total:</td>
                              <td className="px-2 py-1.5 text-right font-bold text-sm text-gray-900">
                                S/. {selectedQuote.total?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Compacto con Botones Rediseñados */}
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <FiClock size={12} />
                  <span>{new Date(selectedQuote.createdAt).toLocaleDateString('es-PE', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowModal(false)
                      handleViewPdf(selectedQuote)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 rounded text-xs font-medium transition-colors shadow-sm hover:shadow"
                  >
                    <FiFileText size={14} />
                    Ver PDF
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(selectedQuote)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 rounded text-xs font-medium transition-colors shadow-sm hover:shadow"
                  >
                    <FiDownload size={14} />
                    Descargar
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      setSelectedQuote(null)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-medium transition-colors"
                  >
                    <FiX size={14} />
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de PDF */}
        {showPdfModal && pdfUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-xl font-bold text-gray-900">Vista Previa del PDF</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadPdf(selectedQuote)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold flex items-center gap-2"
                  >
                    <FiDownload size={18} />
                    Descargar
                  </button>
                  <button
                    onClick={() => {
                      setShowPdfModal(false)
                      setPdfUrl(null)
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors font-semibold"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-gray-100 p-4">
                <embed
                  src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  type="application/pdf"
                  className="w-full h-full min-h-[600px]"
                  title="Vista previa del PDF"
                />
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  )
}
