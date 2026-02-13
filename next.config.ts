import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    // In production, nginx handles /socket.io/ proxy directly to port 3003.
    // Next.js standalone mode does NOT properly forward query params (EIO, transport, sid)
    // for external URL rewrites, causing Socket.IO "Transport unknown" errors.
    // Only use these rewrites in development (no nginx).
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    return [
      {
        source: '/socket.io',
        destination: 'http://localhost:3003/socket.io',
      },
      {
        source: '/socket.io/',
        destination: 'http://localhost:3003/socket.io/',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:3003/socket.io/:path*',
      },
    ];
  },
};

export default nextConfig;
