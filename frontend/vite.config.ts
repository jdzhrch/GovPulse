import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Custom plugin to serve data/history files during development
function serveDataHistory(): Plugin {
  const dataHistoryPath = join(__dirname, '..', 'data', 'history')
  const routePrefix = '/GovPulse/data/history/'
  
  return {
    name: 'serve-data-history',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Handle requests to /GovPulse/data/history/
        if (req.url?.startsWith(routePrefix)) {
          const requestUrl = new URL(req.url, 'http://localhost')
          const fileName = decodeURIComponent(requestUrl.pathname.replace(routePrefix, ''))
          const filePath = join(dataHistoryPath, fileName)
          
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf-8')
            res.setHeader('Content-Type', fileName.endsWith('.json') ? 'application/json' : 'text/plain')
            res.end(content)
            return
          }
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), serveDataHistory()],
  base: '/GovPulse/',
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
