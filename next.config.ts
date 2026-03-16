import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Turbopack is the default in Next.js 16; silence the webpack-plugin warning
  turbopack: {},
};

export default nextConfig;
