# GA4 + GTM + Consent Mode v2 — Next.js Implementation Guide

---

## Prerequisites

- Next.js 13+ (App Router or Pages Router)
- Google Tag Manager account — get your `GTM-XXXXXXX` ID
- Google Analytics 4 property — get your `G-XXXXXXXXXX` ID

---

## Step 1 — Environment Variables

Create or update `.env.local`:

```env
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

## Step 2 — Consent Defaults Script

This must fire **before GTM loads**. Create this component:

**`components/ConsentDefaults.tsx`**

```tsx
export default function ConsentDefaults() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){ dataLayer.push(arguments); }
          gtag('consent', 'default', {
            analytics_storage:       'denied',
            ad_storage:              'denied',
            functionality_storage:   'denied',
            personalization_storage: 'denied',
            wait_for_update: 500
          });
          window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        `,
      }}
    />
  );
}
```

---

## Step 3 — GTM Script Component

**`components/GTMScript.tsx`**

```tsx
import Script from "next/script";

export default function GTMScript() {
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
  if (!GTM_ID) return null;

  return (
    <>
      {/* GTM Script — loads after page is interactive */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`}
      />

      {/* GTM NoScript fallback — for users with JS disabled */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
```

---

## Step 4 — Consent Banner Component

**`components/CookieBanner.tsx`**

```tsx
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
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#1a1a1a",
        color: "#fff",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        zIndex: 9999,
        flexWrap: "wrap",
      }}
    >
      <p style={{ margin: 0, fontSize: "14px", maxWidth: "700px" }}>
        We use analytics cookies to understand how visitors find and use our
        site. No personal data is sold or shared with advertisers.
      </p>
      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={() => updateConsent(false)}
          style={{
            padding: "8px 20px",
            background: "transparent",
            border: "1px solid #666",
            color: "#ccc",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Reject
        </button>
        <button
          onClick={() => updateConsent(true)}
          style={{
            padding: "8px 20px",
            background: "#2563eb",
            border: "none",
            color: "#fff",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
```

---

## Step 5 — Consent Restore on Revisit

Users who already made a choice shouldn't see the banner again, but consent must be re-applied on every page load (GTM resets on refresh).

**`components/ConsentRestore.tsx`**

```tsx
"use client";

import { useEffect } from "react";

export default function ConsentRestore() {
  useEffect(() => {
    const choice = localStorage.getItem("cookie_consent");
    if (choice === "accepted") {
      window.gtag?.("consent", "update", {
        analytics_storage: "granted",
        ad_storage: "denied",
      });
    }
  }, []);

  return null;
}
```

---

## Step 6 — Wire Everything Into Your Layout

### App Router — `app/layout.tsx`

```tsx
import ConsentDefaults from "@/components/ConsentDefaults";
import ConsentRestore from "@/components/ConsentRestore";
import CookieBanner from "@/components/CookieBanner";
import GTMScript from "@/components/GTMScript";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* MUST be first — before GTM */}
        <ConsentDefaults />
      </head>
      <body>
        <GTMScript />
        <ConsentRestore />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
```

### Pages Router — `pages/_app.tsx`

```tsx
import type { AppProps } from "next/app";
import Head from "next/head";

import ConsentDefaults from "@/components/ConsentDefaults";
import ConsentRestore from "@/components/ConsentRestore";
import CookieBanner from "@/components/CookieBanner";
import GTMScript from "@/components/GTMScript";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <ConsentDefaults />
      </Head>
      <GTMScript />
      <ConsentRestore />
      <Component {...pageProps} />
      <CookieBanner />
    </>
  );
}
```

---

## Step 7 — Add gtag Type to Window

Prevents TypeScript errors when calling `window.gtag`.

**`types/gtag.d.ts`**

```ts
interface Window {
  gtag: (...args: unknown[]) => void;
}
```

---

## Step 8 — GTM Dashboard Setup

Inside your GTM workspace, do the following:

### 8a. Create GA4 Configuration Tag

```
Tag Type:      Google Tag
Tag ID:        G-XXXXXXXXXX  (your GA4 measurement ID)
Trigger:       Consent Initialization - All Pages
```

### 8b. Create GA4 Page View Tag

```
Tag Type:      Google Analytics: GA4 Event
Event Name:    page_view
Configuration: (point to your GA4 Config tag)
Trigger:       All Pages
```

### 8c. Enable Consent Overview

In GTM → Admin → Container Settings → enable **"Enable consent overview"**

This lets you see which tags respect consent and which don't.

---

## Step 9 — Add Cookie Policy Page

Required for UK (PECR) and India (DPDP). Create `app/cookie-policy/page.tsx`:

```tsx
export default function CookiePolicy() {
  return (
    <main>
      <h1>Cookie Policy</h1>
      <p>Last updated: {new Date().getFullYear()}</p>

      <h2>What cookies we use</h2>
      <p>
        We use Google Analytics (via Google Tag Manager) to understand how
        visitors find and use our website. This is only activated if you accept
        analytics cookies.
      </p>

      <h2>Essential cookies</h2>
      <p>
        We store your cookie preference (accepted/rejected) in your browser's
        local storage. This is necessary to remember your choice.
      </p>

      <h2>How to withdraw consent</h2>
      <p>
        Clear your browser's local storage or cookies at any time to reset your
        preference. The banner will reappear on your next visit.
      </p>
    </main>
  );
}
```

---

## File Structure Summary

```
your-project/
├── .env.local
├── app/
│   ├── layout.tsx              ← wire all components here
│   └── cookie-policy/
│       └── page.tsx
├── components/
│   ├── ConsentDefaults.tsx     ← fires before GTM
│   ├── GTMScript.tsx           ← loads GTM
│   ├── CookieBanner.tsx        ← accept / reject UI
│   └── ConsentRestore.tsx      ← re-applies consent on revisit
└── types/
    └── gtag.d.ts               ← window.gtag type
```

---

## Verification — DevTools Checklist

1. Open Chrome → DevTools → **Network tab**
2. Filter by: `collect` or `gtm`
3. Clear `localStorage` → hard refresh
4. **Before choosing:** confirm no `collect` requests fire
5. Click **Reject** → confirm still no `collect` requests
6. Clear `localStorage` → hard refresh again
7. Click **Accept** → confirm `collect` requests now appear to `google-analytics.com`

---

## Done

Your implementation is complete when:

- [ ] Banner shows on first visit
- [ ] Reject blocks all GA4 network requests
- [ ] Accept allows GA4 collect calls
- [ ] Returning visitors don't see the banner again
- [ ] GA4 Geography report populates within 24–48 hours
- [ ] Cookie Policy page is live and linked in your footer
