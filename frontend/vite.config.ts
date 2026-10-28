import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
    plugins: [solidPlugin()],
    build: {
        target: 'esnext',
        // Large Monaco chunks: skip gzip reporting (noticeable on full builds).
        reportCompressedSize: false,
        chunkSizeWarningLimit: 8000,
    },
});
