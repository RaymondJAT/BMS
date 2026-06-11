import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
// Optional: Import devtools for a better developer experience
// import { TanStackRouterDevtools } from '@tanstack/router-devtools'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export const Route = createRootRouteWithContext()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <nav className="p-4 bg-white shadow-sm flex gap-4 text-sm font-medium">
        <Link to="/" className="[&.active]:text-blue-600 hover:text-blue-500 transition-colors">
          Home
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        <Outlet />
      </main>

      {/* <TanStackRouterDevtools /> */}
      {/* <ReactQueryDevtools /> */}
    </>
  )
}
