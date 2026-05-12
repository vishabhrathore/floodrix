export default function CookiePolicy() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-20 min-h-screen">
      <div className="space-y-12">
        <header className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-playfair">
            Cookie Policy
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">
            Last updated: May 2026
          </p>
        </header>

        <section className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
              Overview
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              We believe in being transparent about how we collect and use data. This policy provides information about how and when we use cookies for these purposes.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
              How we use cookies
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              We use Google Analytics (via Google Tag Manager) to understand how visitors find and use our website. This helps us improve the user experience and our content. These cookies are only activated if you explicitly grant permission via our consent banner.
            </p>
          </div>

          <div className="space-y-4 border-l-2 border-blue-500/20 pl-6 py-2 bg-blue-500/[0.02] rounded-r-xl">
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">
              Essential Storage
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              We store your cookie preference (accepted or rejected) in your browser's local storage. This is strictly necessary to remember your choice across different sessions and avoid showing the banner repeatedly.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
              Withdrawing Consent
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              You can withdraw or change your consent at any time. To do so, you can clear your browser's local storage or cookies. This will reset your preferences, and the consent banner will reappear on your next visit to our site.
            </p>
          </div>
        </section>

        <footer className="pt-12 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">
            If you have any questions about our use of cookies, please contact us.
          </p>
        </footer>
      </div>
    </main>
  );
}
