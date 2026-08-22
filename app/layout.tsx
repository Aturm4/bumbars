import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

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
  title: 'Bumbars — жизнь разворачивается',
  description: 'Постоянный симулятор жизни для друзей с ИИ-ведущим.',
  openGraph: {
    title: 'Bumbars — жизнь разворачивается',
    description: 'Постоянный симулятор жизни для друзей с ИИ-ведущим.',
    locale: 'ru_RU',
    type: 'website',
    images: [{ url: '/og.png', width: 1730, height: 909, alt: 'Bumbars — ваша жизнь разворачивается' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bumbars — жизнь разворачивается',
    description: 'Постоянный симулятор жизни для друзей с ИИ-ведущим.',
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
        {children}
      </body>
    </html>
  );
}

