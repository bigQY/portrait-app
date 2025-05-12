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
  private readonly defaultTTL: number = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
  // Set Cloudflare KV TTL to 12 hours
  private readonly cfTTL: number = 12 * 60 * 60; // 12 hours in seconds

  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    // The 'ttl' parameter is for memory cache.
    // The 'this.cfTTL' is for KV cache.

    // 设置内存缓存
    this.cache.set(key, {
      value,
      timestamp: Date.now() + ttl // Use the provided or default TTL for memory
    });

    // 设置 Cloudflare KV 缓存
    try {
      await global.__env__.CACHE_KV.put(key, JSON.stringify(value), { expirationTtl: this.cfTTL });
    } catch (error) {
      console.error('Failed to set Cloudflare KV cache:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // 首先检查内存缓存
    const item = this.cache.get(key);
    if (item && Date.now() <= item.timestamp) {
      return item.value as T;
    }

    // 如果内存缓存未命中，尝试从 Cloudflare KV 获取
    try {
      const kvValue = await global.__env__.CACHE_KV.get(key);
      if (kvValue) {
        const parsedValue = JSON.parse(kvValue) as T;
        // 将 KV 中的值重新设置到内存缓存中, 使用 defaultTTL (12 hours)
        this.cache.set(key, {
          value: parsedValue,
          timestamp: Date.now() + this.defaultTTL
        });
        return parsedValue;
      }
    } catch (error) {
      console.error('Failed to get from Cloudflare KV:', error);
    }

    return null;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    try {
      await global.__env__.CACHE_KV.delete(key);
    } catch (error) {
      console.error('Failed to delete from Cloudflare KV:', error);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    // 注意：Cloudflare KV 不支持批量删除，这里只清除内存缓存
  }
}

export const cache = Cache.getInstance();