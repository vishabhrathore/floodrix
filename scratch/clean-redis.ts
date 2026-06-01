import { Redis, type RedisOptions } from "ioredis";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const BYPASS_REDIS = process.env.BYPASS_REDIS === "true" || false;

async function cleanRedis() {
  if (BYPASS_REDIS) {
    console.log("Redis is bypassed (BYPASS_REDIS = true). Nothing to clean.");
    return;
  }

  const host = process.env.REDIS_HOST || "localhost";
  const port = parseInt(process.env.REDIS_PORT || "6379", 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  const REDIS_URL = process.env.REDIS_URL;

  const databases = [
    { name: "cache", db: 0 },
    { name: "session", db: 1 },
    { name: "bullmq", db: 2 },
    { name: "rate-limit", db: 3 },
  ];

  console.log("🧹 Initializing Redis database cleaning...");

  for (const { name, db } of databases) {
    const options: RedisOptions = {
      host,
      port,
      password,
      db,
      lazyConnect: true,
    };

    const client = REDIS_URL ? new Redis(REDIS_URL, options) : new Redis(options);

    try {
      await client.connect();
      console.log(`🔌 Connected to DB ${db} (${name})`);
      const res = await client.flushdb();
      console.log(`✨ DB ${db} (${name}) flushed: ${res}`);
    } catch (err) {
      console.error(`❌ Failed to flush DB ${db} (${name}):`, err instanceof Error ? err.message : String(err));
    } finally {
      await client.quit();
    }
  }

  console.log("🎉 Redis cleaning completed!");
}

cleanRedis().catch((err) => {
  console.error("Fatal error during Redis cleaning:", err);
  process.exit(1);
});
