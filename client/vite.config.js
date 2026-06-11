import { defineConfig, loadEnv } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '')

  const isDev = env.VITE_ENV === 'development'
  const baseUrl = isDev ? env.VITE_DEVELOPMENT_API : env.VITE_PRODUCTION_API

  const apiPort = isDev ? env.VITE_SERVER_API_PORT : null
  const apiTarget = apiPort ? `${baseUrl}:${apiPort}` : baseUrl

  console.log('--- VITE CONFIG ---')
  console.log('Mode:', env.VITE_ENV)
  console.log('Resolved API Target:', apiTarget)
  console.log('------------------')

  const proxyConfig = {
    '/api': {
      target: apiTarget || 'http://localhost:3000',
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
    '/ws': {
      target: apiTarget || 'http://localhost:3000',
      ws: true,
      changeOrigin: true,
      secure: false,
    },
  }

  return {
    plugins: [tanstackRouter(), react(), tailwindcss()],
    envDir: '../',
    server: {
      port: env.VITE_CLIENT_PORT ? parseInt(env.VITE_CLIENT_PORT) : 5173,
      allowedHosts: env.VITE_ALLOWED_ORIGIN ? env.VITE_ALLOWED_ORIGIN.split(',') : [],
      proxy: proxyConfig,
    },
    preview: {
      port: env.VITE_CLIENT_PORT ? parseInt(env.VITE_CLIENT_PORT) : 4173,
      allowedHosts: env.VITE_ALLOWED_ORIGIN ? env.VITE_ALLOWED_ORIGIN.split(',') : [],
      proxy: proxyConfig,
    },
    build: {
      outDir: 'dist',
      target: 'es2020',
      minify: 'terser',
      sourcemap: false,
      emptyOutDir: true,
    },
  }
})
