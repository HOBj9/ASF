const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Keep dev pages in buffer longer to reduce ChunkLoadError when Docker compiles slowly
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  // Enable file watching in Docker only — native watching is faster outside Docker
  webpack: (config, { isServer }) => {
    if (process.env.CHOKIDAR_USEPOLLING === 'true') {
      config.watchOptions = {
        poll: 3000,
        aggregateTimeout: 1000,
        ignored: ['**/node_modules', '**/.next', '**/.git'],
      }
    }
    return config
  },
}

module.exports = withBundleAnalyzer(nextConfig)
