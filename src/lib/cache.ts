import { CACHE_TTL } from "@/config/constants";
import { redisCacheClient } from "./redis";

/**
 * Centralized Cache Manager
 * Uses redisCacheClient (DB 0) for app data and redisSessionClient (DB 1) for user sessions
 */
export class AppCache {
  // ============================================================
  // KEY DEFINITIONS
  // ============================================================
  public static keys = {
    // Session state
    sessionLoaded: (id: string) => `sess:${id}:loaded`,
    sessionStatus: (id: string) => `session:${id}:status`,
    sessionResult: (id: string) => `res:session:${id}`,
    sessionOrgMap: (id: string) => `map:session:${id}:orgId`,
    sessionExecutions: (id: string) => `sess:${id}:executions`,

    // Workflow related
    workflowLoaded: (id: string) => `wf:${id}:loaded-workflow`,
    workflowOrgMap: (id: string) => `map:workflow:${id}:orgId`,

    // Org level resources
    workspaceOrgMap: (id: string) => `map:workspace:${id}:orgId`,
    formulaOrgMap: (id: string) => `map:formula:${id}:orgId`,
    tableOrgMap: (id: string) => `map:table:${id}:orgId`,
    versionOrgMap: (id: string) => `map:version:${id}:orgId`,
    batchJobOrgMap: (id: string) => `map:batchjob:${id}:orgId`,

    // Organization entity
    org: (id: string) => `org:${id}`,

    // Specific objects
    workflowInfo: (id: string) => `wf:${id}`,
    workspaceInfo: (id: string) => `workspace:${id}`,
    formulaInfo: (id: string) => `formula:${id}`,
    tableInfo: (id: string) => `table:${id}`,
    versionInfo: (id: string) => `version:${id}`,
    batchJobInfo: (id: string) => `batchJob:${id}`,
    billingRecords: (id: string) => `billingRecords:${id}`,
    usageRecord: (id: string) => `usage:${id}`,

    // Registry items
    registryFormulas: (orgId: string) => `registry:formulas:${orgId}`,
    registryTables: (orgId: string) => `registry:tables:${orgId}`,

    // Idempotency
    idempotencyKey: (key: string) => `idemp:${key}`,
  };

  // ============================================================
  // CORE PRIMITIVES
  // ============================================================

  /**
   * Safely get and parse a JSON value from cache
   */
  public static async get<T>(key: string, client = redisCacheClient): Promise<T | null> {
    if (!client) return null;
    try {
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (e) {
      console.warn(`[AppCache] Failed to get ${key}`, e);
      return null;
    }
  }

  /**
   * Safely get a raw string value from cache
   */
  public static async getString(key: string, client = redisCacheClient): Promise<string | null> {
    if (!client) return null;
    try {
      return await client.get(key);
    } catch (e) {
      console.warn(`[AppCache] Failed to get ${key}`, e);
      return null;
    }
  }

  /**
   * Safely set a JSON value in cache with a TTL
   */
  public static async set<T>(key: string, value: T, ttlSeconds: number, client = redisCacheClient): Promise<void> {
    if (!client) return;
    try {
      await client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (e) {
      console.warn(`[AppCache] Failed to set ${key}`, e);
    }
  }

  /**
   * Safely set a raw string value in cache with a TTL
   */
  public static async setString(key: string, value: string, ttlSeconds: number, client = redisCacheClient): Promise<void> {
    if (!client) return;
    try {
      await client.setex(key, ttlSeconds, value);
    } catch (e) {
      console.warn(`[AppCache] Failed to set ${key}`, e);
    }
  }

  /**
   * Safely delete one or more keys
   */
  public static async del(keys: string | string[], client = redisCacheClient): Promise<void> {
    if (!client) return;
    const keysArray = Array.isArray(keys) ? keys : [keys];
    if (keysArray.length === 0) return;

    try {
      await client.del(...keysArray);
    } catch (e) {
      console.warn(`[AppCache] Failed to delete keys ${keysArray.join(', ')}`, e);
    }
  }

  // ============================================================
  // DOMAIN HELPERS
  // ============================================================

  // --- Sessions ---
  public static async getSessionState<T = any>(sessionId: string) {
    return this.get<T>(this.keys.sessionLoaded(sessionId));
  }

  public static async setSessionState(sessionId: string, state: any) {
    // Both loaded session state and result seem to track the same data historically
    await this.set(this.keys.sessionLoaded(sessionId), state, CACHE_TTL.LONG);
    await this.set(this.keys.sessionResult(sessionId), state, CACHE_TTL.LONG);
  }

  public static async getSessionStatus(sessionId: string) {
    return this.getString(this.keys.sessionStatus(sessionId));
  }

  public static async setSessionStatus(sessionId: string, status: string) {
    await this.setString(this.keys.sessionStatus(sessionId), status, CACHE_TTL.LONG);
  }

  public static async invalidateSession(sessionId: string) {
    await this.del([
      this.keys.sessionLoaded(sessionId),
      this.keys.sessionResult(sessionId),
      this.keys.sessionStatus(sessionId),
      this.keys.sessionExecutions(sessionId)
    ]);
  }

  public static async getSessionExecutions<T = any>(sessionId: string) {
    return this.get<T[]>(this.keys.sessionExecutions(sessionId));
  }

  public static async setSessionExecutions(sessionId: string, executions: any[]) {
    await this.set(this.keys.sessionExecutions(sessionId), executions, CACHE_TTL.LONG);
  }

  // --- Workflows ---
  public static async getWorkflow(workflowId: string) {
    return this.get<any>(this.keys.workflowLoaded(workflowId));
  }

  public static async setWorkflow(workflowId: string, workflow: any) {
    await this.set(this.keys.workflowLoaded(workflowId), workflow, CACHE_TTL.LONG);
  }

  public static async invalidateWorkflow(workflowId: string) {
    await this.del(this.keys.workflowLoaded(workflowId));
  }
}
