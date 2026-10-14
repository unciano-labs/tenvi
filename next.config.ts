import type { NextConfig } from "next";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_SUPABASE_ANON_KEY ||
  '';

const websiteId =
  process.env.NEXT_PUBLIC_WEBSITE_ID ||
  process.env.WEBSITE_ID ||
  '65d4f86e-1829-417a-981f-bc7aad7bc953';

const defaultRoleId =
  process.env.NEXT_PUBLIC_DEFAULT_ROLE_ID ||
  process.env.DEFAULT_ROLE_ID ||
  '02bf8818-b503-4f94-beac-6c45aa12e368';

const paymongoPublicKey =
  process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY ||
  process.env.NEXT_PAYMONGO_PUBLIC_KEY ||
  '';

const adminEmail =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
  process.env.ADMIN_EMAIL ||
  'webcareer1+admin@gmail.com';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.8.42', 'localhost:3000', '127.0.0.1'],
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    NEXT_SUPABASE_ANON_KEY: supabaseAnonKey,
    NEXT_PUBLIC_WEBSITE_ID: websiteId,
    WEBSITE_ID: websiteId,
    NEXT_PUBLIC_DEFAULT_ROLE_ID: defaultRoleId,
    DEFAULT_ROLE_ID: defaultRoleId,
    NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY: paymongoPublicKey,
    NEXT_PAYMONGO_PUBLIC_KEY: paymongoPublicKey,
    NEXT_PUBLIC_ADMIN_EMAIL: adminEmail,
    ADMIN_EMAIL: adminEmail,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
