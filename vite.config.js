import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative paths work on project GitHub Pages URLs and custom domains.
export default defineConfig({ plugins: [react()], base: './' });
