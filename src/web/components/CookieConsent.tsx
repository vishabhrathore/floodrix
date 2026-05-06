"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X, Settings2 } from 'lucide-react';

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('floodrix-cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000); // Slightly longer delay for a premium feel
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('floodrix-cookie-consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('floodrix-cookie-consent', 'declined');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ 
            type: 'spring', 
            damping: 30, 
            stiffness: 150,
            delay: 0.2
          }}
          className="fixed bottom-6 left-6 right-6 md:left-6 md:right-auto md:max-w-sm z-[10001]"
        >
          <div className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative overflow-hidden group">
            {/* Minimalist Accent */}
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-teal opacity-60" />
            
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <Shield className="w-5 h-5 text-brand-dark" />
                  </div>
                  <span className="text-[11px] font-bold tracking-[0.2em] text-brand-dark/40 uppercase">
                    Privacy Sync
                  </span>
                </div>
                <button 
                  onClick={() => setIsVisible(false)}
                  className="text-gray-300 hover:text-brand-dark transition-colors p-1"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div>
                <p className="text-gray-600 text-sm leading-relaxed font-sans font-medium">
                  We optimize your experience using technical cookies. Our frameworks ensure data integrity and system performance.
                </p>
              </div>
              
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleAccept}
                  className="w-full bg-brand-dark hover:bg-brand-teal text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-lg shadow-brand-dark/5 active:scale-[0.98]"
                >
                  Consent & Continue
                </button>
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={handleDecline}
                    className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-brand-dark transition-all flex items-center gap-2 group/btn"
                  >
                    Decline
                  </button>
                  <button
                    className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-brand-teal transition-all flex items-center gap-2"
                  >
                    <Settings2 className="w-3 h-3" />
                    Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
