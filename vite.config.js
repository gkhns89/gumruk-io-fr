import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // Servisler API yanıtlarını (çalışan, firma, işlem verisi) console.log ile basıyor.
  // Build'de log/info/debug çağrıları küçültme sırasında atılır; warn/error hata
  // ayıklama için kalır. Geliştirme ortamındaki loglar etkilenmez.
  esbuild:
    command === "build"
      ? { pure: ["console.log", "console.info", "console.debug"] }
      : undefined,
}))
