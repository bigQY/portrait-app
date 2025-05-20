import { Redis } from "@upstash/redis/cloudflare";
enum KVDBType {
  upstashRedis = "upstashRedis",
  cloudflareKV = "cloudflareKV",
}
const usedKVDBType = KVDBType.upstashRedis;

interface CacheDbClient {
  set(key: string, value: any, ttl: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
}

class UpstashRedisClient implements CacheDbClient {
  private static instance: UpstashRedisClient;
  private client: Redis | null = null;

  private constructor() {
    console.log("UpstashRedisClient instance created");
  }

  private async initClient() {
    if (!this.client) {
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        throw new Error('Redis 环境变量未设置: UPSTASH_REDIS_REST_URL 或 UPSTASH_REDIS_REST_TOKEN');
      }
      this.client = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      console.log("Upstash Redis client initialized");
    }
    return this.client;
  }

  public static getInstance(): UpstashRedisClient {
    if (!UpstashRedisClient.instance) {
      UpstashRedisClient.instance = new UpstashRedisClient();
    }
    return UpstashRedisClient.instance;
  }

  async set(key: string, value: any, ttl: number = 2 * 60 * 60): Promise<void> {
    const client = await this.initClient();
    await client.set(key, JSON.stringify(value), { ex: ttl });
  }

  async get(key: string): Promise<any | null> {
    const client = await this.initClient();
    const value = await client.get(key);
    return value;
  }

  async delete(key: string): Promise<void> {
    const client = await this.initClient();
    await client.del(key);
  }
}

class CloudflareKVClient implements CacheDbClient {
  private static instance: CloudflareKVClient;

  private constructor() {}

  public static getInstance(): CloudflareKVClient {
    if (!CloudflareKVClient.instance) {
      CloudflareKVClient.instance = new CloudflareKVClient();
    }
    return CloudflareKVClient.instance;
  }

  async set(
    key: string,
    value: any,
    ttl: number = 2 * 60 * 60
  ): Promise<void> {
    await global.__env__.CACHE_KV.put(key, JSON.stringify(value), {
      expirationTtl: ttl,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await global.__env__.CACHE_KV.get(key);
    return value ? JSON.parse(value) : null;
  }

  async delete(key: string): Promise<void> {
    await global.__env__.CACHE_KV.delete(key);
  }
}

interface CacheItem<T> {
  value: T;
  timestamp: number;
}

declare global {
  var __env__: {
    CACHE_KV: KVNamespace;
  }
}

export class Cache {
  private static instance: Cache;
  private cache: Map<string, CacheItem<any>>;
  // Set default TTL to 12 hours for memory cache
  private readonly defaultTTL: number = 2 * 60 * 60 * 1000; // 12 hours in milliseconds
  // Set Cloudflare KV TTL to 12 hours
  private readonly DbTTL: number = 2 * 60 * 60; // 12 hours in seconds
  private readonly DbClient: CacheDbClient =
    usedKVDBType === KVDBType.upstashRedis
      ? UpstashRedisClient.getInstance()
      : CloudflareKVClient.getInstance();

  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }

  async set(
    key: string,
    value: any,
    ttl: number = this.defaultTTL,
    useDbCache = true
  ): Promise<void> {
    // The 'ttl' parameter is for memory cache.
    // The 'this.cfTTL' is for KV cache.

    // 设置内存缓存
    this.cache.set(key, {
      value,
      timestamp: Date.now() + ttl, // Use the provided or default TTL for memory
    });
    if (useDbCache) {
      // 设置 DbClient 缓存
      try {
        await this.DbClient.set(key, value, this.DbTTL);
      } catch (error) {
        console.error("Failed to set DbClient cache:", error);
      }
    }
  }

  async get<T>(key: string, useDbCache = true): Promise<T | null> {
    // 首先检查内存缓存
    const item = this.cache.get(key);
    if (item && Date.now() <= item.timestamp) {
      return item.value as T;
    }
    if (useDbCache) {
      // 如果内存缓存未命中，尝试从 DbClient 获取
      try {
        const kvValue = await this.DbClient.get(key);
        if (kvValue) {
          const parsedValue = kvValue as T;
          // 将 KV 中的值重新设置到内存缓存中, 使用 defaultTTL (12 hours)
          this.cache.set(key, {
            value: parsedValue,
            timestamp: Date.now() + this.defaultTTL,
          });
          return parsedValue;
        }
      } catch (error) {
        console.error("Failed to get from Cloudflare KV:", error);
      }
    }

    return null;
  }

  async delete(key: string, useDbCache = true): Promise<void> {
    this.cache.delete(key);
    if (useDbCache) {
      try {
        await this.DbClient.delete(key);
      } catch (error) {
        console.error("Failed to delete from Cloudflare KV:", error);
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    // 注意：DbClient 不支持批量删除，这里只清除内存缓存
  }
}

export const cache = Cache.getInstance();
