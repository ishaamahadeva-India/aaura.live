import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aaura - Spiritual Wellness',
    short_name: 'Aaura',
    description:
      'Your daily dose of spiritual wellness. Discover stories, mantras, rituals, and connect with a vibrant community.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8F8FF',
    theme_color: '#E6E6FA',
    icons: [
      {
        src: '/icons/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/icons/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
    ],
  };
}

