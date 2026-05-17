"use client";

import { useEffect, useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const choice = localStorage.getItem("cookie_consent");
    if (!choice) setVisible(true);
  }, []);

  const updateConsent = (granted: boolean) => {
    const value = granted ? "granted" : "denied";

    window.gtag?.("consent", "update", {
      analytics_storage: value,
      ad_storage: "denied", // keep ads denied — you don't run ads
    });

    localStorage.setItem("cookie_consent", granted ? "accepted" : "rejected");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-6 md:w-[400px] bg-background/95 backdrop-blur-md border-t md:border border-border text-foreground p-5 md:p-6 rounded-t-3xl md:rounded-3xl shadow-[0_-8px_30px_rgb(0,0,0,0.12)] md:shadow-2xl z-[9999] animate-in fade-in slide-in-from-bottom-8 md:slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:gap-5">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="bg-primary/10 p-2 rounded-xl shrink-0 mt-0.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary w-4 h-4 md:w-5 md:h-5"
            >
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
              <path d="M8.5 8.5v.01" />
              <path d="M16 15.5v.01" />
              <path d="M12 12v.01" />
              <path d="M11 17v.01" />
              <path d="M7 14v.01" />
            </svg>
          </div>
          <div>
            <h3 className="font-serif font-semibold text-foreground text-base md:text-lg">
              Cookie Preferences
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed">
              We use analytics cookies to understand how visitors find and use
              our site. No personal data is sold or shared with advertisers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 mt-1">
          <button
            onClick={() => updateConsent(false)}
            className="flex-1 px-4 py-2.5 md:py-2 text-xs md:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all duration-200 border md:border-transparent border-border/50"
          >
            Reject
          </button>
          <button
            onClick={() => updateConsent(true)}
            className="flex-1 px-6 py-2.5 md:py-2 text-xs md:text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/20 transition-all duration-200"
          >
            Accept
          </button>
        </div>

        <p className="text-[10px] md:text-xs text-muted-foreground/60 text-center">
          By clicking accept, you agree to our{" "}
          <a
            href="/privacy"
            className="underline hover:text-primary transition-colors"
          >
            Privacy Policy
          </a>{" "}
          and{" "}
          <a
            href="/terms"
            className="underline hover:text-primary transition-colors"
          >
            Terms of Use
          </a>
          .
        </p>
      </div>
    </div>
  );
}
