import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { 
  FiCheck, FiX, FiSearch, FiDownload, FiFileText, FiPackage, FiClock, FiUser, FiMail, FiPhone, 
  FiCalendar, FiEye, FiCheckCircle, FiXCircle, FiFilter, FiAlertCircle, FiInfo, FiPrinter, FiChevronDown, FiChevronUp
} from 'react-icons/fi'
import * as XLSX from 'xlsx'

export default function BoletasFacturas() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all') // all, boleta, factura
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
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
      params.append('status', 'authorized')
      if (dateFrom) {
        params.append('dateFrom', dateFrom)
      }
      if (dateTo) {
        params.append('dateTo', dateTo)
      }

      const res = await fetch(`/api/cotizaciones/autorizadas?${params.toString()}`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setQuotes(data)
      } else {
        showNotification('Error al cargar boletas/facturas', 'error')
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
      showNotification('Error al cargar boletas/facturas', 'error')
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    if (user) {
      fetchQuotes()
    }
  }, [user, fetchQuotes])

  const showNotification = (message, type = 'success') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = searchQuery === '' ||
      quote.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.whatsapp?.includes(searchQuery) ||
      (quote.quoteNumber && quote.quoteNumber.toString().includes(searchQuery)) ||
      (quote.documentNumber && quote.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesDocumentType = documentTypeFilter === 'all' || 
      (documentTypeFilter === 'boleta' && quote.documentType === 'boleta') ||
      (documentTypeFilter === 'factura' && quote.documentType === 'factura')
    
    return matchesSearch && matchesDocumentType
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

  const handleDownloadPdf = async (quote) => {
    try {
      const res = await fetch(`/api/cotizaciones/${quote.id}/pdf`, {
        credentials: 'include',
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${quote.documentType === 'factura' ? 'Factura' : 'Boleta'}-${quote.documentNumber || quote.quoteNumber || 'N/A'}.pdf`
        document.body.appendChild(a)
        a.click()
        URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showNotification('PDF descargado exitosamente', 'success')
      } else {
        showNotification('Error al descargar PDF', 'error')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      showNotification('Error al descargar PDF', 'error')
    }
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
        'Tipo Documento': quote.documentType === 'factura' ? 'Factura' : 'Boleta',
        'N° Documento': quote.documentNumber || 'N/A',
        'Cliente': quote.name,
        'Email': quote.email,
        'WhatsApp': quote.whatsapp,
        'Total': quote.total,
        'Productos': products.map(p => `${p.name} (x${p.quantity || 1})`).join(', '),
        'Fecha Autorización': quote.authorizedAt ? new Date(quote.authorizedAt).toLocaleDateString('es-PE') : 'N/A',
        'Fecha Cotización': new Date(quote.createdAt).toLocaleDateString('es-PE'),
      }
    })

    const wb = XLSX.utils.book_new()
    const newWs = XLSX.utils.aoa_to_sheet([
      ['CORPORACIÓN GRC - REPORTE DE BOLETAS Y FACTURAS'],
      ['ISO 9001:2015'],
      [`Fecha de exportación: ${new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`],
      (dateFrom || dateTo) ? [`Período: ${dateFrom ? new Date(dateFrom).toLocaleDateString('es-PE') : 'Inicio'} - ${dateTo ? new Date(dateTo).toLocaleDateString('es-PE') : 'Hoy'}`] : [''],
      [`Total de documentos: ${filteredQuotes.length}`],
      [''],
      Object.keys(data[0] || {}),
      ...data.map(row => Object.values(row))
    ])

    const colWidths = [
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 15 }
    ]
    newWs['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, newWs, 'Boletas y Facturas')
    const fileName = `boletas-facturas-${dateFrom ? dateFrom.split('T')[0] : 'todas'}-${dateTo ? dateTo.split('T')[0] : new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
    showNotification('Excel exportado exitosamente', 'success')
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
    boletas: quotes.filter(q => q.documentType === 'boleta').length,
    facturas: quotes.filter(q => q.documentType === 'factura').length,
    hoy: quotes.filter(q => {
      const authDate = q.authorizedAt ? new Date(q.authorizedAt) : null
      return authDate && authDate.toDateString() === new Date().toDateString()
    }).length,
  }

  return (
    <AdminLayout user={user} loading={false}>
      <Head>
        <title>Boletas y Facturas - Panel Admin</title>
      </Head>

      <div className="space-y-4">
        {/* Header Compacto con Estadísticas */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">BOLETAS Y FACTURAS</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                {quotes.length} documento{quotes.length !== 1 ? 's' : ''} en total
              </p>
            </div>
          </div>

          {/* Estadísticas Compactas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border-2 border-purple-300 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-purple-800 text-xs font-semibold">Total</span>
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                  <FiFileText className="text-white" size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-900">{stats.total}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-2 border-blue-300 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-blue-800 text-xs font-semibold">Boletas</span>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                  <FiFileText className="text-white" size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.boletas}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-300 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-green-800 text-xs font-semibold">Facturas</span>
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                  <FiFileText className="text-white" size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-green-900">{stats.facturas}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border-2 border-orange-300 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-orange-800 text-xs font-semibold">Hoy</span>
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
                  <FiClock className="text-white" size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-orange-900">{stats.hoy}</p>
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
                  placeholder="Buscar por cliente, email, número de documento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                  style={{ color: '#111827' }}
                />
              </div>

              {/* Tipo de Documento */}
              <div className="min-w-[120px]">
                <select
                  value={documentTypeFilter}
                  onChange={(e) => setDocumentTypeFilter(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                  style={{ color: '#111827' }}
                >
                  <option value="all">Todos</option>
                  <option value="boleta">Boletas</option>
                  <option value="factura">Facturas</option>
                </select>
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

              {/* Botón de Exportar */}
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
              <span>Mostrando {filteredQuotes.length} de {quotes.length} documentos</span>
            </div>
          </div>
        </div>

        {/* Cards de Boletas/Facturas - 4 columnas */}
        {filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FiFileText className="mx-auto text-gray-400" size={48} />
            <p className="mt-4 text-gray-600 text-lg">No hay boletas o facturas generadas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredQuotes.map((quote) => {
              let products = []
              try {
                products = quote.productsParsed || JSON.parse(quote.products || '[]')
              } catch (e) {
                products = []
              }

              const isFactura = quote.documentType === 'factura'
              const bgColor = isFactura ? 'from-green-600 to-green-700' : 'from-blue-600 to-blue-700'

              return (
                <div key={quote.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200">
                  {/* Header de la Card */}
                  <div className={`bg-gradient-to-br ${bgColor} p-4 text-white`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold">
                        {isFactura ? 'F' : 'B'}-{quote.documentNumber?.split('-').pop() || 'N/A'}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-white/20">
                        {isFactura ? 'Factura' : 'Boleta'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold">
                      S/. {quote.total?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-xs text-white/80 mt-1">
                      Cotización #{quote.quoteNumber || 'N/A'}
                    </div>
                    <div className="text-xs text-white/80">
                      {quote.authorizedAt ? new Date(quote.authorizedAt).toLocaleDateString('es-PE') : 'N/A'}
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
                        className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition-colors shadow-sm"
                      >
                        <FiEye size={16} />
                        <span>VER DETALLES</span>
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleViewPdf(quote)}
                          className="flex items-center justify-center space-x-1 bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded-lg text-xs transition-colors shadow-sm"
                        >
                          <FiEye size={14} />
                          <span>VER PDF</span>
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(quote)}
                          className="flex items-center justify-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-2 rounded-lg text-xs transition-colors shadow-sm"
                        >
                          <FiDownload size={14} />
                          <span>DESCARGAR</span>
                        </button>
                      </div>
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
            <div className={`bg-gradient-to-r ${selectedQuote.documentType === 'factura' ? 'from-green-600 to-green-700' : 'from-blue-600 to-blue-700'} p-6 text-white rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedQuote.documentType === 'factura' ? 'Factura' : 'Boleta'} {selectedQuote.documentNumber || 'N/A'}
                  </h2>
                  <p className="text-white/80 mt-1">Cotización #{selectedQuote.quoteNumber || 'N/A'} - {selectedQuote.name}</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-white hover:text-white/80 transition-colors"
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
                <div>
                  <label className="text-sm font-semibold text-gray-700">Fecha de Autorización</label>
                  <p className="text-gray-900">
                    {selectedQuote.authorizedAt ? new Date(selectedQuote.authorizedAt).toLocaleDateString('es-PE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Número de Documento</label>
                  <p className="text-gray-900 font-mono">{selectedQuote.documentNumber || 'N/A'}</p>
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

                      return products.map((product, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{product.name || 'Sin nombre'}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                Cantidad: <span className="font-semibold">{product.quantity || 1}</span> | 
                                Precio: <span className="font-semibold">S/. {product.price?.toFixed(2) || '0.00'}</span> | 
                                Subtotal: <span className="font-semibold text-green-600">S/. {((product.price || 0) * (product.quantity || 1)).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
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
                <FiEye size={18} />
                <span>Ver PDF</span>
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleDownloadPdf(selectedQuote)}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <FiDownload size={18} />
                  <span>Descargar PDF</span>
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cerrar
                </button>
              </div>
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
