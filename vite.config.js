import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Ermöglicht die Nutzung von globalen Variablen wie 'describe', 'it', 'expect'
    // ohne sie in jeder Testdatei manuell importieren zu müssen.
    globals: true,
    
    // Simuliert eine Browser-Umgebung (notwendig für React Testing Library)
    environment: 'jsdom',
    
    // Pfad zur Setup-Datei für spezielle Matcher (z.B. .toBeInTheDocument())
    setupFiles: './src/setupTests.js',
    
    // Schließt unnötige Ordner aus
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    
    css: true, // Lädt CSS, falls du Styles in Tests prüfen willst
  },
});
