import React, { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter, Link } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import './index.css'

import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient()

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
  defaultNotFoundComponent: () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <h1 className="text-4xl font-extrabold text-slate-900 mb-2">404</h1>
      <p className="text-slate-500 mb-6">The requested module or page could not be found.</p>
      <Link
        to="/dashboard"
        className="bg-[#E31837] hover:bg-[#c4122e] text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-xs"
      >
        Return to Dashboard
      </Link>
    </div>
  ),
})

const rootElement = document.getElementById('root')

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}
