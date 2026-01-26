/// <reference types="vitest" />
import {defineConfig} from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src")
        }
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/tests/setup.ts',
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                configure: (proxy, options) => {
                    proxy.on('error', (err, req) => {
                        console.log('--- Vite Proxy Error ---');
                        console.log('Error Type:', (err as Error & { code?: string }).code);
                        console.log('Target:', options.target);
                        console.log('Request Path:', req.url);
                        console.log('------------------------');
                    });
                }
            },
            '/admin': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/accounts': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/static': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/media': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            }
        }
    },

    define: {
        'process.env': {}
    }
})
