/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Suppress RSC payload fetch errors - these are non-critical fallbacks
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { isServer, dev }) => {
    // Configure webpack for better chunk handling and error recovery
    // Note: Don't override chunkFilename as Next.js handles this automatically
    // The _next/static/ prefix is added by Next.js automatically
      
    // Only customize splitChunks for production builds
    if (!isServer && !dev) {
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              default: false,
              vendors: false,
              // Framework chunks
              framework: {
                name: 'framework',
                chunks: 'all',
                test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
                priority: 40,
                enforce: true,
              },
              // Library chunks
              lib: {
                test: /[\\/]node_modules[\\/]/,
                name(module) {
                  const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)?.[1];
                  return packageName ? `lib-${packageName.replace('@', '')}` : 'lib';
                },
                priority: 30,
                minChunks: 1,
                reuseExistingChunk: true,
              },
            },
          },
        };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.firebasestorage.app',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply CSP headers to all routes to allow CDN and Firebase Storage
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://static.cloudflareinsights.com https://checkout.razorpay.com https://*.razorpay.com https://www.gstatic.com https://apis.google.com https://accounts.google.com",
              "script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://checkout.razorpay.com https://*.razorpay.com https://www.gstatic.com https://apis.google.com https://accounts.google.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              // NOTE: connect-src must include storage.googleapis.com so fetch() can download video blobs
              // (used as a deterministic fallback when some browsers stall around ~60s on ranged video playback).
              "connect-src 'self' https://aaura.live https://*.aaura.live https://firebasestorage.googleapis.com https://*.firebasestorage.app https://*.firebasestorage.googleapis.com https://storage.googleapis.com https://*.storage.googleapis.com https://*.googleapis.com https://firestore.googleapis.com https://*.google.com https://accounts.google.com https://apis.google.com wss://*.firebaseio.com https://*.firebaseio.com https://api.razorpay.com https://*.razorpay.com",
              "media-src 'self' https://aaura.live https://*.aaura.live https://videos.aaura.live https://firebasestorage.googleapis.com https://*.firebasestorage.app https://*.firebasestorage.googleapis.com https://storage.googleapis.com https://*.storage.googleapis.com https://www.soundjay.com blob:",
              "frame-src 'self' https://*.google.com https://*.youtube.com https://*.firebaseapp.com https://*.firebaseio.com https://checkout.razorpay.com https://*.razorpay.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://checkout.razorpay.com",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
      {
        // Apply headers to all JavaScript chunks
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Never cache JavaScript bundles - always fetch fresh
        source: '/_next/static/chunks/:path*.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        // Never cache CSS files - always fetch fresh to prevent layout issues across domains
        source: '/_next/static/:path*.css',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        // Never cache service worker
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
