import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { FiPlus, FiEdit, FiTrash2, FiShield, FiUsers, FiSearch, FiFilter, FiEye, FiGrid, FiList, FiDownload } from 'react-icons/fi'
import ExcelJS from 'exceljs'

const PERMISSIONS = [
  { id: 'view', label: 'Ver' },
  { id: 'create', label: 'Crear' },
  { id: 'edit', label: 'Editar' },
  { id: 'delete', label: 'Eliminar' },
  { id: 'approve', label: 'Aprobar' },
  { id: 'reject', label: 'Rechazar' },
]

const ROLES = [
  { value: 'viewer', label: 'Visualizador', defaultPermissions: ['view'] },
  { value: 'editor', label: 'Editor', defaultPermissions: ['view', 'create', 'edit'] },
  { value: 'cotizador', label: 'Cotizador', defaultPermissions: ['view', 'approve', 'reject'] },
  { value: 'admin', label: 'Administrador', defaultPermissions: ['view', 'create', 'edit', 'delete'] },
  { value: 'superadmin', label: 'Super Admin', defaultPermissions: ['view', 'create', 'edit', 'delete'] },
  { value: 'customer', label: 'Cliente', defaultPermissions: ['view'] },
]

// Función helper para obtener el label del rol
const getRoleLabel = (role) => {
  const roleConfig = ROLES.find((r) => r.value === role)
  return roleConfig ? roleConfig.label : role === 'customer' ? 'Cliente' : role
}

