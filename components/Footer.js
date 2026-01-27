import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-green-500/20 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Información de contacto */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gray-800 rounded-full border-2 border-green-500">
                <span className="text-green-500 font-bold">GRC</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-400">Corporación GRC</h3>
                <p className="text-xs text-gray-400">ISO 9001:2015</p>
              </div>
            </div>
            <div className="space-y-2 text-gray-300">
              <p className="flex items-center space-x-2">
                <span>📧</span>
                <a href="mailto:corporaciongrc@gmail.com" className="hover:text-green-400 transition-colors">
                  corporaciongrc@gmail.com
                </a>
              </p>
              <p className="flex items-center space-x-2">
                <span>📱</span>
                <a href="https://wa.me/51957216908" className="hover:text-green-400 transition-colors">
                  (511) 957 216 908
                </a>
              </p>
              <p className="flex items-center space-x-2">
                <span>📍</span>
                <span>Av. José Gálvez 1322 Dpto. 302<br/>La Perla - Callao</span>
              </p>
            </div>
          </div>

          {/* Enlaces rápidos */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-green-400">Enlaces Rápidos</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link href="/" className="hover:text-green-400 transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/productos" className="hover:text-green-400 transition-colors">
                  Productos
                </Link>
              </li>
              <li>
                <Link href="/carrito" className="hover:text-green-400 transition-colors">
                  Carrito
                </Link>
              </li>
            </ul>
          </div>

          {/* Información adicional */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-green-400">Gerente General</h3>
            <div className="space-y-2 text-gray-300">
              <p className="font-semibold text-green-400">Geoffrey Romaní Cordova</p>
              <p className="text-sm text-gray-400">Corporación GRC</p>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500">Certificación ISO 9001:2015</p>
                <p className="text-xs text-gray-500">LLC (CERTIFICATION)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Corporación GRC. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}

