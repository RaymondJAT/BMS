import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { AuthProvider } from '../context/AuthContext'
// import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRouteWithContext()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <AuthProvider>
      {/* Root component simply acts as the top-level container */}
      <Outlet />

      {/* Devtools can stay here if you enable them */}
      {/* <TanStackRouterDevtools /> */}
    </AuthProvider>
  )
}
