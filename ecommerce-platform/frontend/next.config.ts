import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // required for Docker multi-stage build
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'http',  hostname: 'localhost' },
    ],
  },
  async rewrites() {
    return [
      {
        // Proxy API calls to the Spring Cloud Gateway during dev
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
