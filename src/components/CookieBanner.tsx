'use client';

import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const choice = localStorage.getItem('cookie_consent');
    if (!choice) setVisible(true);
  }, []);

  const updateConsent = (granted: boolean) => {
    const value = granted ? 'granted' : 'denied';

    window.gtag?.('consent', 'update', {
      analytics_storage: value,
      ad_storage:        'denied', // keep ads denied — you don't run ads
    });

    localStorage.setItem('cookie_consent', granted ? 'accepted' : 'rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div 
      className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md bg-zinc-900/90 backdrop-blur-md border border-zinc-800 text-white p-6 rounded-2xl shadow-2xl z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-blue-500/10 p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/></svg>
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100">Cookie Preferences</h3>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
              We use analytics cookies to understand how visitors find and use our site. 
              No personal data is sold or shared with advertisers.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => updateConsent(false)}
            className="flex-1 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-all duration-200"
          >
            Reject
          </button>
          <button
            onClick={() => updateConsent(true)}
            className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-200"
          >
            Accept
          </button>
        </div>
        
        <p className="text-[10px] text-zinc-500 text-center">
          By clicking accept, you agree to our <a href="/cookie-policy" className="underline hover:text-zinc-300">Cookie Policy</a>.
        </p>
      </div>
    </div>
  );
}
