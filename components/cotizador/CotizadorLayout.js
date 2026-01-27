import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { 
  FiFileText, 
  FiCheckCircle, 
  FiXCircle,
  FiLogOut,
  FiMenu,
  FiX,
  FiChevronDown,
  FiPackage,
  FiUser,
  FiSettings,
  FiBox,
  FiCreditCard
} from 'react-icons/fi'

export default function CotizadorLayout({ children, user, onLogout }) {
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cotizadorSidebarCollapsed')
      return saved ? JSON.parse(saved) : true
    }
    return true
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cotizadorSidebarCollapsed', JSON.stringify(sidebarCollapsed))
    }
  }, [sidebarCollapsed])

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
    { href: '/cotizador', icon: FiFileText, label: 'Todas las Cotizaciones', exact: true },
    { href: '/cotizador?status=pending', icon: FiFileText, label: 'Pendientes' },
    { href: '/cotizador?status=approved', icon: FiCheckCircle, label: 'Aprobadas' },
    { href: '/cotizador?status=completed', icon: FiCheckCircle, label: 'Completadas' },
    { href: '/cotizador?status=rejected', icon: FiXCircle, label: 'Rechazadas' },
    { href: '/cotizador/productos', icon: FiBox, label: 'Inventario' },
    // { href: '/cotizador/boletas-facturas', icon: FiCreditCard, label: 'Boletas y Facturas' }, // Ocultado temporalmente
  ]

  const isActive = (href, exact = false) => {
    if (exact) {
      return router.pathname === href && !router.query.status
    }
    if (href.includes('status=')) {
      const status = href.split('status=')[1]
      return router.pathname === '/cotizador' && router.query.status === status
    }
    return router.pathname === href
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
      {/* Overlay para cerrar sidebar cuando está expandido */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-30 lg:block hidden"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSidebarCollapsed(true)
            }
          }}
        />
      )}
      
      {/* Sidebar Desktop */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-gray-900 text-white ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } lg:translate-x-0`}
        onMouseEnter={() => {
          if (sidebarCollapsed) {
            setSidebarCollapsed(false)
          }
          setHoveredItem(null)
        }}
        onMouseLeave={() => {
          setHoveredItem(null)
          if (!sidebarCollapsed) {
            setSidebarCollapsed(true)
          }
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header del sidebar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-700 rounded-full border-2 border-green-500">
                  <span className="text-green-500 font-bold text-sm">GRC</span>
                </div>
                <div>
                  <div className="text-sm font-bold">Cotizador</div>
                  <div className="text-xs text-gray-400">Panel</div>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="flex items-center justify-center w-full">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-700 rounded-full border-2 border-green-500">
                  <span className="text-green-500 font-bold text-sm">GRC</span>
                </div>
              </div>
            )}
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
              const isHovered = hoveredItem === item.href
              const showTooltip = sidebarCollapsed && isHovered
              
              return (
                <div key={item.href} className="relative">
                  <Link
                    href={item.href}
                    onMouseEnter={() => setHoveredItem(item.href)}
                    className={`flex items-center ${
                      sidebarCollapsed ? 'justify-center' : 'space-x-3'
                    } px-4 py-3 rounded-lg transition-colors relative ${
                      active
                        ? 'bg-green-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                    onClick={() => {
                      setMobileMenuOpen(false)
                      if (sidebarCollapsed) {
                        setSidebarCollapsed(false)
                      }
                    }}
                  >
                    <Icon size={20} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                  {showTooltip && (
                    <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 z-50 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                      {item.label}
                      <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
                    </div>
                  )}
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

      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
      }`}>
        {/* Header Mobile */}
        <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              <FiMenu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Panel Cotizador</h1>
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center"
              >
                <span className="text-white text-sm font-semibold">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </button>
              
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">
                      {user?.name || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs font-medium text-green-600 mt-1">
                      {getProfileName(user?.role)}
                    </p>
                  </div>
                  <Link
                    href="/productos"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <FiPackage size={16} />
                    <span>Ver Productos</span>
                  </Link>
                  <Link
                    href="/cotizador"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <FiFileText size={16} />
                    <span>Panel Cotizador</span>
                  </Link>
                  <Link
                    href="/perfil"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <FiSettings size={16} />
                    <span>Configurar Datos</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      setUserMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                  >
                    <FiLogOut size={16} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Header Desktop */}
        <header className="hidden lg:block bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {menuItems.find((item) => isActive(item.href, item.exact))?.label || 'Cotizaciones'}
              </h2>
            </div>
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-green-600 font-medium">{getProfileName(user?.role)}</p>
                </div>
                <FiChevronDown 
                  className={`text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} 
                  size={16} 
                />
              </button>
              
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">
                      {user?.name || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs font-medium text-green-600 mt-1">
                      {getProfileName(user?.role)}
                    </p>
                  </div>
                  <Link
                    href="/productos"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <FiPackage size={16} />
                    <span>Ver Productos</span>
                  </Link>
                  <Link
                    href="/cotizador"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <FiFileText size={16} />
                    <span>Panel Cotizador</span>
                  </Link>
                  <Link
                    href="/perfil"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <FiSettings size={16} />
                    <span>Configurar Datos</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      setUserMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                  >
                    <FiLogOut size={16} />
                    <span>Cerrar Sesión</span>
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
                      ? 'bg-green-600 text-white'
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