export default function AdminAdministradores() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    permissions: [],
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('table') // 'cards' or 'table'

  useEffect(() => {
    checkAuth()
    fetchUsers()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      if (res.ok) {
        const userData = await res.json()
        // Solo superadmin puede ver esta página
        if (userData.role !== 'superadmin') {
          window.location.href = '/admin'
          return
        }
        setUser(userData)
      } else {
        router.push('/login')
      }
    } catch (error) {
      router.push('/admin/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        // Filtrar solo Super Admin, Admin y Cotizadores (excluir clientes)
        const filteredData = data.filter(u => u.role !== 'customer')
        setUsers(filteredData)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleRoleChange = (role) => {
    const roleConfig = ROLES.find((r) => r.value === role)
    setFormData({
      ...formData,
      role,
      permissions: roleConfig ? roleConfig.defaultPermissions : [],
    })
  }

  const handlePermissionToggle = (permission) => {
    setFormData({
      ...formData,
      permissions: formData.permissions.includes(permission)
        ? formData.permissions.filter((p) => p !== permission)
        : [...formData.permissions, permission],
    })
  }

  const handleEdit = (userToEdit) => {
    setEditingUser(userToEdit)
    const permissions = userToEdit.permissions
      ? JSON.parse(userToEdit.permissions)
      : []
    setFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      password: '',
      role: userToEdit.role,
      permissions,
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este administrador?')) return

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchUsers()
      } else {
        alert('Error al eliminar administrador')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar administrador')
    }
  }

  const exportToExcel = async () => {
    try {
      // Filtrar usuarios (ya excluye clientes) y aplicar búsqueda
      const filteredUsers = users.filter(u => 
        u.role !== 'customer' && (
          !searchQuery || 
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )

      // Crear nuevo workbook
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Administradores')

      // Colores corporativos GRC (verde)
      const headerFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF16A34A' }
      }

      const headerFont = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      }

      const blackBorder = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }

      // Agregar logo/icono de la empresa
      worksheet.insertRow(1, [''])
      worksheet.mergeCells('A1:F1')
      const logoCell = worksheet.getCell('A1')
      logoCell.value = 'CORPORACIÓN GRC'
      logoCell.font = {
        name: 'Arial',
        size: 18,
        bold: true,
        color: { argb: 'FF16A34A' }
      }
      logoCell.alignment = { vertical: 'middle', horizontal: 'center' }
      logoCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0FDF4' }
      }
      logoCell.border = blackBorder
      worksheet.getRow(1).height = 35

      // Información de la empresa
      worksheet.insertRow(2, [''])
      worksheet.mergeCells('A2:F2')
      const companyCell = worksheet.getCell('A2')
      companyCell.value = 'SERVICIOS DE APOYO A LAS EMPRESAS - ISO 9001:2015'
      companyCell.font = {
        name: 'Arial',
        size: 10,
        bold: true,
        color: { argb: 'FF6B7280' }
      }
      companyCell.alignment = { vertical: 'middle', horizontal: 'center' }
      worksheet.getRow(2).height = 20

      // Fecha de exportación
      worksheet.insertRow(3, [''])
      worksheet.mergeCells('A3:F3')
      const dateCell = worksheet.getCell('A3')
      dateCell.value = `Fecha de exportación: ${new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`
      dateCell.font = {
        name: 'Arial',
        size: 9,
        bold: true,
        color: { argb: 'FF6B7280' }
      }
      dateCell.alignment = { vertical: 'middle', horizontal: 'center' }
      worksheet.getRow(3).height = 18

      // Fila vacía
      worksheet.insertRow(4, [''])
      worksheet.getRow(4).height = 5

      // Encabezados
      const headers = ['Nombre', 'Email', 'Teléfono', 'Rol', 'Permisos', 'Fecha de Creación']
      const headerRow = worksheet.addRow(headers)
      
      headerRow.eachCell((cell) => {
        cell.fill = headerFill
        cell.font = headerFont
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        cell.border = blackBorder
      })
      headerRow.height = 25

      // Función para formatear fecha
      const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-PE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      }

      // Agregar datos
      filteredUsers.forEach((user, index) => {
        const permissions = user.permissions ? JSON.parse(user.permissions) : []
        const permissionsText = permissions.length > 0 ? permissions.join(', ') : 'Sin permisos'
        
        const row = worksheet.addRow([
          user.name,
          user.email,
          user.phone || 'N/A',
          getRoleLabel(user.role),
          permissionsText,
          formatDate(user.createdAt)
        ])

        row.eachCell((cell, colNumber) => {
          cell.border = blackBorder
          cell.alignment = { 
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true 
          }
          cell.font = { name: 'Arial', size: 10 }

          if (index % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
          }
        })
        // Altura fija de 35 para todas las filas
        row.height = 35
      })

      // Ajustar ancho de columnas
      worksheet.getColumn(1).width = 30 // Nombre
      worksheet.getColumn(2).width = 30 // Email
      worksheet.getColumn(3).width = 15 // Teléfono
      worksheet.getColumn(4).width = 20 // Rol
      worksheet.getColumn(5).width = 40 // Permisos
      worksheet.getColumn(6).width = 25 // Fecha de Creación

      // Generar archivo
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `administradores-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al exportar a Excel:', error)
      alert('Error al generar el archivo Excel. Por favor intenta de nuevo.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'

      const payload = {
        ...formData,
        permissions: JSON.stringify(formData.permissions),
      }

      if (editingUser && !formData.password) {
        delete payload.password
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setShowModal(false)
        setEditingUser(null)
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'admin',
          permissions: [],
        })
        fetchUsers()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al guardar administrador')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar administrador')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch (error) {
      console.error('Error logging out:', error)
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
        <title>Usuarios - Panel Administrador</title>
      </Head>
      <AdminLayout user={user} onLogout={handleLogout}>
        <div className="space-y-4">
          {/* Header Compacto con Estadísticas */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">GESTIÓN DE USUARIOS</h1>
                <p className="text-gray-600 text-xs mt-0.5">
                  {users.length} usuario{users.length !== 1 ? 's' : ''} en total
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-2 border-blue-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-blue-800 text-xs font-semibold">Total</span>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                    <FiUsers className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-900">{users.length}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border-2 border-purple-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-purple-800 text-xs font-semibold">Super Admin</span>
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                    <FiShield className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-purple-900">{users.filter(u => u.role === 'superadmin').length}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border-2 border-orange-300 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-orange-800 text-xs font-semibold">Cotizadores</span>
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
                    <FiUsers className="text-white" size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-orange-900">{users.filter(u => u.role === 'cotizador').length}</p>
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
                    placeholder="Buscar por nombre o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                    style={{ color: '#111827' }}
                  />
                </div>

                {/* Botón de Exportar */}
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiDownload size={14} />
                  <span>Excel</span>
                </button>

                {/* Botón de Nuevo */}
                <button
                  onClick={() => {
                    setEditingUser(null)
                    setFormData({
                      name: '',
                      email: '',
                      password: '',
                      role: 'admin',
                      permissions: [],
                    })
                    setShowModal(true)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FiPlus size={14} />
                  <span>Nuevo</span>
                </button>
              </div>

              {/* Contador de resultados */}
              <div className="flex items-center justify-between text-xs text-gray-600 pt-2 mt-2 border-t border-gray-200">
                <span>Mostrando {users.filter(u => 
                  !searchQuery || 
                  u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  u.email.toLowerCase().includes(searchQuery.toLowerCase())
                ).length} de {users.length} usuarios</span>
              </div>
            </div>
          </div>

          {/* Vista de Cards o Tabla */}
          {viewMode === 'cards' ? (
            /* Vista de Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {users.filter(u => 
                !searchQuery || 
                u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((u) => {
                const permissions = u.permissions
                  ? JSON.parse(u.permissions)
                  : []
                return (
                  <div key={u.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200">
                    {/* Header de la Card */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            u.role === 'superadmin'
                              ? 'bg-purple-500/30 text-white border border-white/30'
                              : u.role === 'admin'
                              ? 'bg-blue-500/30 text-white border border-white/30'
                              : u.role === 'cotizador'
                              ? 'bg-orange-500/30 text-white border border-white/30'
                              : u.role === 'editor'
                              ? 'bg-green-500/30 text-white border border-white/30'
                              : u.role === 'customer'
                              ? 'bg-indigo-500/30 text-white border border-white/30'
                              : 'bg-gray-500/30 text-white border border-white/30'
                          }`}
                        >
                          {getRoleLabel(u.role)}
                        </span>
                      </div>
                      <div className="text-lg font-bold">{u.name}</div>
                    </div>

                    {/* Contenido de la Card */}
                    <div className="p-4 space-y-3">
                      <div>
                        <div className="flex items-center space-x-2 text-gray-700 text-sm mb-1">
                          <FiUsers size={14} className="text-gray-400" />
                          <span className="font-semibold truncate">{u.name}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600 text-xs">
                          <span className="truncate">{u.email}</span>
                        </div>
                      </div>

                      {/* Permisos - Resumen */}
                      <div className="border-t pt-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <FiShield size={14} className="text-gray-400" />
                          <span className="text-xs font-semibold text-gray-700">Permisos ({permissions.length})</span>
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-2">
                          {permissions.length > 0 ? (
                            permissions.slice(0, 3).map((perm, idx) => (
                              <span key={idx}>
                                {PERMISSIONS.find((p) => p.id === perm)?.label || perm}
                                {idx < Math.min(permissions.length, 3) - 1 ? ', ' : ''}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400">Sin permisos específicos</span>
                          )}
                          {permissions.length > 3 && <span className="text-gray-400"> +{permissions.length - 3} más</span>}
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      <div className="flex flex-col space-y-2 pt-2 border-t">
                        <button
                          onClick={() => handleEdit(u)}
                          className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors shadow-sm"
                        >
                          <FiEdit size={16} />
                          <span>EDITAR</span>
                        </button>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition-colors shadow-sm"
                          >
                            <FiTrash2 size={16} />
                            <span>ELIMINAR</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Vista de Tabla */
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-600 to-indigo-700">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <FiUsers size={14} />
                        Nombre
                      </div>
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Permisos
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.filter(u => 
                    !searchQuery || 
                    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((u, index) => {
                    const permissions = u.permissions
                      ? JSON.parse(u.permissions)
                      : []
                    return (
                      <tr key={u.id} className={`transition-colors ${
                        index % 2 === 0 
                          ? 'bg-white hover:bg-blue-50' 
                          : 'bg-gray-50 hover:bg-blue-50'
                      }`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                              <span className="text-white font-semibold">
                                {u.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-gray-900">{u.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{u.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              u.role === 'superadmin'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'admin'
                                ? 'bg-blue-100 text-blue-800'
                                : u.role === 'cotizador'
                                ? 'bg-orange-100 text-orange-800'
                                : u.role === 'editor'
                                ? 'bg-green-100 text-green-800'
                                : u.role === 'customer'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {getRoleLabel(u.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {permissions.length > 0 ? (
                              permissions.map((perm) => (
                                <span
                                  key={perm}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                                >
                                  {PERMISSIONS.find((p) => p.id === perm)?.label || perm}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">Sin permisos específicos</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(u)}
                              className="group relative flex items-center justify-center w-9 h-9 bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 hover:border-blue-400 text-blue-600 hover:text-blue-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-110"
                              title="Editar"
                            >
                              <FiEdit size={18} />
                            </button>
                            {u.id !== user?.id && (
                              <button
                                onClick={() => handleDelete(u.id)}
                                className="group relative flex items-center justify-center w-9 h-9 bg-red-50 hover:bg-red-100 border-2 border-red-300 hover:border-red-400 text-red-600 hover:text-red-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-110"
                                title="Eliminar"
                              >
                                <FiTrash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                {editingUser ? 'Editar Administrador' : 'Nuevo Administrador'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    style={{ color: '#111827' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={!!editingUser}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900 bg-white"
                    style={{ color: '#111827' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {editingUser ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña *'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    style={{ color: '#111827' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    style={{ color: '#111827' }}
                  >
                    {ROLES.filter(role => role.value !== 'customer').map((role) => (
                      <option key={role.value} value={role.value} style={{ color: '#111827', backgroundColor: '#ffffff' }}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permisos
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-4 border border-gray-300 rounded-lg">
                    {PERMISSIONS.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm.id)}
                          onChange={() => handlePermissionToggle(perm.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors font-semibold"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingUser(null)
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg transition-colors font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  )
}

