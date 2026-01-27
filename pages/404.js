import Head from 'next/head'
import Link from 'next/link'

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 - Página no encontrada</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-4">404</h1>
          <p className="text-xl text-gray-300 mb-8">Página no encontrada</p>
          <Link
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    </>
  )
}

