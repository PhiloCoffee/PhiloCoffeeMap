import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@vis.gl/react-google-maps'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Turbopack is the default in Next.js 16; silence the webpack-plugin warning
  turbopack: {},
};

export default nextConfig;
