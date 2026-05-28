import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Para que Next pueda compilar TypeScript del paquete del workspace.
  transpilePackages: ['@regenera/shared'],

  // Hay un package-lock.json en C:\Users\...\Projects\ (carpeta padre) que Next
  // confunde con el workspace root. Le fijamos el root explícitamente.
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },
};

export default nextConfig;
