/** @type {import('next').NextConfig} */
const nextConfig = {
  // Requerido para el Dockerfile multi-stage (Spaceship Hyperlift)
  output: 'standalone',

  images: {
    domains: ['your-supabase-project.supabase.co'],
  },
}

module.exports = nextConfig
