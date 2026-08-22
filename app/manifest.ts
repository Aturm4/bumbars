import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bumbars — жизнь продолжается',
    short_name: 'Bumbars',
    description: 'Постоянная life-sim игра для друзей с ИИ-ведущим и честным серверным миром.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1720',
    theme_color: '#0b1720',
    lang: 'ru',
    orientation: 'portrait-primary',
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
