import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { 
  FiUser, FiMail, FiCalendar, FiFileText, FiSearch, FiChevronDown, FiChevronUp, 
  FiPhone, FiEdit2, FiSave, FiX, FiDollarSign, FiTrendingUp, FiUsers, FiDownload,
  FiGrid, FiList, FiEye, FiFilter
} from 'react-icons/fi'
import * as XLSX from 'xlsx'

export default function AdminClientes() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCustomer, setExpandedCustomer] = useState(null)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [editFormData, setEditFormData] = useState({ email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState('cards') // 'cards' or 'table'
  const [sortBy, setSortBy] = useState('name') // 'name', 'totalSpent', 'totalQuotes', 'date'

  useEffect(() => {
    checkAuth()
    fetchCustomers()
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

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/clientes')
      if (res.ok) {
        const data = await res.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(amount)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completada'
      case 'sent':
        return 'Enviada'
      case 'pending':
        return 'Pendiente'
      default:
        return status
    }
  }

  const handleEdit = (customer) => {
    setEditingCustomer(customer.id)
    setEditFormData({
      email: customer.email || '',
      phone: customer.phone || '',
    })
  }

  const handleCancelEdit = () => {
    setEditingCustomer(null)
    setEditFormData({ email: '', phone: '' })
  }

  const handleSaveEdit = async (customerId) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/clientes/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      })

      if (res.ok) {
        await fetchCustomers()
        setEditingCustomer(null)
        setEditFormData({ email: '', phone: '' })
      } else {
        const data = await res.json()
        alert(data.error || 'Error al actualizar cliente')
      }
    } catch (error) {
      console.error('Error updating customer:', error)
      alert('Error al actualizar cliente')
    } finally {
      setSaving(false)
    }
  }

  const filteredCustomers = customers
    .filter((customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'totalSpent':
          return (b.totalSpent || 0) - (a.totalSpent || 0)
        case 'totalQuotes':
          return (b.totalQuotes || 0) - (a.totalQuotes || 0)
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt)
        default:
          return a.name.localeCompare(b.name)
      }
    })

  const stats = {
    total: customers.length,
    withQuotes: customers.filter(c => (c.totalQuotes || 0) > 0).length,
    totalSpent: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
    totalQuotes: customers.reduce((sum, c) => sum + (c.totalQuotes || 0), 0),
    avgSpent: customers.length > 0 
      ? customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0) / customers.length 
      : 0,
  }

  const exportToExcel = () => {
    const data = filteredCustomers.map(customer => ({
      'ID': customer.id.slice(0, 8),
      'Nombre': customer.name,
      'Email': customer.email,
      'Teléfono': customer.phone || 'N/A',
      'Fecha Registro': formatDate(customer.createdAt),
      'Total Cotizaciones': customer.totalQuotes || 0,
      'Total Gastado': customer.totalSpent || 0,
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, `clientes-${new Date().toISOString().split('T')[0]}.xlsx`)
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
        <title>Clientes - Panel Administrador</title>
      </Head>
      <AdminLayout user={user}>
        <div className="space-y-6">
          {/* Header Compacto con Estadísticas */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">GESTIÓN DE CLIENTES</h1>
                <p className="text-gray-600 text-xs mt-0.5">
                  {customers.length} cliente{customers.length !== 1 ? 's' : ''} en total
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

            {/* Estadísticas Compactas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-2 border-blue-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-blue-800 text-xs font-semibold">Total</span>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                    <FiUsers className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border-2 border-purple-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-purple-800 text-xs font-semibold">Con Cotizaciones</span>
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                    <FiFileText className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-purple-900">{stats.withQuotes}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-green-800 text-xs font-semibold">Total Ventas</span>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                    <FiDollarSign className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-lg font-bold text-green-900">S/. {stats.totalSpent.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 border-2 border-indigo-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-indigo-800 text-xs font-semibold">Promedio</span>
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center shadow-md">
                    <FiTrendingUp className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-lg font-bold text-indigo-900">S/. {stats.avgSpent.toFixed(2)}</p>
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
                  {searchQuery && (
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
                    placeholder="Buscar clientes por nombre, email o teléfono..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                    style={{ color: '#111827' }}
                  />
                </div>

                {/* Ordenar */}
                <div className="min-w-[150px]">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                    style={{ color: '#111827' }}
                  >
                    <option value="name">Ordenar por Nombre</option>
                    <option value="totalSpent">Ordenar por Total Gastado</option>
                    <option value="totalQuotes">Ordenar por Cotizaciones</option>
                    <option value="date">Ordenar por Fecha</option>
                  </select>
                </div>

                {/* Botón de Exportar */}
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiDownload size={14} />
                  <span>Excel</span>
                </button>
              </div>

              {/* Contador de resultados */}
              <div className="flex items-center justify-between text-xs text-gray-600 pt-2 mt-2 border-t border-gray-200">
                <span>Mostrando {filteredCustomers.length} de {customers.length} clientes</span>
              </div>
            </div>
          </div>

          {/* Vista de Cards o Tabla */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.length === 0 ? (
                <div className="col-span-full bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                  <FiUsers className="mx-auto text-gray-400" size={48} />
                  <p className="mt-4 text-gray-600 text-lg">
                    {searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                  </p>
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <div key={customer.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden group">
                    {/* Header de la Card */}
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/30">
                          <span className="text-white font-bold text-xl">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg truncate">{customer.name}</h3>
                          <p className="text-xs text-purple-100 font-mono">ID: {customer.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Contenido de la Card */}
                    <div className="p-5 space-y-4">
                      <div className="space-y-2">
                        {editingCustomer === customer.id ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <FiMail size={14} className="text-gray-400" />
                              <input
                                type="email"
                                value={editFormData.email}
                                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                                placeholder="Email"
                                style={{ color: '#111827' }}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <FiPhone size={14} className="text-gray-400" />
                              <input
                                type="tel"
                                value={editFormData.phone}
                                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                                placeholder="Teléfono"
                                style={{ color: '#111827' }}
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={() => handleSaveEdit(customer.id)}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                              >
                                <FiSave size={14} />
                                Guardar
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="flex-1 flex items-center justify-center gap-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                              >
                                <FiX size={14} />
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <FiMail size={16} className="text-gray-400" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                            {customer.phone ? (
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <FiPhone size={16} className="text-gray-400" />
                                <span>{customer.phone}</span>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 italic">Sin teléfono registrado</div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <FiCalendar size={14} className="text-gray-400" />
                              <span>{formatDate(customer.createdAt)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="border-t pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">Cotizaciones</span>
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                            customer.totalQuotes > 0
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-300'
                          }`}>
                            <FiFileText size={12} className="inline mr-1" />
                            {customer.totalQuotes || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">Total Gastado</span>
                          <span className={`text-base font-bold ${
                            customer.totalSpent > 0 ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {formatCurrency(customer.totalSpent || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      {editingCustomer !== customer.id && (
                        <div className="flex flex-col gap-2 pt-3 border-t">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition-colors font-medium"
                          >
                            <FiEdit2 size={16} />
                            <span>EDITAR CONTACTO</span>
                          </button>
                          <button
                            onClick={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors font-medium"
                          >
                            {expandedCustomer === customer.id ? (
                              <>
                                <FiChevronUp size={16} />
                                <span>OCULTAR HISTORIAL</span>
                              </>
                            ) : (
                              <>
                                <FiChevronDown size={16} />
                                <span>VER HISTORIAL</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Historial Expandido */}
                    {expandedCustomer === customer.id && customer.quotes && customer.quotes.length > 0 && (
                      <div className="border-t bg-gradient-to-br from-purple-50 to-indigo-50 p-5">
                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <FiFileText size={16} className="text-purple-600" />
                          Historial de Cotizaciones
                          <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">
                            {customer.quotes.length}
                          </span>
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {customer.quotes.map((quote) => (
                            <div
                              key={quote.id}
                              className="bg-white rounded-lg p-3 border border-gray-200 hover:border-purple-300 shadow-sm hover:shadow transition-all"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-gray-100 text-gray-700 rounded border border-gray-300">
                                    #{quote.id.slice(0, 8).toUpperCase()}
                                  </span>
                                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getStatusColor(quote.status)}`}>
                                    {getStatusLabel(quote.status)}
                                  </span>
                                </div>
                                <span className="text-sm font-bold text-green-600">
                                  {formatCurrency(quote.total)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                                <FiCalendar size={12} className="text-gray-400" />
                                <span>{formatDate(quote.createdAt)}</span>
                              </div>
                              <a
                                href={`/api/cotizaciones/${quote.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors"
                              >
                                <FiEye size={12} />
                                Ver PDF
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {expandedCustomer === customer.id && (!customer.quotes || customer.quotes.length === 0) && (
                      <div className="border-t bg-gradient-to-br from-gray-50 to-purple-50 p-8 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-200 rounded-full mb-3">
                          <FiFileText size={24} className="text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm font-medium">
                          Este cliente aún no ha realizado cotizaciones
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Vista de Tabla */
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
                          <FiCalendar size={14} />
                          Fecha Registro
                        </div>
                      </th>
                      <th className="px-5 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                        <div className="flex items-center justify-center gap-2">
                          <FiFileText size={14} />
                          Cotizaciones
                        </div>
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                        Total Gastado
                      </th>
                      <th className="px-5 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCustomers.map((customer, index) => (
                      <tr key={customer.id} className={`transition-colors ${
                        index % 2 === 0 
                          ? 'bg-white hover:bg-blue-50' 
                          : 'bg-gray-50 hover:bg-blue-50'
                      }`}>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mr-3 shadow-md ring-2 ring-purple-200">
                              <span className="text-white font-bold text-lg">
                                {customer.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{customer.name}</div>
                              <div className="text-xs text-gray-500 font-mono">ID: {customer.id.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {editingCustomer === customer.id ? (
                            <div className="space-y-2">
                              <input
                                type="email"
                                value={editFormData.email}
                                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                                placeholder="Email"
                                style={{ color: '#111827' }}
                              />
                              <input
                                type="tel"
                                value={editFormData.phone}
                                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                                placeholder="Teléfono"
                                style={{ color: '#111827' }}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveEdit(customer.id)}
                                  disabled={saving}
                                  className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1"
                                >
                                  <FiSave size={12} />
                                  Guardar
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1"
                                >
                                  <FiX size={12} />
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="text-sm text-gray-900 flex items-center gap-2">
                                <FiMail size={14} className="text-gray-400" />
                                {customer.email}
                              </div>
                              {customer.phone && (
                                <div className="text-sm text-gray-600 flex items-center gap-2">
                                  <FiPhone size={14} className="text-gray-400" />
                                  {customer.phone}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 flex items-center gap-2">
                            <FiCalendar size={14} className="text-gray-400" />
                            {formatDate(customer.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-3 py-1.5 text-sm font-bold rounded-full ${
                            customer.totalQuotes > 0
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-300'
                          }`}>
                            <FiFileText size={14} className="mr-1.5" />
                            {customer.totalQuotes || 0}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right">
                          <div className={`text-base font-bold ${
                            customer.totalSpent > 0 ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {formatCurrency(customer.totalSpent || 0)}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            {editingCustomer !== customer.id && (
                              <button
                                onClick={() => handleEdit(customer)}
                                className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-all"
                                title="Editar contacto"
                              >
                                <FiEdit2 size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
                              className="px-3 py-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-all flex items-center gap-1.5 font-medium"
                            >
                              {expandedCustomer === customer.id ? (
                                <>
                                  <FiChevronUp size={18} />
                                  <span className="text-sm">Ocultar</span>
                                </>
                              ) : (
                                <>
                                  <FiChevronDown size={18} />
                                  <span className="text-sm">Ver más</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Historial Expandido en Vista de Tabla */}
          {viewMode === 'table' && expandedCustomer && filteredCustomers.find(c => c.id === expandedCustomer)?.quotes && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiFileText size={20} className="text-purple-600" />
                Historial de Cotizaciones - {filteredCustomers.find(c => c.id === expandedCustomer)?.name}
              </h3>
              <div className="grid gap-3">
                {filteredCustomers.find(c => c.id === expandedCustomer)?.quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 text-xs font-mono font-bold bg-white text-gray-700 rounded-lg border border-gray-300">
                          #{quote.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${getStatusColor(quote.status)}`}>
                          {getStatusLabel(quote.status)}
                        </span>
                        <span className="text-sm text-gray-600">
                          {formatDate(quote.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-green-600">
                          {formatCurrency(quote.total)}
                        </span>
                        <a
                          href={`/api/cotizaciones/${quote.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
                        >
                          Ver PDF
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  )
}
