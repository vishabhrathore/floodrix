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
