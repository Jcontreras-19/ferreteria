import { useState } from 'react'
import Image from 'next/image'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { FiEye, FiShoppingCart, FiTag, FiPackage, FiCheckCircle } from 'react-icons/fi'
import ProductModal from './ProductModal'

export default function ProductCard({ product, darkMode = false }) {
  const { addToCart } = useCart()
  const { isAuthenticated } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleAddToCart = () => {
    addToCart(product)
  }

  if (darkMode) {
    return (
      <>
        <div className="bg-gray-800 rounded-3xl shadow-2xl hover:shadow-green-500/30 overflow-hidden transition-all duration-500 transform hover:-translate-y-4 border border-gray-700/50 hover:border-green-500/60 group relative">
          {/* Badge de categoría flotante */}
          {product.category && (
            <div className="absolute top-4 left-4 z-20">
              <div className="flex items-center gap-1.5 bg-gray-900/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-green-500/30">
                <FiTag size={12} className="text-green-400" />
                <span className="text-xs font-semibold text-green-400">
                  {product.category}
                </span>
              </div>
            </div>
          )}

          {/* Imagen del producto con overlay mejorado */}
          <div className="relative w-full h-56 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 group overflow-hidden">
            {product.image && !imageError ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-contain p-4 transition-all duration-700 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                unoptimized
                onError={(e) => {
                  console.error('Error cargando imagen:', product.image, e)
                  setImageError(true)
                }}
                onLoad={() => {
                  console.log('Imagen cargada exitosamente:', product.image)
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-800">
                <div className="text-center">
                  <div className="text-5xl mb-2">📦</div>
                  <div className="text-xs text-gray-400">Sin imagen</div>
                </div>
              </div>
            )}
            
            {/* Overlay con efecto de luz verde en hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-green-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Botón de vista rápida mejorado */}
            <button
              onClick={() => setShowModal(true)}
              className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm hover:bg-green-600 text-gray-300 hover:text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl z-10 transform hover:scale-110 border border-gray-700 hover:border-green-500"
              title="Vista rápida"
            >
              <FiEye size={18} />
            </button>

            {/* Indicador de stock en la esquina inferior */}
            {product.stock !== undefined && (
              <div className="absolute bottom-4 left-4 z-20">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${
                  product.stock > 20
                    ? 'bg-green-500/30 text-green-300 border border-green-500/50'
                    : product.stock > 10
                    ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50'
                    : product.stock > 0
                    ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50'
                    : 'bg-red-500/30 text-red-300 border border-red-500/50'
                }`}>
                  <FiPackage size={12} />
                  <span>{product.stock > 0 ? `${product.stock} disp.` : 'Agotado'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Información del producto - Diseño mejorado */}
          <div className="p-6 bg-gray-800">
            {/* Título con mejor jerarquía */}
            <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-green-400 transition-colors leading-tight">
              {product.name}
            </h3>
            
            {/* Descripción más clara */}
            {product.description && (
              <p className="text-sm text-gray-400 mb-5 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                {product.description}
              </p>
            )}

            {/* Sección de precio y acción */}
            {isAuthenticated && (
              <div className="space-y-4 pt-4 border-t border-gray-700/50">
                {/* Precio destacado */}
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Precio</span>
                    <p className="text-3xl font-bold text-green-400 mt-1">
                      S/. {product.price.toFixed(2)}
                    </p>
                  </div>
                  {/* Botón de agregar mejorado */}
                  <button
                    onClick={handleAddToCart}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-6 py-3 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-green-500/50 transform hover:scale-105 active:scale-95 group/btn"
                  >
                    <FiShoppingCart size={18} className="group-hover/btn:animate-bounce" />
                    <span>Agregar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Información adicional si no está autenticado */}
            {!isAuthenticated && product.stock !== undefined && (
              <div className="pt-4 border-t border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    <FiPackage size={16} />
                    <span className="text-sm font-medium">Disponibilidad</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                      product.stock > 20
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : product.stock > 10
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : product.stock > 0
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {product.stock > 0 ? (
                      <>
                        <FiCheckCircle size={12} />
                        <span>{product.stock} unidades</span>
                      </>
                    ) : (
                      'Agotado'
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de detalles del producto */}
        {showModal && (
          <ProductModal
            product={product}
            onClose={() => setShowModal(false)}
            onAddToCart={handleAddToCart}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className="bg-white rounded-3xl shadow-lg hover:shadow-2xl overflow-hidden transition-all duration-500 transform hover:-translate-y-4 border border-gray-200/50 hover:border-green-500/50 group relative">
        {/* Badge de categoría flotante */}
        {product.category && (
          <div className="absolute top-4 left-4 z-20">
            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full border border-green-200 shadow-sm">
              <FiTag size={12} className="text-green-600" />
              <span className="text-xs font-semibold text-green-700">
                {product.category}
              </span>
            </div>
          </div>
        )}

        {/* Imagen del producto con overlay mejorado */}
        <div className="relative w-full h-56 bg-gradient-to-br from-gray-50 via-white to-gray-50 group overflow-hidden">
          {product.image && !imageError ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-contain p-4 transition-all duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized
              onError={(e) => {
                console.error('Error cargando imagen:', product.image, e)
                setImageError(true)
              }}
              onLoad={() => {
                console.log('Imagen cargada exitosamente:', product.image)
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
              <div className="text-center">
                <div className="text-5xl mb-2">📦</div>
                <div className="text-xs">Sin imagen</div>
              </div>
            </div>
          )}
          
          {/* Overlay sutil en hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          {/* Botón de vista rápida mejorado */}
          <button
            onClick={() => setShowModal(true)}
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm hover:bg-green-600 text-gray-700 hover:text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl z-10 transform hover:scale-110 border border-gray-200 hover:border-green-500"
            title="Vista rápida"
          >
            <FiEye size={18} />
          </button>

          {/* Indicador de stock en la esquina inferior */}
          {product.stock !== undefined && (
            <div className="absolute bottom-4 left-4 z-20">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm shadow-sm ${
                product.stock > 20
                  ? 'bg-green-100/90 text-green-700 border border-green-300'
                  : product.stock > 10
                  ? 'bg-yellow-100/90 text-yellow-700 border border-yellow-300'
                  : product.stock > 0
                  ? 'bg-orange-100/90 text-orange-700 border border-orange-300'
                  : 'bg-red-100/90 text-red-700 border border-red-300'
              }`}>
                <FiPackage size={12} />
                <span>{product.stock > 0 ? `${product.stock} disp.` : 'Agotado'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Información del producto - Diseño mejorado */}
        <div className="p-6 bg-white">
          {/* Título con mejor jerarquía */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-700 transition-colors leading-tight">
            {product.name}
          </h3>
          
          {/* Descripción más clara */}
          {product.description && (
            <p className="text-sm text-gray-600 mb-5 line-clamp-2 leading-relaxed min-h-[2.5rem]">
              {product.description}
            </p>
          )}

          {/* Sección de precio y acción */}
          {isAuthenticated && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              {/* Precio destacado */}
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Precio</span>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    S/. {product.price.toFixed(2)}
                  </p>
                </div>
                {/* Botón de agregar mejorado */}
                <button
                  onClick={handleAddToCart}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-6 py-3 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-green-500/50 transform hover:scale-105 active:scale-95 group/btn"
                >
                  <FiShoppingCart size={18} className="group-hover/btn:animate-bounce" />
                  <span>Agregar</span>
                </button>
              </div>
            </div>
          )}

          {/* Información adicional si no está autenticado */}
          {!isAuthenticated && product.stock !== undefined && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <FiPackage size={16} />
                  <span className="text-sm font-medium">Disponibilidad</span>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                    product.stock > 20
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : product.stock > 10
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                      : product.stock > 0
                      ? 'bg-orange-100 text-orange-800 border border-orange-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  {product.stock > 0 ? (
                    <>
                      <FiCheckCircle size={12} />
                      <span>{product.stock} unidades</span>
                    </>
                  ) : (
                    'Agotado'
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalles del producto */}
      {showModal && (
        <ProductModal
          product={product}
          onClose={() => setShowModal(false)}
          onAddToCart={handleAddToCart}
        />
      )}
    </>
  )
}

