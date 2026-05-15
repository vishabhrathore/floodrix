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
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md bg-background/95 backdrop-blur-md border border-border text-foreground p-6 rounded-3xl shadow-2xl z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-2 rounded-xl">
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
              className="text-primary"
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
            <h3 className="font-serif font-semibold text-foreground text-lg">
              Cookie Preferences
            </h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              We use analytics cookies to understand how visitors find and use
              our site. No personal data is sold or shared with advertisers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => updateConsent(false)}
            className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all duration-200"
          >
            Reject
          </button>
          <button
            onClick={() => updateConsent(true)}
            className="flex-1 px-6 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/20 transition-all duration-200"
          >
            Accept
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground/60 text-center">
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
