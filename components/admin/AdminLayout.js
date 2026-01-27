import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { 
  FiLayout, 
  FiPackage, 
  FiUsers, 
  FiSettings, 
  FiLogOut,
  FiMenu,
  FiX,
  FiBarChart2,
  FiUser,
  FiChevronDown,
  FiCheckCircle,
  FiFileText,
  FiCalendar,
  FiHome,
  FiShoppingCart
} from 'react-icons/fi'

export default function AdminLayout({ children, user, onLogout }) {
  const router = useRouter()
  
  // Función para obtener el nombre del perfil según el rol
  const getProfileName = (role) => {
    const roleMap = {
      'admin': 'Administrador',
      'superadmin': 'Super Administrador',
      'editor': 'Editor',
      'viewer': 'Visualizador',
      'cotizador': 'Cotizador',
      'vendedor': 'Vendedor',
      'customer': 'Cliente',
    }
    return roleMap[role] || 'Cliente'
  }
  
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // Sidebar siempre expandido, no se puede colapsar
  const sidebarCollapsed = false
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  // Cerrar menú de usuario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const menuItems = [
    { href: '/admin', icon: FiLayout, label: 'Dashboard', exact: true },
    { href: '/admin/productos', icon: FiPackage, label: 'Productos' },
    { href: '/admin/clientes', icon: FiUser, label: 'Clientes' },
    { href: '/admin/cotizaciones', icon: FiBarChart2, label: 'Cotizaciones' },
    { href: '/admin/autorizar-despachos', icon: FiCheckCircle, label: 'Autorizar Despachos' },
    // { href: '/admin/boletas-facturas', icon: FiFileText, label: 'Boletas y Facturas' }, // Ocultado temporalmente
    { href: '/admin/reportes-programados', icon: FiCalendar, label: 'Reportes Programados' },
    { href: '/admin/administradores', icon: FiUsers, label: 'Administradores' },
    { href: '/admin/configuracion', icon: FiSettings, label: 'Configuración' },
  ]

  const isActive = (href, exact = false) => {
    if (exact) {
      return router.pathname === href
    }
    return router.pathname.startsWith(href)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/'
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar Desktop - Siempre visible y expandido */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-gray-900 text-white w-64 lg:translate-x-0`}
        onMouseLeave={() => setHoveredItem(null)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header del sidebar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Menu */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)
              
              return (
                <div key={item.href} className="relative">
                  <Link
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                    onClick={() => {
                      setMobileMenuOpen(false)
                    }}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                </div>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Overlay Mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content - Siempre con padding para sidebar expandido */}
      <div className="transition-all duration-300 lg:pl-64">
        {/* Header Mobile */}
        <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              <FiMenu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Panel Admin</h1>
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center"
              >
                <span className="text-white text-sm font-semibold">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </button>
              
              {/* Menú desplegable mobile */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">
                      {user?.name || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs font-medium text-blue-600 mt-1">
                      {getProfileName(user?.role)}
                    </p>
                  </div>
                  {user?.role === 'superadmin' && (
                    <Link
                      href="/"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <FiShoppingCart size={16} />
                      Generar Cotización
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout()
                      setUserMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <FiLogOut size={16} />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Header Desktop */}
        <header className="hidden lg:block bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
          <div className="flex items-center justify-between px-6 py-2">
            <div>
              {/* Título removido según solicitud del usuario */}
            </div>
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-blue-600 font-medium">{getProfileName(user?.role)}</p>
                </div>
                <FiChevronDown 
                  className={`text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} 
                  size={16} 
                />
              </button>
              
              {/* Menú desplegable */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">
                      {user?.name || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs font-medium text-blue-600 mt-1">
                      {getProfileName(user?.role)}
                    </p>
                  </div>
                  {user?.role === 'superadmin' && (
                    <Link
                      href="/"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <FiShoppingCart size={16} />
                      Generar Cotización
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout()
                      setUserMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <FiLogOut size={16} />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-gray-900 text-white transform transition-transform lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <FiX size={24} />
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </div>
  )
}

