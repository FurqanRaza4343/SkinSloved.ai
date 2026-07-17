/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'sncey5ds.ap-southeast.insforge.app' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/favicon.svg',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://sncey5ds.ap-southeast.insforge.app; connect-src 'self' https://sncey5ds.ap-southeast.insforge.app https://*.insforge.app wss://*.insforge.app https://skin-sloved-api-d147cddd-7969-4814-a9d5-165f122a1278.fly.dev; media-src 'self' data: blob:;",
          },
          {
            key: 'Permissions-Policy',
            value: 'unload=()',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
