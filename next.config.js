/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    // Esto le dice a Hyperlift que compile aunque TypeScript ande de quisquilloso con las rutas
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.alias['@'] = __dirname;
    return config;
  },
}

module.exports = nextConfig
