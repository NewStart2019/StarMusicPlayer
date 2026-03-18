import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || 'dev'),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080', changeOrigin: true,
      },
    },
  },
})
