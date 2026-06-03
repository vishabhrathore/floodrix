import { Redis, Cluster, type RedisOptions } from 'ioredis';
import { logger } from "@/server/engine/logger";

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
  const REDIS_USE_CLUSTER = process.env.REDIS_USE_CLUSTER === 'true';
  const REDIS_USE_SENTINEL = process.env.REDIS_USE_SENTINEL === 'true';
  const REDIS_SENTINELS = process.env.REDIS_SENTINELS; // JSON string of sentinels
  const REDIS_SENTINEL_MASTER = process.env.REDIS_SENTINEL_MASTER || 'mymaster';

  if (REDIS_USE_SENTINEL && REDIS_SENTINELS) {
    options.sentinels = JSON.parse(REDIS_SENTINELS);
    options.name = REDIS_SENTINEL_MASTER;
  }

  const finalClient = REDIS_USE_CLUSTER
    ? (new Cluster(JSON.parse(process.env.REDIS_CLUSTER_NODES || '[]'), {
        redisOptions: options,
      }) as any)
    : REDIS_URL && !REDIS_USE_SENTINEL
      ? new Redis(REDIS_URL, options)
      : new Redis(options);

  finalClient.on('connect', () => logger.info({ redisClient: name, db }, `[Redis] client connected`));
  finalClient.on('ready', () => logger.info({ redisClient: name, db }, `[Redis] client ready`));
  finalClient.on('error', (err: Error) => logger.error({ redisClient: name, db, err }, `[Redis] client error`));
  finalClient.on('close', () => logger.info({ redisClient: name, db }, `[Redis] client connection closed`));
  finalClient.on('reconnecting', () => logger.info({ redisClient: name, db }, `[Redis] client reconnecting`));

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
  const entries = Array.from(clients.entries());
  for (const [db, client] of entries) {
    if (!client) continue;
    const pong = await client.ping();
    if (pong === 'PONG') {
      logger.info({ db }, `✓ Redis client connected`);
    } else {
      throw new Error(`Redis DB ${db} ping failed`);
    }
  }
}

export async function closeAllRedisClients(): Promise<void> {
  const entries = Array.from(clients.entries());
  for (const [db, client] of entries) {
    if (client) {
      await client.quit();
      logger.info({ db }, `Redis client closed gracefully`);
    }
  }
}
