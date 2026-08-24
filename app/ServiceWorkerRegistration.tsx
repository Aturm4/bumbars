'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;

    const retireOfflineShell = async () => {
      const controlledReservedRoute =
        Boolean(navigator.serviceWorker.controller) &&
        ['/signin-with-chatgpt', '/signout-with-chatgpt', '/callback'].includes(window.location.pathname);
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((key) => key.startsWith('bumbars-shell-')).map((key) => caches.delete(key)),
        );
      }

      if (controlledReservedRoute) window.location.reload();
    };

    void retireOfflineShell();
  }, []);
  return null;
}
