'use client';

import { useEffect } from 'react';

export default function ConsentRestore() {
  useEffect(() => {
    const choice = localStorage.getItem('cookie_consent');
    if (choice === 'accepted') {
      window.gtag?.('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage:        'denied',
      });
    }
  }, []);

  return null;
}
