import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  // Aktifkan kompresi gzip/brotli untuk payload JS & HTML
  compress: true,

  // Waktu stale-while-revalidate default untuk Next.js fetch cache (detik)
  // Cocok untuk halaman yang di-cache di Edge Vercel
  expireTime: 30,

  // Cache headers untuk API routes
  async headers() {
    return [
      {
        // API routes dinamis tidak boleh di-cache oleh browser/proxy
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
