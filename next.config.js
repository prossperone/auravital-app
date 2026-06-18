/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Esta regla fuerza al compilador a encontrar @/lib/supabase sin importar la extensión
  webpack: (config) => {
    config.resolve.alias['@'] = __dirname;
    return config;
  },
}

module.exports = nextConfig
