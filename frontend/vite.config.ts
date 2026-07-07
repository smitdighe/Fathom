import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// No dev-only assumptions: no proxy, no fixed host. The API base is read at
// runtime from VITE_API_URL, so the same build serves localhost and Vercel.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
