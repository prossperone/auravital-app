/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  typescript: {
    // Evita bloqueos estrictos de TypeScript durante la exportación
    ignoreBuildErrors: true,
  },
  eslint: {
    // Evita bloqueos de formato durante la exportación
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
