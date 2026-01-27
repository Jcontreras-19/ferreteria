import { useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

function Error({ statusCode }) {
  return (
    <>
      <Head>
        <title>Error {statusCode || 'Desconocido'} - Ferretería</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-4">
            {statusCode || 'Error'}
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            {statusCode === 404
              ? 'Página no encontrada'
              : statusCode === 500
              ? 'Error del servidor'
              : 'Algo salió mal'}
          </p>
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

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error

