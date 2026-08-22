import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './game.css';

import ServiceWorkerRegistration from './ServiceWorkerRegistration';
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Bumbars — жизнь продолжается',
  description: 'Живая настольная life-sim игра о друзьях, решениях и настоящем времени.',
  openGraph: {
    title: 'Bumbars — жизнь продолжается',
    description: 'Живая настольная life-sim игра о друзьях, решениях и настоящем времени.',
    locale: 'ru_RU',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Bumbars — жизнь продолжается' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bumbars — жизнь продолжается',
    description: 'Живая настольная life-sim игра о друзьях, решениях и настоящем времени.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={geistSans.variable + ' ' + geistMono.variable}>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}

