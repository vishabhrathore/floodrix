import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initWorkers } = await import("@/lib/init-workers");
    initWorkers();
  }
}
// Trigger server container reload to enforce safe 100 million elements matrix limit
