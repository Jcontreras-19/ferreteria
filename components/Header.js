import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useRef, useEffect } from 'react'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { FiUser, FiSettings, FiLogOut, FiChevronDown, FiPackage, FiFileText, FiList } from 'react-icons/fi'

export default function Header() {
  const router = useRouter()
  const { getItemCount } = useCart()
  const { user, logout, isAuthenticated } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  
  const isAdmin = user && ['admin', 'superadmin', 'editor', 'viewer'].includes(user.role)
  const isCotizador = user && ['admin', 'superadmin', 'cotizador', 'vendedor'].includes(user.role)

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

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/productos?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-gray-900 shadow-lg z-50 border-b border-green-500/20">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-800 rounded-full border-2 border-green-500">
              <span className="text-green-500 font-bold text-xl">GRC</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-white font-bold text-lg">Corporación GRC</div>
              <div className="text-green-400 text-xs">ISO 9001:2015</div>
            </div>
          </Link>

          {/* Buscador Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar productos..."
              className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-r-lg transition-colors"
            >
              🔍
            </button>
          </form>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className="hover:text-green-400 transition-colors"
            >
              Inicio
            </Link>
            <Link
              href="/productos"
              className="hover:text-green-400 transition-colors"
            >
              Productos
            </Link>
            <Link
              href="/carrito"
              className="relative hover:text-blue-400 transition-colors"
            >
              🛒 Carrito
              {getItemCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {getItemCount()}
                </span>
              )}
            </Link>
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <FiUser size={16} className="text-white" />
                  </div>
                  <span className="text-white">{user?.name || 'Usuario'}</span>
                  <FiChevronDown 
                    size={16} 
                    className={`text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} 
                  />
                </button>
                
                {/* Menú desplegable */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-semibold text-gray-900">{user?.name || 'Usuario'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      <p className="text-xs font-medium text-blue-600 mt-1">
                        {getProfileName(user?.role)}
                      </p>
                    </div>
                    <Link
                      href="/productos"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <FiPackage size={16} />
                      <span>Ver Productos</span>
                    </Link>
                    <Link
                      href="/mis-cotizaciones"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <FiList size={16} />
                      <span>Mis Cotizaciones</span>
                    </Link>
                    {isCotizador && (
                      <Link
                        href="/cotizador"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FiFileText size={16} />
                        <span>Panel Cotizador</span>
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FiFileText size={16} />
                        <span>Panel Admin</span>
                      </Link>
                    )}
                    <Link
                      href="/perfil"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <FiSettings size={16} />
                      <span>Configurar Datos</span>
                    </Link>
                    <div className="border-t border-gray-200 mt-1"></div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        logout()
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <FiLogOut size={16} />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Inicio de Sesión
              </Link>
            )}
          </nav>

          {/* Botón Menú Mobile */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white text-2xl"
          >
            ☰
          </button>
        </div>

        {/* Menú Mobile */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-700">
            <form onSubmit={handleSearch} className="mt-4 flex">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-r-lg"
              >
                🔍
              </button>
            </form>
            <nav className="mt-4 flex flex-col space-y-2">
              <Link
                href="/"
                className="py-2 hover:text-blue-400 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Inicio
              </Link>
              <Link
                href="/productos"
                className="py-2 hover:text-blue-400 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Productos
              </Link>
              <Link
                href="/carrito"
                className="py-2 hover:text-blue-400 transition-colors relative"
                onClick={() => setIsMenuOpen(false)}
              >
                🛒 Carrito
                {getItemCount() > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {getItemCount()}
                  </span>
                )}
              </Link>
              {isAuthenticated ? (
                <>
                  <div className="py-2 border-b border-gray-700 mb-2">
                    <p className="text-sm font-semibold text-white">{user?.name || 'Usuario'}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    <p className="text-xs font-medium text-blue-400 mt-1">
                      {getProfileName(user?.role)}
                    </p>
                  </div>
                  <Link
                    href="/productos"
                    className="py-2 hover:text-blue-400 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Ver Productos
                  </Link>
                  <Link
                    href="/mis-cotizaciones"
                    className="py-2 hover:text-blue-400 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Mis Cotizaciones
                  </Link>
                  {isCotizador && (
                    <Link
                      href="/cotizador"
                      className="py-2 hover:text-blue-400 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Panel Cotizador
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="py-2 hover:text-blue-400 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Panel Admin
                    </Link>
                  )}
                  <Link
                    href="/perfil"
                    className="py-2 hover:text-blue-400 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Configurar Datos
                  </Link>
                  <button
                    onClick={() => {
                      logout()
                      setIsMenuOpen(false)
                    }}
                    className="py-2 hover:text-blue-400 transition-colors text-left w-full"
                  >
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="py-2 hover:text-blue-400 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Inicio de Sesión
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

