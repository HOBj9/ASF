/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  // Ignore ESLint errors during build (warnings won't block, but this ensures smooth builds)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
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

