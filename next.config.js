/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Keep dev pages in buffer longer to reduce ChunkLoadError when Docker compiles slowly
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  // Enable file watching in Docker with relaxed intervals to reduce CPU load
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      poll: 3000,
      aggregateTimeout: 1000,
      ignored: ['**/node_modules', '**/.next', '**/.git'],
    }
    return config
  },
}

module.exports = nextConfig

