import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initWorkers } = await import("@/lib/init-workers");
    initWorkers();
  }
}
