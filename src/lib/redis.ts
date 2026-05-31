import { Redis, type RedisOptions } from 'ioredis';

export const BYPASS_REDIS = process.env.BYPASS_REDIS === 'true' || false;

// Connection pool to reuse clients per database index
const clients = new Map<number, Redis>();

/**
 * Shared Factory: Creates a robust Redis client with logging and retry strategies.
 */
function createRedisClient(name: string, db: number, customOptions: Partial<RedisOptions> = {}): Redis | undefined {
  if (BYPASS_REDIS) return undefined;
  
  if (clients.has(db)) {
    return clients.get(db);
  }

  const options: RedisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError: (err: Error) => {
      if (err.message.includes('READONLY')) return true;
      return false;
    },
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    enableReadyCheck: true,
    enableOfflineQueue: true,
    lazyConnect: false,
    ...customOptions, // Crucial: Allows overriding maxRetriesPerRequest for BullMQ
  };

  const REDIS_URL = process.env.REDIS_URL;
  const finalClient = REDIS_URL ? new Redis(REDIS_URL, options) : new Redis(options);

  // Using console so we don't break if utils/logger.js isn't available exactly as imported
  finalClient.on('connect', () => console.log(`[Redis] ${name} client connected (DB ${db})`));
  finalClient.on('ready', () => console.log(`[Redis] ${name} client ready (DB ${db})`));
  finalClient.on('error', (err: Error) => console.error(`[Redis] ${name} client error (DB ${db}):`, err));
  finalClient.on('close', () => console.log(`[Redis] ${name} client connection closed (DB ${db})`));
  finalClient.on('reconnecting', () => console.log(`[Redis] ${name} client reconnecting (DB ${db})...`));

  clients.set(db, finalClient);
  return finalClient;
}

// ============================================================
// CLIENT INSTANCES
// ============================================================

/** DB 0: Application cache, idempotency, locks */
export const redisCacheClient = createRedisClient('cache', 0);

/** DB 1: Sessions, refresh tokens, device tracking */
export const redisSessionClient = createRedisClient('session', 1);

/** DB 2: BullMQ queues and workers (Must have maxRetriesPerRequest: null) */
export const redisQueueClient = createRedisClient('bullmq', 2, {
  maxRetriesPerRequest: null, // REQUIRED FOR BULLMQ
});

/** DB 3: Rate limiting counters */
export const rateLimitRedisClient = createRedisClient('rate-limit', 3);

// ============================================================
// LIFECYCLE
// ============================================================

export async function testAllRedisClients(): Promise<void> {
  for (const [db, client] of clients.entries()) {
    if (!client) continue;
    const pong = await client.ping();
    if (pong === 'PONG') {
      console.log(`✓ Redis DB ${db} client connected`);
    } else {
      throw new Error(`Redis DB ${db} ping failed`);
    }
  }
}

export async function closeAllRedisClients(): Promise<void> {
  for (const [db, client] of clients.entries()) {
    if (client) {
      await client.quit();
      console.log(`Redis DB ${db} client closed gracefully`);
    }
  }
}
