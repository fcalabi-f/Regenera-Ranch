import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Para que Next pueda compilar TypeScript del paquete del workspace.
  transpilePackages: ['@regenera/shared'],
};

export default nextConfig;
